/* 極致貪食蛇 Ultra Snake - Vanilla JS */
(function(){
	'use strict';

	// ==== Utilities ====
	const $ = (sel) => document.querySelector(sel);
	const $$ = (sel) => Array.from(document.querySelectorAll(sel));
	const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
	const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
	const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];

	// ==== Game Config ====
	const GRID_SIZE = 32; // 32x32 grid on 640 canvas -> cell 20px
	const CANVAS_PX = 640;
	const CELL = CANVAS_PX / GRID_SIZE;

	const BASE_TICK_MS = 150; // base snake step interval
	const MIN_TICK_MS = 55;

	const SPEED_PER_SCORE = 1.0; // more score reduces interval

	const FOOD_TYPES = {
		NORMAL: 'normal',
		BOOST: 'boost', // short speed boost
		SLOW: 'slow',   // short slow down
		DOUBLE: 'double', // double score window
		GHOST: 'ghost', // snake body translucent; still collides
	};

	const POWERUP_DURATIONS = {
		boost: 6000,
		slow: 6000,
		double: 8000,
		ghost: 7000,
	};

	// ==== Audio (tiny click/bling via WebAudio) ====
	const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	let soundOn = true;
	function playTone(freq = 440, duration = 0.08, type = 'sine', volume = 0.1){
		if(!soundOn) return;
		const t0 = audioCtx.currentTime;
		const osc = audioCtx.createOscillator();
		const gain = audioCtx.createGain();
		osc.frequency.value = freq; osc.type = type;
		gain.gain.setValueAtTime(volume, t0);
		gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
		osc.connect(gain).connect(audioCtx.destination);
		osc.start(t0); osc.stop(t0 + duration);
	}

	// ==== Canvas ====
	const canvas = $('#game');
	const ctx = canvas.getContext('2d');
	canvas.width = CANVAS_PX; canvas.height = CANVAS_PX;

	// ==== State ====
	let snake = [];
	let dir = {x: 1, y: 0};
	let nextDir = {x: 1, y: 0};
	let food = null; // {x,y,type}
	let score = 0;
	let highScore = Number(localStorage.getItem('ultra_snake_high') || 0);
	let running = false;
	let paused = false;
	let tickMs = BASE_TICK_MS;
	let growSegments = 0;
	let lastFrame = 0;
	let acc = 0;
	let effects = { boost: 0, slow: 0, double: 0, ghost: 0 };
	let particles = [];

	// Leaderboard top 10
	function readBoard(){
		try { return JSON.parse(localStorage.getItem('ultra_snake_board')||'[]'); } catch { return []; }
	}
	function writeBoard(list){
		localStorage.setItem('ultra_snake_board', JSON.stringify(list.slice(0,10)));
	}
	function pushBoard(name, val){
		const list = readBoard();
		list.push({ name, score: val, t: Date.now() });
		list.sort((a,b)=> b.score - a.score || a.t - b.t);
		writeBoard(list);
	}

	// ==== UI refs ====
	const elScore = $('#score');
	const elHigh = $('#high-score');
	const elOverlay = $('#overlay');
	const elFinal = $('#final-score');
	const elTip = $('#tip');
	const elBoard = $('#board');
	const elBoardList = $('#board-list');

	$('#btn-restart').addEventListener('click', () => start());
	$('#btn-leaderboard').addEventListener('click', () => openBoard());
	$('#btn-close-board').addEventListener('click', () => closeBoard());
	$('#btn-clear-board').addEventListener('click', () => { localStorage.removeItem('ultra_snake_board'); renderBoard(); });
	$('#btn-sound').addEventListener('click', () => { soundOn = !soundOn; playTone(660, .06, 'square', .08); updateButtons(); });
	$('#btn-theme').addEventListener('click', () => { document.documentElement.classList.toggle('light'); });
	$('#btn-pause').addEventListener('click', () => { if(!running) return; paused = !paused; updateButtons(); playTone(paused?220:440,.06,'triangle',.06); });

	function updateButtons(){
		$('#btn-sound').textContent = soundOn ? '🔊' : '🔇';
		$('#btn-pause').textContent = paused ? '▶' : '❚❚';
	}

	// ==== Input ====
	const dirs = {
		ArrowUp: {x:0,y:-1}, ArrowDown:{x:0,y:1}, ArrowLeft:{x:-1,y:0}, ArrowRight:{x:1,y:0},
		KeyW:{x:0,y:-1}, KeyS:{x:0,y:1}, KeyA:{x:-1,y:0}, KeyD:{x:1,y:0}
	};
	document.addEventListener('keydown', (e)=>{
		const d = dirs[e.code];
		if(d){
			// block reverse
			if(d.x === -dir.x && d.y === -dir.y) return;
			nextDir = d;
			elTip.style.display = 'none';
		}
		if(e.code === 'Space'){ $('#btn-pause').click(); }
	});

	$$('.pad').forEach(btn=>{
		btn.addEventListener('touchstart', (e)=>{ e.preventDefault(); const v = btn.dataset.dir; onDir(v); }, {passive:false});
		btn.addEventListener('click', ()=>{ const v = btn.dataset.dir; onDir(v); });
	});
	function onDir(v){
		const m = {up:{x:0,y:-1}, down:{x:0,y:1}, left:{x:-1,y:0}, right:{x:1,y:0}}[v];
		if(!m) return; if(m.x === -dir.x && m.y === -dir.y) return; nextDir = m; elTip.style.display='none';
	}

	// ==== Particles for juicy feel ====
	function spawnParticle(x,y,color){
		for(let i=0;i<8;i++){
			particles.push({ x:x+0.5, y:y+0.5, vx:(Math.random()-0.5)*0.6, vy:(Math.random()-0.5)*0.6, life: 18, color });
		}
	}
	function updateParticles(){
		for(const p of particles){ p.x+=p.vx; p.y+=p.vy; p.life--; }
		particles = particles.filter(p=>p.life>0);
	}
	function drawParticles(){
		for(const p of particles){
			ctx.globalAlpha = p.life/18; ctx.fillStyle = p.color; ctx.fillRect(p.x*CELL-2, p.y*CELL-2, 4, 4); ctx.globalAlpha = 1;
		}
	}

	// ==== Game Core ====
	function start(){
		snake = [ {x:10, y:16}, {x:9, y:16}, {x:8, y:16} ];
		dir = {x:1,y:0}; nextDir = {x:1,y:0};
		score = 0; growSegments = 0; elScore.textContent = '0';
		elHigh.textContent = String(highScore);
		tickMs = BASE_TICK_MS; effects = { boost:0, slow:0, double:0, ghost:0 };
		spawnFood();
		particles.length = 0;
		running = true; paused = false; lastFrame = 0; acc = 0;
		elOverlay.classList.add('hidden');
		updateButtons();
		requestAnimationFrame(loop);
	}

	function spawnFood(){
		const cells = new Set(snake.map(n => n.x+','+n.y));
		let x,y; do { x = randInt(0, GRID_SIZE-1); y = randInt(0, GRID_SIZE-1); } while (cells.has(x+','+y));
		let type = FOOD_TYPES.NORMAL;
		const roll = Math.random();
		if(roll < 0.08) type = FOOD_TYPES.BOOST;
		else if(roll < 0.16) type = FOOD_TYPES.SLOW;
		else if(roll < 0.23) type = FOOD_TYPES.DOUBLE;
		else if(roll < 0.30) type = FOOD_TYPES.GHOST;
		food = {x,y,type};
	}

	function step(){
		if(!running || paused) return;
		dir = nextDir;
		const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
		// wall collision
		if(head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE){ return gameOver(); }
		// self collision
		if(snake.some((s,i)=> i>0 && s.x===head.x && s.y===head.y)){ return gameOver(); }
		snake.unshift(head);
		let ate = false;
		if(food && head.x === food.x && head.y === food.y){
			ate = true; onEat(food.type);
			spawnFood();
		}
		if(ate || growSegments>0){
			if(!ate) growSegments--; // extend by not removing tail
		}else{
			snake.pop();
		}
	}

	function onEat(type){
		const add = effects.double>0 ? 2 : 1;
		score += add; elScore.textContent = String(score);
		growSegments += 1;
		spawnParticle(food.x, food.y, colorForFood(type));
		playTone(520, .06, 'square', .06);
		// dynamic speed scaling by score
		const speedBoost = clamp(score * SPEED_PER_SCORE, 0, 70);
		tickMs = clamp(BASE_TICK_MS - speedBoost, MIN_TICK_MS, BASE_TICK_MS);
		// powerups
		if(type === FOOD_TYPES.BOOST) effects.boost = POWERUP_DURATIONS.boost;
		if(type === FOOD_TYPES.SLOW) effects.slow = POWERUP_DURATIONS.slow;
		if(type === FOOD_TYPES.DOUBLE) effects.double = POWERUP_DURATIONS.double;
		if(type === FOOD_TYPES.GHOST) effects.ghost = POWERUP_DURATIONS.ghost;
	}

	function colorForFood(type){
		return type===FOOD_TYPES.BOOST? '#00e5a8' : type===FOOD_TYPES.SLOW? '#6ae3ff' : type===FOOD_TYPES.DOUBLE? '#ffd166' : type===FOOD_TYPES.GHOST? '#b38dff' : '#9bff66';
	}

	function currentTick(){
		let ms = tickMs;
		if(effects.boost>0) ms *= 0.7;
		if(effects.slow>0) ms *= 1.6;
		return clamp(ms, 40, 400);
	}

	function loop(ts){
		if(!running) return;
		const dt = lastFrame? (ts - lastFrame) : 0; lastFrame = ts;
		if(!paused){
			acc += dt;
			const ms = currentTick();
			while(acc >= ms){ acc -= ms; step(); }
			effects.boost = Math.max(0, effects.boost - dt);
			effects.slow = Math.max(0, effects.slow - dt);
			effects.double = Math.max(0, effects.double - dt);
			effects.ghost = Math.max(0, effects.ghost - dt);
			updateParticles();
		}
		draw();
		requestAnimationFrame(loop);
	}

	function drawGrid(){
		ctx.clearRect(0,0,canvas.width, canvas.height);
		// subtle grid
		ctx.strokeStyle = 'rgba(255,255,255,0.05)';
		ctx.lineWidth = 1;
		for(let i=0;i<=GRID_SIZE;i++){
			ctx.beginPath(); ctx.moveTo(0, i*CELL); ctx.lineTo(CANVAS_PX, i*CELL); ctx.stroke();
			ctx.beginPath(); ctx.moveTo(i*CELL, 0); ctx.lineTo(i*CELL, CANVAS_PX); ctx.stroke();
		}
	}

	function drawSnake(){
		const ghost = effects.ghost>0;
		for(let i=snake.length-1;i>=0;i--){
			const n = snake[i];
			const t = i===0 ? 1 : Math.max(0.35, 1 - i*0.007);
			ctx.globalAlpha = ghost? 0.45 : t;
			const grad = ctx.createLinearGradient(n.x*CELL, n.y*CELL, n.x*CELL, n.y*CELL+CELL);
			grad.addColorStop(0, '#00e5a8'); grad.addColorStop(1, '#6ae3ff');
			ctx.fillStyle = grad;
			roundRect(n.x*CELL+2, n.y*CELL+2, CELL-4, CELL-4, 6);
			ctx.fill();
		}
		ctx.globalAlpha = 1;
	}

	function drawFood(){
		if(!food) return;
		ctx.fillStyle = colorForFood(food.type);
		const r = CELL*0.5;
		ctx.beginPath(); ctx.arc(food.x*CELL + CELL/2, food.y*CELL + CELL/2, r*0.36, 0, Math.PI*2); ctx.fill();
	}

	function drawEffectsBadges(){
		const badges = [];
		if(effects.boost>0) badges.push('Boost');
		if(effects.slow>0) badges.push('Slow');
		if(effects.double>0) badges.push('x2');
		if(effects.ghost>0) badges.push('Ghost');
		if(!badges.length) return;
		ctx.save();
		ctx.globalAlpha = 0.8;
		ctx.fillStyle = 'rgba(0,0,0,0.35)';
		ctx.fillRect(10, 10, 16 + badges.length*56, 32);
		ctx.fillStyle = '#cfe6ff';
		ctx.font = 'bold 16px Outfit, sans-serif';
		let x = 18;
		for(const b of badges){ ctx.fillText(b, x, 32); x += 56; }
		ctx.restore();
	}

	function draw(){
		drawGrid();
		drawFood();
		drawSnake();
		drawParticles();
		drawEffectsBadges();
	}

	function roundRect(x,y,w,h,r){
		r = Math.min(r, w/2, h/2);
		ctx.beginPath();
		ctx.moveTo(x+r, y);
		ctx.arcTo(x+w, y, x+w, y+h, r);
		ctx.arcTo(x+w, y+h, x, y+h, r);
		ctx.arcTo(x, y+h, x, y, r);
		ctx.arcTo(x, y, x+w, y, r);
		ctx.closePath();
	}

	function gameOver(){
		running = false;
		playTone(160, .2, 'sawtooth', .08);
		elOverlay.classList.remove('hidden');
		elFinal.textContent = String(score);
		if(score > highScore){ highScore = score; localStorage.setItem('ultra_snake_high', String(highScore)); }
		elHigh.textContent = String(highScore);
		const name = prompt('恭喜創造新分數！輸入你的名稱（可留空）', '') || 'Player';
		pushBoard(name.slice(0,20), score);
		renderBoard();
	}

	function openBoard(){ elBoard.classList.remove('hidden'); renderBoard(); }
	function closeBoard(){ elBoard.classList.add('hidden'); }
	function renderBoard(){
		const list = readBoard();
		elBoardList.innerHTML = '';
		if(!list.length){ elBoardList.innerHTML = '<li><span class="name">尚無紀錄</span><span>—</span></li>'; return; }
		list.slice(0,10).forEach((e,i)=>{
			const li = document.createElement('li');
			li.innerHTML = `<span class="name">${i+1}. ${escapeHtml(e.name)}</span><span>${e.score}</span>`;
			elBoardList.appendChild(li);
		});
	}
	function escapeHtml(s){ return s.replace(/[&<>"]+/g, (c)=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

	// Start game initially
	elHigh.textContent = String(highScore);
	start();

})();
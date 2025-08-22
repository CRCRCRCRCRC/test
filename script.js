// Ko-fi Donation Website for crcrcyt
document.addEventListener('DOMContentLoaded', function() {
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Add scroll reveal animation
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe all sections for animation
    document.querySelectorAll('section').forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(section);
    });

    // Add hover effects to donation cards
    document.querySelectorAll('.donation-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Add click tracking for donation buttons
    document.querySelectorAll('.donation-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            // Track donation button clicks
            trackEvent('donation_click', {
                button_type: this.className.includes('primary') ? 'coffee' : 
                           this.className.includes('secondary') ? 'pizza' : 
                           this.className.includes('accent') ? 'art' : 'custom',
                amount: this.textContent.match(/\$(\d+)/)?.[1] || 'custom'
            });
            
            // Add click animation
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    });

    // Add floating button scroll effect
    const floatingBtn = document.querySelector('.floating-btn');
    let lastScrollTop = 0;
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            // Scrolling down - hide button
            floatingBtn.style.transform = 'translateY(100px)';
            floatingBtn.style.opacity = '0';
        } else {
            // Scrolling up - show button
            floatingBtn.style.transform = 'translateY(0)';
            floatingBtn.style.opacity = '1';
        }
        
        lastScrollTop = scrollTop;
    });

    // Add typing effect to tagline
    const tagline = document.querySelector('.tagline');
    const originalText = tagline.textContent;
    tagline.textContent = '';
    
    let i = 0;
    const typeWriter = () => {
        if (i < originalText.length) {
            tagline.textContent += originalText.charAt(i);
            i++;
            setTimeout(typeWriter, 100);
        }
    };
    
    // Start typing effect after a delay
    setTimeout(typeWriter, 1000);

    // Add particle effect to header
    createParticles();

    // Add donation counter animation
    animateDonationCounter();

    // Add social link hover effects
    document.querySelectorAll('.social-link').forEach(link => {
        link.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-3px) rotate(2deg)';
        });
        
        link.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) rotate(0deg)';
        });
    });
});

// Create floating particles effect
function createParticles() {
    const header = document.querySelector('.header');
    const particleCount = 15;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.cssText = `
            position: absolute;
            width: 4px;
            height: 4px;
            background: rgba(255, 255, 255, 0.6);
            border-radius: 50%;
            pointer-events: none;
            animation: float 6s ease-in-out infinite;
            animation-delay: ${Math.random() * 6}s;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
        `;
        
        header.appendChild(particle);
    }
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.6; }
            50% { transform: translateY(-20px) rotate(180deg); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}

// Animate donation counter
function animateDonationCounter() {
    const counters = document.querySelectorAll('.donation-btn');
    
    counters.forEach(counter => {
        const text = counter.textContent;
        if (text.includes('$')) {
            const amount = text.match(/\$(\d+)/)?.[1];
            if (amount) {
                counter.addEventListener('mouseenter', function() {
                    this.style.transform = 'scale(1.05)';
                    this.style.boxShadow = '0 8px 25px rgba(0,0,0,0.2)';
                });
                
                counter.addEventListener('mouseleave', function() {
                    this.style.transform = 'scale(1)';
                    this.style.boxShadow = '';
                });
            }
        }
    });
}

// Track events for analytics
function trackEvent(eventName, properties = {}) {
    // You can integrate with Google Analytics, Mixpanel, or other analytics services here
    console.log('Event tracked:', eventName, properties);
    
    // Example: Google Analytics 4
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, properties);
    }
    
    // Example: Facebook Pixel
    if (typeof fbq !== 'undefined') {
        fbq('track', eventName, properties);
    }
}

// Add loading animation
window.addEventListener('load', function() {
    document.body.classList.add('loaded');
    
    // Add success message for donation clicks
    document.querySelectorAll('.donation-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            showSuccessMessage('感謝你的支持！正在跳轉到 Ko-fi...');
        });
    });
});

// Show success message
function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        font-weight: 500;
    `;
    
    document.body.appendChild(successDiv);
    
    // Animate in
    setTimeout(() => {
        successDiv.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        successDiv.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(successDiv);
        }, 300);
    }, 3000);
}

// Add CSS for loaded state
const loadedStyle = document.createElement('style');
loadedStyle.textContent = `
    body:not(.loaded) {
        opacity: 0;
        transition: opacity 0.5s ease;
    }
    
    body.loaded {
        opacity: 1;
    }
    
    .success-message {
        animation: slideIn 0.3s ease;
    }
    
    @keyframes slideIn {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
    }
`;
document.head.appendChild(loadedStyle);
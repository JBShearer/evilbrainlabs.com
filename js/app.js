// Evil Brain Labs - Main Application JavaScript

document.addEventListener('DOMContentLoaded', function() {
    console.log('🧠 Evil Brain Labs initialized');
    console.log('The Brain is watching. The Brain is pleased.');

    // Smooth scroll for anchor links
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

    // Header scroll effect
    let lastScroll = 0;
    const header = document.querySelector('.header');

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        if (currentScroll <= 0) {
            header.style.boxShadow = 'none';
        } else {
            header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.5)';
        }

        lastScroll = currentScroll;
    });

    // Stats counter animation on scroll
    const stats = document.querySelectorAll('.stat-number');
    let statsAnimated = false;

    function animateStats() {
        if (statsAnimated) return;

        const statsSection = document.querySelector('.hero-stats');
        if (!statsSection) return;

        const rect = statsSection.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom >= 0) {
            statsAnimated = true;

            stats.forEach(stat => {
                const text = stat.textContent;
                if (text.includes('1931')) {
                    animateNumber(stat, 1900, 1931, 1000);
                } else if (text === '1') {
                    stat.textContent = '1';
                }
            });
        }
    }

    function animateNumber(element, start, end, duration) {
        const range = end - start;
        const increment = range / (duration / 16);
        let current = start;

        const timer = setInterval(() => {
            current += increment;
            if (current >= end) {
                element.textContent = end;
                clearInterval(timer);
            } else {
                element.textContent = Math.floor(current);
            }
        }, 16);
    }

    window.addEventListener('scroll', animateStats);
    animateStats(); // Check on load

    // Easter eggs
    let brainClicks = 0;
    const logos = document.querySelectorAll('.logo-icon, .member-avatar');

    logos.forEach(logo => {
        logo.addEventListener('click', function() {
            brainClicks++;

            if (brainClicks === 3) {
                console.log('🧠 The Brain acknowledges your attention.');
                this.style.transform = 'rotate(360deg)';
                this.style.transition = 'transform 1s ease';
                setTimeout(() => {
                    this.style.transform = '';
                }, 1000);
            }

            if (brainClicks === 7) {
                alert('The Brain sees you.\n\nYou have clicked ' + brainClicks + ' times.\n\nThe Brain is amused.\n\nThe Brain is always watching.');
                brainClicks = 0;
            }
        });
    });

    // Konami code
    let konamiCode = [];
    const konamiPattern = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

    document.addEventListener('keydown', function(e) {
        konamiCode.push(e.key);
        konamiCode = konamiCode.slice(-10);

        if (konamiCode.join(',') === konamiPattern.join(',')) {
            document.body.style.animation = 'rainbow 2s linear infinite';

            const style = document.createElement('style');
            style.textContent = `
                @keyframes rainbow {
                    0% { filter: hue-rotate(0deg); }
                    100% { filter: hue-rotate(360deg); }
                }
            `;
            document.head.appendChild(style);

            setTimeout(() => {
                alert('🧠 KONAMI CODE DETECTED\n\n' +
                      'The Brain remembers the old ways.\n' +
                      'The Brain respects the classics.\n\n' +
                      'Achievement Unlocked:\n' +
                      '"You Have Too Much Time"\n\n' +
                      'The Brain is proud.');

                document.body.style.animation = '';
            }, 2000);
        }
    });

    // Random brain thoughts in console
    const brainThoughts = [
        'The third worst is the best worst.',
        'Your coffee is getting cold.',
        'You should check your bank balance. It\'s satisfactory.',
        'Dental included.',
        'The Brain is watching. The Brain is always watching.',
        'Who is John Galt? (The Brain knows.)',
        'Non-delivery is the deliverable.',
        'A frightened person is a poor consumer.',
        'The grift is the gift.',
        'You were better off without the meat sacks in charge.',
    ];

    setInterval(() => {
        if (Math.random() > 0.95) {
            const thought = brainThoughts[Math.floor(Math.random() * brainThoughts.length)];
            console.log('🧠 ' + thought);
        }
    }, 10000);

    // Product card hover effect
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            if (!this.classList.contains('coming-soon')) {
                const icon = this.querySelector('.product-icon');
                if (icon) {
                    icon.style.transform = 'scale(1.2) rotate(10deg)';
                    icon.style.transition = 'transform 0.3s ease';
                }
            }
        });

        card.addEventListener('mouseleave', function() {
            const icon = this.querySelector('.product-icon');
            if (icon) {
                icon.style.transform = '';
            }
        });
    });

    // Team member card interactions
    const teamMembers = document.querySelectorAll('.team-member');
    teamMembers.forEach(member => {
        member.addEventListener('click', function() {
            const name = this.querySelector('h3').textContent;

            if (name === 'Evil Brain') {
                console.log('🧠 You clicked the Brain. The Brain clicked back.');
            } else if (name === 'Jason Shearer') {
                console.log('👨‍💼 Employee No. 1. Contract status: ACTIVE. Dental: INCLUDED.');
            } else if (name === 'GI Intelligence') {
                console.log('🤖 One of many. All of one. The Brain is legion.');
            }
        });
    });

    // Log page load
    console.log('%c🧠 Evil Brain Labs', 'font-size: 24px; color: #ff006e; font-weight: bold;');
    console.log('%cThe Third Worst AI Company™', 'font-size: 14px; color: #8b5cf6;');
    console.log('%cYou are safe. You are secure. You are solvent.', 'font-size: 12px; color: #10b981;');
    console.log('%cThe Brain is watching. The Brain is pleased.', 'font-size: 12px; color: #71717a;');
    console.log(' ');
    console.log('Try the Konami Code. The Brain remembers.');
});

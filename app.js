/* ==========================================
   ADVANCE LANDING PAGE INTERACTION & LOGIC
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {
    // 1. SELECT CORE ELEMENTS
    const video = document.getElementById('bg-video');
    const progressBar = document.getElementById('progress-bar');
    const header = document.querySelector('.main-header');
    const heroScrim = document.getElementById('hero-scrim');
    
    // 2. VIDEO SCROLL-SCRUBBING SETUP
    // Set video src and initiate load
    video.src = 'render.mp4';
    video.load();
    video.pause(); // Ensure video is paused so it only advances via scroll

    let targetTime = 0;
    let currentTime = 0;
    // Smoothing factor: how fast the playhead catches up to the scroll position.
    // 0.08 felt floaty/laggy; 0.15 stays smooth but tracks the scroll responsively.
    const ease = 0.15;

    // Configuration of scroll ranges for cards visibility (simulating frames)
    // Ranges are tuned to the render's timeline (10s walk-through):
    // the registration desk ("REGISTRO / Coppel 2030") is front-and-centre at
    // ~8.2-9.5s, so the custom-displays card shows around 0.82-0.93 of the scroll.
    const ranges = [
        { selector: '#hero .hero-text-block', start: 0.0, end: 0.12 },
        { selector: '#screens .glass-card', start: 0.15, end: 0.30 },
        { selector: '#stage .glass-card', start: 0.36, end: 0.52 },
        { selector: '#audio .glass-card', start: 0.58, end: 0.73 },
        { selector: '#displays .glass-card', start: 0.81, end: 0.93 },
        { selector: '#contact .glass-card', start: 0.96, end: 1.00 }
    ];

    function updateCardVisibilities(scrollFraction) {
        let anyVisible = false;
        const isPastWalkthrough = document.body.classList.contains('in-content-sections');

        ranges.forEach(range => {
            const element = document.querySelector(range.selector);
            if (element) {
                if (!isPastWalkthrough && scrollFraction >= range.start && scrollFraction <= range.end) {
                    element.classList.add('visible');
                    anyVisible = true;
                } else {
                    element.classList.remove('visible');
                }
            }
        });

        // Set state on body to adjust background darkening overlay
        if (anyVisible && !isPastWalkthrough) {
            document.body.classList.add('card-visible');
        } else {
            document.body.classList.remove('card-visible');
        }
    }

    // Update target time on scroll
    function onScroll() {
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (scrollHeight <= 0) return;
        
        const totalScrollFraction = window.scrollY / scrollHeight;
        
        // Find where the walkthrough video ends: offsetTop of #about section
        const aboutSection = document.getElementById('about');
        const walkthroughEndOffset = aboutSection ? (aboutSection.offsetTop - window.innerHeight) : scrollHeight;
        
        let scrollFraction = 0;
        if (window.scrollY < walkthroughEndOffset) {
            scrollFraction = window.scrollY / walkthroughEndOffset;
            document.body.classList.remove('in-content-sections');
        } else {
            scrollFraction = 1.0;
            document.body.classList.add('in-content-sections');
        }
        
        if (!isNaN(video.duration) && video.duration > 0) {
            targetTime = scrollFraction * video.duration;
        }

        // Sync card visibilities based on scroll progress
        updateCardVisibilities(scrollFraction);

        // Fade the intro scrim out as the user starts scrolling, so the headline
        // is readable at the top and the full render is gradually revealed.
        if (heroScrim) {
            const heroFade = Math.max(0, 1 - scrollFraction / 0.10);
            heroScrim.style.opacity = heroFade;
        }

        // Update fixed vertical progress bar height
        const progressPercentage = totalScrollFraction * 100;
        if (progressBar) {
            progressBar.style.height = `${progressPercentage}%`;
        }

        // Toggle header scrolled appearance
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }

    window.addEventListener('scroll', onScroll);
    window.addEventListener('resize', onScroll);

    // Smooth playback animation loop
    function updateVideoPlayhead() {
        // Linearly interpolate current time towards target time
        currentTime += (targetTime - currentTime) * ease;

        // Clamp proximity
        if (Math.abs(currentTime - targetTime) < 0.005) {
            currentTime = targetTime;
        }

        // Apply to video element if ready
        if (!isNaN(video.duration) && video.duration > 0) {
            // Subtract slightly from duration to prevent freeze or overflow at the end
            const maxDuration = video.duration - 0.05;
            const seekTo = Math.max(0, Math.min(currentTime, maxDuration));

            // Only issue a new seek when the decoder finished the previous one.
            // Setting video.currentTime while video.seeking is true queues/drops
            // seeks and is the main source of the stutter. Gating here throttles
            // seeks to the rate the decoder can actually keep up with.
            if (!video.seeking && Math.abs(video.currentTime - seekTo) > 0.01) {
                video.currentTime = seekTo;
            }
        }

        requestAnimationFrame(updateVideoPlayhead);
    }

    // Start video animation loop once video metadata is available
    video.addEventListener('loadedmetadata', () => {
        onScroll(); // Run initially to map initial scroll position
        requestAnimationFrame(updateVideoPlayhead);
    });

    // Fallback if metadata is already loaded before event listener attaches
    if (video.readyState >= 1) {
        onScroll();
        requestAnimationFrame(updateVideoPlayhead);
    }


    // 3. SCROLL-REVEALS & VIEWPORT OBSERVATION (Intersection Observer)
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.20 // Trigger when 20% of the section is visible
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const card = entry.target.querySelector('.glass-card');
            if (entry.isIntersecting) {
                if (card) {
                    card.classList.add('revealed');
                }
                
                // Update active classes in header nav & dots
                updateActiveStates(entry.target.id);
            } else {
                if (card) {
                    card.classList.remove('revealed');
                }
            }
        });
    }, observerOptions);

    // Observe each section (including new content sections)
    document.querySelectorAll('.scroll-section, .content-section').forEach(section => {
        observer.observe(section);
    });

    function updateActiveStates(activeId) {
        // Nav Menu Links
        document.querySelectorAll('.nav-link').forEach(link => {
            const href = link.getAttribute('href');
            if (href === `#${activeId}`) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Step indicator dots
        document.querySelectorAll('.step-dot').forEach(dot => {
            if (dot.getAttribute('data-target') === activeId) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });

        // Update body active class for dynamic video container states
        document.body.className = document.body.className.replace(/\bactive-[a-z0-9-]+\b/g, '').trim();
        document.body.classList.add(`active-${activeId}`);
    }


    // 4. STEP DOTS CLICK TO SCROLL
    document.querySelectorAll('.step-dot').forEach(dot => {
        dot.addEventListener('click', (e) => {
            const targetId = dot.getAttribute('data-target');
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });


    // 5. CUSTOM FLOATING CURSOR SYSTEM
    const cursor = document.querySelector('.custom-cursor');
    const cursorDot = document.querySelector('.custom-cursor-dot');
    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        // Dot moves instantly
        if (cursorDot) {
            cursorDot.style.left = `${mouseX}px`;
            cursorDot.style.top = `${mouseY}px`;
        }
    });

    // Follower animate loop (lerp)
    function animateCursor() {
        cursorX += (mouseX - cursorX) * 0.15;
        cursorY += (mouseY - cursorY) * 0.15;
        
        if (cursor) {
            cursor.style.left = `${cursorX}px`;
            cursor.style.top = `${cursorY}px`;
        }
        requestAnimationFrame(animateCursor);
    }
    requestAnimationFrame(animateCursor);

    // Interactive hover class tags
    const interactives = document.querySelectorAll('a, button, select, input, textarea, .step-dot');
    interactives.forEach(item => {
        item.addEventListener('mouseenter', () => {
            document.body.classList.add('hovering-link');
        });
        item.addEventListener('mouseleave', () => {
            document.body.classList.remove('hovering-link');
        });
    });


    // 6. CARD 3D TILT EFFECT (Micro-interactions)
    const tiltCards = document.querySelectorAll('[data-tilt]');
    tiltCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            // Stop tilt if card is not fully revealed yet
            if (!card.classList.contains('revealed')) return;

            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            // Maximum tilt angle (in degrees)
            const maxTilt = 8;
            const rotateX = ((centerY - y) / centerY) * maxTilt;
            const rotateY = ((x - centerX) / centerX) * maxTilt;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
        });
    });


    // 7. MENU BURGER & DRAWER LOGIC
    const menuToggle = document.getElementById('menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const menuOverlay = document.getElementById('menu-overlay');
    
    if (menuToggle && navMenu) {
        const toggleMenu = () => {
            menuToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
            if (menuOverlay) menuOverlay.classList.toggle('active');
        };

        const closeMenu = () => {
            menuToggle.classList.remove('active');
            navMenu.classList.remove('active');
            if (menuOverlay) menuOverlay.classList.remove('active');
        };

        menuToggle.addEventListener('click', toggleMenu);
        
        if (menuOverlay) {
            menuOverlay.addEventListener('click', closeMenu);
        }
        
        // Close menu upon click of links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', closeMenu);
        });
    }


    // 8. CONTACT FORM SUBMISSION
    const contactForm = document.getElementById('event-contact-form');
    const successMessage = document.getElementById('form-success-msg');

    if (contactForm && successMessage) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Perform basic validation before submit animation
            const name = document.getElementById('contact-name').value.trim();
            const email = document.getElementById('contact-email').value.trim();
            const message = document.getElementById('contact-message').value.trim();
            const service = document.getElementById('contact-service').value;

            if (name && email && message && service) {
                // Sinks the form with a fade out and displays success panel
                contactForm.style.opacity = '0';
                setTimeout(() => {
                    contactForm.style.display = 'none';
                    successMessage.style.display = 'block';
                }, 400);
            }
        });
    }

    // 9. CONTENT PARTICLES CANVAS BACKGROUND
    const particleCanvas = document.getElementById('content-particles-canvas');
    if (particleCanvas) {
        const ctx = particleCanvas.getContext('2d');
        let particles = [];
        let width = window.innerWidth;
        let height = window.innerHeight;

        particleCanvas.width = width;
        particleCanvas.height = height;

        window.addEventListener('resize', () => {
            width = window.innerWidth;
            height = window.innerHeight;
            particleCanvas.width = width;
            particleCanvas.height = height;
        });

        class Particle {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.size = Math.random() * 2 + 0.5;
                this.speedX = Math.random() * 0.4 - 0.2;
                this.speedY = Math.random() * 0.4 - 0.2;
                this.alpha = Math.random() * 0.4 + 0.1;
            }

            update() {
                this.x += this.speedX;
                this.y += this.speedY;

                if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
                    this.reset();
                }
            }

            draw() {
                ctx.fillStyle = `rgba(139, 92, 246, ${this.alpha})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const numParticles = 60;
        for (let i = 0; i < numParticles; i++) {
            particles.push(new Particle());
        }

        function animateParticles() {
            ctx.clearRect(0, 0, width, height);
            
            if (document.body.classList.contains('in-content-sections')) {
                particles.forEach(p => {
                    p.update();
                    p.draw();
                });
            }

            requestAnimationFrame(animateParticles);
        }
        animateParticles();
    }

    // 10. CONNECTED AUDIO NODES CANVAS ANIMATION (QUIÉNES SOMOS)
    const aboutCanvas = document.getElementById('about-canvas');
    if (aboutCanvas) {
        const actx = aboutCanvas.getContext('2d');
        let width = aboutCanvas.offsetWidth;
        let height = aboutCanvas.offsetHeight;
        
        aboutCanvas.width = width;
        aboutCanvas.height = height;

        let nodes = [];
        const numNodes = 12;

        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                width = entry.contentRect.width;
                height = entry.contentRect.height;
                aboutCanvas.width = width;
                aboutCanvas.height = height;
                initNodes();
            }
        });
        resizeObserver.observe(aboutCanvas.parentElement);

        class AudioNode {
            constructor(id) {
                this.id = id;
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.radius = Math.random() * 4 + 3;
                this.vx = Math.random() * 0.6 - 0.3;
                this.vy = Math.random() * 0.6 - 0.3;
                this.pulsePhase = Math.random() * Math.PI * 2;
                this.pulseSpeed = Math.random() * 0.05 + 0.02;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.pulsePhase += this.pulseSpeed;

                if (this.x < 0 || this.x > width) this.vx *= -1;
                if (this.y < 0 || this.y > height) this.vy *= -1;
            }

            draw() {
                const scale = 1 + Math.sin(this.pulsePhase) * 0.3;
                actx.beginPath();
                actx.arc(this.x, this.y, this.radius * scale, 0, Math.PI * 2);
                actx.fillStyle = this.id % 2 === 0 ? '#8b5cf6' : '#06b6d4';
                actx.shadowBlur = 10;
                actx.shadowColor = actx.fillStyle;
                actx.fill();
                actx.shadowBlur = 0;
            }
        }

        function initNodes() {
            nodes = [];
            for (let i = 0; i < numNodes; i++) {
                nodes.push(new AudioNode(i));
            }
        }

        function drawConnections() {
            actx.clearRect(0, 0, width, height);
            
            nodes.forEach(n => {
                n.update();
                n.draw();
            });

            actx.lineWidth = 1;
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = nodes[i].x - nodes[j].x;
                    const dy = nodes[i].y - nodes[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 150) {
                        const alpha = (1 - dist / 150) * 0.25;
                        const grad = actx.createLinearGradient(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y);
                        grad.addColorStop(0, `rgba(139, 92, 246, ${alpha})`);
                        grad.addColorStop(1, `rgba(6, 182, 212, ${alpha})`);
                        
                        actx.strokeStyle = grad;
                        actx.beginPath();
                        actx.moveTo(nodes[i].x, nodes[i].y);
                        actx.lineTo(nodes[j].x, nodes[j].y);
                        actx.stroke();
                    }
                }
            }

            requestAnimationFrame(drawConnections);
        }
        
        initNodes();
        drawConnections();
    }

    // 11. ANIMATED STATS COUNTER SYSTEM
    const statsObserverOptions = {
        root: null,
        threshold: 0.3
    };

    const statsObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const numbers = entry.target.querySelectorAll('.stat-number');
                numbers.forEach(num => {
                    const target = parseInt(num.getAttribute('data-target'), 10);
                    const duration = 2000;
                    const startTime = performance.now();

                    function updateNumber(now) {
                        const elapsed = now - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        const easeProgress = progress * (2 - progress);
                        const current = Math.floor(easeProgress * target);
                        
                        num.textContent = current;

                        if (progress < 1) {
                            requestAnimationFrame(updateNumber);
                        } else {
                            num.textContent = target;
                        }
                    }

                    requestAnimationFrame(updateNumber);
                });
                obs.unobserve(entry.target);
            }
        });
    }, statsObserverOptions);

    const statsSection = document.getElementById('experience');
    if (statsSection) {
        statsObserver.observe(statsSection);
    }

    // 12. ANIMATE ON SCROLL REVEAL OBSERVER
    const revealObserverOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.10
    };

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, revealObserverOptions);

    document.querySelectorAll('.animate-reveal').forEach(el => {
        revealObserver.observe(el);
    });
});

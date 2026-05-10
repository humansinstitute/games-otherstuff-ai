const PORTAL_THEMES = {
    entrance: {
        swirl: { r: 139, g: 92, b: 246 },
        frameStroke: '#8b5cf6',
        frameFill: '#1e1b4b',
        gradient: { r: 139, g: 92, b: 246 }
    },
    exit: {
        swirl: { r: 34, g: 197, b: 94 },
        frameStroke: '#16a34a',
        frameFill: '#022c22',
        gradient: { r: 34, g: 197, b: 94 }
    }
};

// Portal/particle system with configurable colors
export default class ParticleSystem {
    constructor(x, y, options = {}) {
        this.x = x;
        this.y = y;
        this.width = options.width || 40;
        this.height = options.height || 50;
        this.animationFrame = 0;
        const themeKey = options.theme || 'entrance';
        this.portalColors = PORTAL_THEMES[themeKey] || PORTAL_THEMES.entrance;

        // Particle system for portal effect
        this.particles = [];
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                angle: Math.random() * Math.PI * 2,
                distance: Math.random() * 15 + 5,
                speed: Math.random() * 0.02 + 0.01,
                size: Math.random() * 2 + 1,
                offset: Math.random() * Math.PI * 2
            });
        }

        // Dig particles array
        this.digParticles = [];

        // Build particles array
        this.buildParticles = [];

        // Explosion particles array
        this.explosionParticles = [];

        // Exit particles array
        this.exitParticles = [];

        // Bash particles array
        this.bashParticles = [];
    }

    spawnDigParticles(x, y, count) {
        // Spawn particles that fly outward and upward, then fall
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI - Math.PI; // -180 to 0 degrees (upward spread)
            const speed = Math.random() * 2 + 1; // Random speed 1-3

            this.digParticles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 1.5 + 1.5, // 1.5-3px
                life: 30, // frames
                maxLife: 30,
                // Brown/tan color variations
                color: {
                    r: 139 + Math.random() * 40 - 20,
                    g: 69 + Math.random() * 30 - 15,
                    b: 19 + Math.random() * 20 - 10
                }
            });
        }
    }

    spawnBuildParticles(x, y) {
        // Spawn small puff effects (3-4 white/gray particles)
        const count = Math.floor(Math.random() * 2) + 3; // 3-4 particles
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2; // All directions
            const speed = Math.random() * 1 + 0.5; // Random speed 0.5-1.5

            this.buildParticles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1, // Slight upward bias
                size: Math.random() * 2 + 1, // 1-3px
                life: 20, // frames
                maxLife: 20,
                // White/gray color variations
                color: {
                    r: 200 + Math.random() * 55,
                    g: 200 + Math.random() * 55,
                    b: 200 + Math.random() * 55
                }
            });
        }
    }

    spawnExplosionParticles(x, y) {
        // Spawn explosion particles (20-30 orange/red/yellow particles)
        const count = Math.floor(Math.random() * 11) + 20; // 20-30 particles
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2; // All directions
            const speed = Math.random() * 4 + 2; // Random speed 2-6 (faster than other particles)

            // Random color selection: orange, red, or yellow
            const colorType = Math.random();
            let color;
            if (colorType < 0.33) {
                // Orange
                color = {
                    r: 255,
                    g: 140 + Math.random() * 40,
                    b: Math.random() * 50
                };
            } else if (colorType < 0.66) {
                // Red
                color = {
                    r: 255,
                    g: Math.random() * 80,
                    b: Math.random() * 50
                };
            } else {
                // Yellow
                color = {
                    r: 255,
                    g: 200 + Math.random() * 55,
                    b: Math.random() * 80
                };
            }

            this.explosionParticles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 3 + 2, // 2-5px (larger than other particles)
                life: 40, // frames (longer than other particles)
                maxLife: 40,
                color: color
            });
        }
    }

    spawnExitParticles(x, y) {
        // Spawn celebratory green sparkles when a lemming is saved
        const count = Math.floor(Math.random() * 5) + 10; // 10-14 particles
        for (let i = 0; i < count; i++) {
            const angle = (Math.random() * Math.PI) - Math.PI / 2; // Mostly upward spread
            const speed = Math.random() * 1.5 + 0.8;

            this.exitParticles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed * 0.6,
                vy: Math.sin(angle) * speed - 0.5,
                size: Math.random() * 2 + 1,
                life: 30,
                maxLife: 30,
                color: {
                    r: 34 + Math.random() * 20,
                    g: 197 + Math.random() * 40,
                    b: 94 + Math.random() * 20
                }
            });
        }
    }

    spawnBashParticles(x, y) {
        // Spawn particles that fly horizontally when terrain is destroyed (3-5 brown particles)
        const count = Math.floor(Math.random() * 3) + 3; // 3-5 particles
        for (let i = 0; i < count; i++) {
            // Spread particles mostly horizontally (between -30 and 30 degrees)
            const angle = (Math.random() * Math.PI / 3) - Math.PI / 6;
            const speed = Math.random() * 2.5 + 1.5; // Random speed 1.5-4

            this.bashParticles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 1.5 + 1.5, // 1.5-3px
                life: 25, // frames
                maxLife: 25,
                // Brown/tan color variations
                color: {
                    r: 139 + Math.random() * 40 - 20,
                    g: 69 + Math.random() * 30 - 15,
                    b: 19 + Math.random() * 20 - 10
                }
            });
        }
    }

    update(dt) {
        this.animationFrame++;

        // Update dig particles
        for (let i = this.digParticles.length - 1; i >= 0; i--) {
            const particle = this.digParticles[i];

            // Apply gravity
            particle.vy += 0.15;

            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;

            // Decrease life
            particle.life--;

            // Remove dead particles
            if (particle.life <= 0) {
                this.digParticles.splice(i, 1);
            }
        }

        // Update build particles
        for (let i = this.buildParticles.length - 1; i >= 0; i--) {
            const particle = this.buildParticles[i];

            // Apply slight gravity
            particle.vy += 0.05;

            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;

            // Slow down horizontal movement (friction)
            particle.vx *= 0.95;

            // Decrease life
            particle.life--;

            // Remove dead particles
            if (particle.life <= 0) {
                this.buildParticles.splice(i, 1);
            }
        }

        // Update explosion particles
        for (let i = this.explosionParticles.length - 1; i >= 0; i--) {
            const particle = this.explosionParticles[i];

            // Apply gravity
            particle.vy += 0.2;

            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;

            // Slow down (air resistance)
            particle.vx *= 0.98;
            particle.vy *= 0.98;

            // Decrease life
            particle.life--;

            // Remove dead particles
            if (particle.life <= 0) {
                this.explosionParticles.splice(i, 1);
            }
        }

        // Update exit particles
        for (let i = this.exitParticles.length - 1; i >= 0; i--) {
            const particle = this.exitParticles[i];

            // Gentle float upward with slight drift
            particle.vy -= 0.02;
            particle.x += particle.vx;
            particle.y += particle.vy;

            // Fade and shrink over time
            particle.size *= 0.98;
            if (particle.size < 0.5) particle.size = 0.5;

            particle.life--;
            if (particle.life <= 0) {
                this.exitParticles.splice(i, 1);
            }
        }

        // Update bash particles
        for (let i = this.bashParticles.length - 1; i >= 0; i--) {
            const particle = this.bashParticles[i];

            // Apply gravity
            particle.vy += 0.15;

            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;

            // Slow down horizontal movement (friction)
            particle.vx *= 0.96;

            // Decrease life
            particle.life--;

            // Remove dead particles
            if (particle.life <= 0) {
                this.bashParticles.splice(i, 1);
            }
        }
    }

    render(ctx) {
        ctx.save();

        // Draw portal particles (swirling effect)
        const swirlColor = this.portalColors.swirl;
        this.particles.forEach(particle => {
            const angle = particle.angle + this.animationFrame * particle.speed;
            const x = this.x + Math.cos(angle) * particle.distance;
            const y = this.y + Math.sin(angle) * particle.distance * 0.5;

            const alpha = 0.3 + Math.sin(this.animationFrame * 0.05 + particle.offset) * 0.3;
            ctx.fillStyle = `rgba(${swirlColor.r}, ${swirlColor.g}, ${swirlColor.b}, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw doorway structure
        ctx.strokeStyle = this.portalColors.frameStroke;
        ctx.lineWidth = 3;
        ctx.fillStyle = this.portalColors.frameFill;

        // Door frame
        ctx.fillRect(
            this.x - this.width / 2,
            this.y - this.height,
            this.width,
            this.height
        );
        ctx.strokeRect(
            this.x - this.width / 2,
            this.y - this.height,
            this.width,
            this.height
        );

        // Door arch (top decoration)
        ctx.beginPath();
        ctx.arc(
            this.x,
            this.y - this.height,
            this.width / 2,
            Math.PI,
            0
        );
        ctx.stroke();

        // Glowing center portal
        const gradientColors = this.portalColors.gradient;
        const gradient = ctx.createRadialGradient(
            this.x, this.y - this.height / 2, 0,
            this.x, this.y - this.height / 2, 15
        );
        gradient.addColorStop(0, `rgba(${gradientColors.r}, ${gradientColors.g}, ${gradientColors.b}, 0.6)`);
        gradient.addColorStop(1, `rgba(${gradientColors.r}, ${gradientColors.g}, ${gradientColors.b}, 0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(
            this.x - 15,
            this.y - this.height,
            30,
            this.height
        );

        ctx.restore();

        // Draw dig particles
        this.digParticles.forEach(particle => {
            const alpha = particle.life / particle.maxLife; // Fade out over time
            ctx.fillStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${alpha})`;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw build particles
        this.buildParticles.forEach(particle => {
            const alpha = particle.life / particle.maxLife; // Fade out over time
            ctx.fillStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${alpha})`;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw explosion particles
        this.explosionParticles.forEach(particle => {
            const alpha = particle.life / particle.maxLife; // Fade out over time
            ctx.fillStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${alpha})`;

            // Add glow effect for explosion particles
            ctx.shadowBlur = 10;
            ctx.shadowColor = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${alpha})`;

            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();

            // Reset shadow
            ctx.shadowBlur = 0;
        });

        // Draw exit particles
        this.exitParticles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            ctx.shadowBlur = 15 * alpha;
            ctx.shadowColor = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${alpha})`;
            ctx.fillStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${alpha})`;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        // Draw bash particles
        this.bashParticles.forEach(particle => {
            const alpha = particle.life / particle.maxLife; // Fade out over time
            ctx.fillStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${alpha})`;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}

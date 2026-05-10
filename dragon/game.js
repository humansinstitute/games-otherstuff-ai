// Dragon Brawl - Beat 'Em Up Game Engine
// A Double Dragon style scrolling beat-em-up

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreEl = document.getElementById('finalScore');

// Game Constants
const GAME_WIDTH = canvas.width;
const GAME_HEIGHT = canvas.height;
const GROUND_Y = GAME_HEIGHT - 80;
const PLAY_AREA_TOP = GAME_HEIGHT - 180;
const SCROLL_THRESHOLD = 500;
const LEVEL_WIDTH = 3200;

// Game State
const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    GAME_OVER: 'gameOver',
    VICTORY: 'victory'
};

let gameState = GameState.MENU;
let score = 0;
let worldOffset = 0;
let currentWave = 0;
let enemiesRemaining = 0;
let waveSpawned = false;

// Input Handler
const keys = {};
const keysPressed = {};

document.addEventListener('keydown', (e) => {
    if (!keys[e.code]) {
        keysPressed[e.code] = true;
    }
    keys[e.code] = true;

    if (e.code === 'Enter') {
        if (gameState === GameState.MENU) {
            startGame();
        } else if (gameState === GameState.GAME_OVER || gameState === GameState.VICTORY) {
            resetGame();
        }
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

function isKeyPressed(code) {
    const pressed = keysPressed[code];
    keysPressed[code] = false;
    return pressed;
}

// Utility Functions
function lerp(a, b, t) {
    return a + (b - a) * t;
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

// Animation System
class Animation {
    constructor(frames, frameDuration, loop = true) {
        this.frames = frames;
        this.frameDuration = frameDuration;
        this.loop = loop;
        this.currentFrame = 0;
        this.elapsed = 0;
        this.finished = false;
    }

    update(dt) {
        this.elapsed += dt;
        if (this.elapsed >= this.frameDuration) {
            this.elapsed = 0;
            this.currentFrame++;
            if (this.currentFrame >= this.frames.length) {
                if (this.loop) {
                    this.currentFrame = 0;
                } else {
                    this.currentFrame = this.frames.length - 1;
                    this.finished = true;
                }
            }
        }
    }

    reset() {
        this.currentFrame = 0;
        this.elapsed = 0;
        this.finished = false;
    }

    getFrame() {
        return this.frames[this.currentFrame];
    }
}

// Fighter Base Class
class Fighter {
    constructor(x, y, config) {
        this.x = x;
        this.y = y;
        this.worldX = x;
        this.vx = 0;
        this.vy = 0;
        this.width = config.width || 50;
        this.height = config.height || 80;
        this.color = config.color || '#fff';
        this.maxHealth = config.maxHealth || 100;
        this.health = this.maxHealth;
        this.speed = config.speed || 200;
        this.jumpPower = config.jumpPower || -400;
        this.attackPower = config.attackPower || 10;
        this.facing = 1; // 1 = right, -1 = left
        this.isGrounded = true;
        this.isAttacking = false;
        this.isHurt = false;
        this.isDead = false;
        this.attackCooldown = 0;
        this.hurtTimer = 0;
        this.invulnerable = 0;
        this.attackType = null;
        this.attackHitbox = null;
        this.hasHit = false;

        // Animation states
        this.state = 'idle';
        this.animationTimer = 0;
        this.frameIndex = 0;
    }

    update(dt) {
        // Gravity
        if (!this.isGrounded) {
            this.vy += 1200 * dt;
        }

        // Apply velocity
        this.worldX += this.vx * dt;
        this.y += this.vy * dt;

        // Ground collision
        if (this.y >= GROUND_Y) {
            this.y = GROUND_Y;
            this.vy = 0;
            this.isGrounded = true;
        }

        // Y bounds (play area depth)
        this.y = clamp(this.y, PLAY_AREA_TOP, GROUND_Y);

        // Timers
        if (this.attackCooldown > 0) {
            this.attackCooldown -= dt;
        }
        if (this.hurtTimer > 0) {
            this.hurtTimer -= dt;
            if (this.hurtTimer <= 0) {
                this.isHurt = false;
            }
        }
        if (this.invulnerable > 0) {
            this.invulnerable -= dt;
        }

        // Animation timer
        this.animationTimer += dt;
        if (this.animationTimer >= 0.1) {
            this.animationTimer = 0;
            this.frameIndex++;
        }

        // Update state
        this.updateState();
    }

    updateState() {
        if (this.isDead) {
            this.state = 'dead';
        } else if (this.isHurt) {
            this.state = 'hurt';
        } else if (this.isAttacking) {
            this.state = 'attack';
        } else if (!this.isGrounded) {
            this.state = 'jump';
        } else if (Math.abs(this.vx) > 10) {
            this.state = 'walk';
        } else {
            this.state = 'idle';
        }
    }

    punch() {
        if (this.attackCooldown <= 0 && !this.isAttacking && this.isGrounded) {
            this.isAttacking = true;
            this.attackType = 'punch';
            this.attackCooldown = 0.4;
            this.hasHit = false;
            this.createAttackHitbox(40, 30, 15);
            setTimeout(() => {
                this.isAttacking = false;
                this.attackHitbox = null;
            }, 200);
        }
    }

    kick() {
        if (this.attackCooldown <= 0 && !this.isAttacking && this.isGrounded) {
            this.isAttacking = true;
            this.attackType = 'kick';
            this.attackCooldown = 0.5;
            this.hasHit = false;
            this.createAttackHitbox(55, 25, 20);
            setTimeout(() => {
                this.isAttacking = false;
                this.attackHitbox = null;
            }, 250);
        }
    }

    jumpAttack() {
        if (!this.isGrounded && this.attackCooldown <= 0 && !this.isAttacking) {
            this.isAttacking = true;
            this.attackType = 'jumpkick';
            this.attackCooldown = 0.3;
            this.hasHit = false;
            this.createAttackHitbox(50, 40, 25);
            setTimeout(() => {
                this.isAttacking = false;
                this.attackHitbox = null;
            }, 300);
        }
    }

    createAttackHitbox(width, height, damage) {
        const offsetX = this.facing === 1 ? this.width / 2 : -width - this.width / 2;
        this.attackHitbox = {
            x: this.worldX + offsetX,
            y: this.y - this.height / 2,
            width: width,
            height: height,
            damage: damage
        };
    }

    takeDamage(amount, knockbackDir = 0) {
        if (this.invulnerable > 0 || this.isDead) return;

        this.health -= amount;
        this.isHurt = true;
        this.hurtTimer = 0.3;
        this.invulnerable = 0.5;
        this.vx = knockbackDir * 200;

        if (this.health <= 0) {
            this.health = 0;
            this.die();
        }
    }

    die() {
        this.isDead = true;
        this.isAttacking = false;
    }

    getScreenX() {
        return this.worldX - worldOffset;
    }

    draw(ctx) {
        const screenX = this.getScreenX();

        // Flash when hurt
        if (this.invulnerable > 0 && Math.floor(this.invulnerable * 20) % 2 === 0) {
            return;
        }

        ctx.save();
        ctx.translate(screenX, this.y);
        ctx.scale(this.facing, 1);

        this.drawCharacter(ctx);

        ctx.restore();

        // Debug: draw attack hitbox
        // if (this.attackHitbox) {
        //     ctx.strokeStyle = 'red';
        //     ctx.strokeRect(
        //         this.attackHitbox.x - worldOffset,
        //         this.attackHitbox.y,
        //         this.attackHitbox.width,
        //         this.attackHitbox.height
        //     );
        // }
    }

    drawCharacter(ctx) {
        // Base character drawing - override in subclasses
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height, this.width, this.height);
    }
}

// Player Class
class Player extends Fighter {
    constructor(x, y) {
        super(x, y, {
            width: 40,
            height: 70,
            color: '#4ecdc4',
            maxHealth: 100,
            speed: 220,
            jumpPower: -420,
            attackPower: 15
        });
        this.lives = 3;
        this.combo = 0;
        this.comboTimer = 0;
        // Weapon system
        this.weapon = null;
        this.weaponUses = 0;
        this.isUsingWeapon = false;
        this.weaponCooldown = 0;
    }

    pickupWeapon(weaponType) {
        this.weapon = weaponType;
        const weaponData = WeaponTypes[weaponType];
        if (weaponData.type === 'melee') {
            this.weaponUses = weaponData.durability;
        } else {
            this.weaponUses = weaponData.uses;
        }
    }

    useWeapon() {
        if (!this.weapon || this.weaponCooldown > 0 || this.isAttacking) return;

        const weaponData = WeaponTypes[this.weapon];

        if (weaponData.type === 'melee') {
            // Melee weapon attack
            this.isAttacking = true;
            this.isUsingWeapon = true;
            this.attackType = 'weapon';
            this.attackCooldown = weaponData.swingSpeed;
            this.weaponCooldown = weaponData.swingSpeed;
            this.hasHit = false;
            this.createAttackHitbox(weaponData.range, 40, weaponData.damage);

            setTimeout(() => {
                this.isAttacking = false;
                this.isUsingWeapon = false;
                this.attackHitbox = null;
            }, weaponData.swingSpeed * 800);

            this.weaponUses--;
            if (this.weaponUses <= 0) {
                this.weapon = null;
            }
        } else if (weaponData.type === 'projectile' || weaponData.type === 'thrown') {
            // Ranged weapon - create projectile (unlimited until hit!)
            this.isAttacking = true;
            this.isUsingWeapon = true;
            this.attackType = 'throw';
            this.attackCooldown = 0.4;
            this.weaponCooldown = 0.4;

            // Spawn projectile
            const projType = this.weapon;
            projectiles.push(new Projectile(
                this.worldX + this.facing * 30,
                this.y - 40,
                this.facing,
                projType,
                'player'
            ));

            setTimeout(() => {
                this.isAttacking = false;
                this.isUsingWeapon = false;
            }, 200);

            // Ranged weapons are unlimited - lost when hit instead
        }
    }

    dropWeaponOnHit() {
        // Drop ranged weapons when player takes damage
        if (this.weapon) {
            const weaponData = WeaponTypes[this.weapon];
            if (weaponData.type === 'projectile' || weaponData.type === 'thrown') {
                // Drop the weapon as a pickup
                pickups.push(new Pickup(this.worldX, this.y, this.weapon));
                this.weapon = null;
                this.weaponUses = 0;
            }
        }
    }

    update(dt) {
        if (this.isDead) {
            super.update(dt);
            return;
        }

        // Movement input
        this.vx = 0;
        let moveX = 0;
        let moveY = 0;

        if (keys['ArrowLeft'] || keys['KeyA']) moveX -= 1;
        if (keys['ArrowRight'] || keys['KeyD']) moveX += 1;
        if (keys['ArrowUp'] || keys['KeyW']) moveY -= 1;
        if (keys['ArrowDown'] || keys['KeyS']) moveY += 1;

        // Normalize diagonal movement
        if (moveX !== 0 && moveY !== 0) {
            moveX *= 0.707;
            moveY *= 0.707;
        }

        if (!this.isAttacking && !this.isHurt) {
            this.vx = moveX * this.speed;
            // Depth movement (up/down in play area) - always allowed when grounded
            if (this.isGrounded && moveY !== 0) {
                this.y += moveY * this.speed * dt;
                this.y = clamp(this.y, PLAY_AREA_TOP, GROUND_Y);
            }
            if (moveX !== 0) {
                this.facing = moveX > 0 ? 1 : -1;
            }
        }

        // Jump (Space only - arrows are for depth movement)
        if (isKeyPressed('Space') && this.isGrounded && !this.isAttacking) {
            this.vy = this.jumpPower;
            this.isGrounded = false;
        }

        // Attacks
        if (isKeyPressed('KeyZ') || isKeyPressed('KeyJ')) {
            if (!this.isGrounded) {
                this.jumpAttack();
            } else {
                this.punch();
            }
        }
        if (isKeyPressed('KeyX') || isKeyPressed('KeyK')) {
            if (!this.isGrounded) {
                this.jumpAttack();
            } else {
                this.kick();
            }
        }

        // Use weapon (C or L key)
        if (isKeyPressed('KeyC') || isKeyPressed('KeyL')) {
            this.useWeapon();
        }

        // Weapon cooldown
        if (this.weaponCooldown > 0) {
            this.weaponCooldown -= dt;
        }

        // World bounds
        this.worldX = clamp(this.worldX, 30, LEVEL_WIDTH - 30);

        // Combo timer
        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) {
                this.combo = 0;
            }
        }

        super.update(dt);
    }

    addCombo() {
        this.combo++;
        this.comboTimer = 2;
    }

    takeDamage(amount, knockbackDir = 0) {
        // Drop ranged weapon when hit
        this.dropWeaponOnHit();
        // Call parent takeDamage
        super.takeDamage(amount, knockbackDir);
    }

    die() {
        super.die();
        this.lives--;
        // Drop any weapon on death
        this.weapon = null;
        this.weaponUses = 0;
        if (this.lives > 0) {
            setTimeout(() => {
                this.respawn();
            }, 1500);
        } else {
            gameState = GameState.GAME_OVER;
            gameOverScreen.classList.remove('hidden');
            finalScoreEl.textContent = `Score: ${score}`;
        }
    }

    respawn() {
        this.isDead = false;
        this.health = this.maxHealth;
        this.invulnerable = 2;
        this.isHurt = false;
        this.y = GROUND_Y;
    }

    drawCharacter(ctx) {
        const bounce = this.state === 'walk' ? Math.sin(this.frameIndex * 0.8) * 2 : 0;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 25, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Legs
        ctx.fillStyle = '#2d5a27';
        if (this.state === 'walk') {
            const legOffset = Math.sin(this.frameIndex) * 8;
            ctx.fillRect(-12, -25 + bounce, 10, 25);
            ctx.fillRect(2, -25 + bounce - legOffset, 10, 25);
        } else if (this.state === 'attack' && this.attackType === 'kick') {
            ctx.fillRect(-12, -25, 10, 25);
            ctx.save();
            ctx.translate(5, -20);
            ctx.rotate(Math.PI / 4);
            ctx.fillRect(0, 0, 10, 35);
            ctx.restore();
        } else {
            ctx.fillRect(-12, -25 + bounce, 10, 25);
            ctx.fillRect(2, -25 + bounce, 10, 25);
        }

        // Body
        ctx.fillStyle = '#4ecdc4';
        ctx.fillRect(-15, -55 + bounce, 30, 35);

        // Arms and weapon
        ctx.fillStyle = '#f4a460';
        if (this.state === 'attack' && this.attackType === 'weapon' && this.weapon) {
            // Swinging weapon
            ctx.fillRect(-20, -50 + bounce, 12, 8);
            ctx.save();
            ctx.translate(15, -45 + bounce);
            ctx.rotate(-Math.PI / 6);
            ctx.fillRect(0, -4, 12, 8); // arm
            // Draw weapon
            if (this.weapon === 'crowbar') {
                ctx.fillStyle = '#888';
                ctx.fillRect(10, -3, 50, 6);
                ctx.fillRect(55, -8, 6, 14);
            } else if (this.weapon === 'pipe') {
                ctx.fillStyle = '#666';
                ctx.fillRect(10, -4, 45, 8);
            }
            ctx.restore();
        } else if (this.state === 'attack' && this.attackType === 'throw') {
            // Throwing animation
            ctx.fillRect(-20, -50 + bounce, 12, 8);
            ctx.fillRect(8, -52 + bounce, 30, 10);
        } else if (this.state === 'attack' && this.attackType === 'punch') {
            ctx.fillRect(-20, -50 + bounce, 12, 8);
            ctx.fillRect(8, -52 + bounce, 35, 10);
        } else if (this.state === 'attack' && this.attackType === 'jumpkick') {
            ctx.fillRect(-20, -45, 12, 8);
            ctx.fillRect(8, -45, 12, 8);
        } else {
            // Normal stance - show held weapon
            ctx.fillRect(-22, -50 + bounce, 12, 25);
            ctx.fillRect(10, -50 + bounce, 12, 25);
            // Draw held weapon at rest
            if (this.weapon) {
                ctx.save();
                ctx.translate(18, -35 + bounce);
                ctx.rotate(Math.PI / 4);
                if (this.weapon === 'crowbar') {
                    ctx.fillStyle = '#888';
                    ctx.fillRect(0, -2, 35, 5);
                    ctx.fillRect(30, -6, 5, 10);
                } else if (this.weapon === 'pipe') {
                    ctx.fillStyle = '#666';
                    ctx.fillRect(0, -3, 30, 6);
                } else if (this.weapon === 'knife') {
                    ctx.fillStyle = '#ccc';
                    ctx.fillRect(0, -2, 18, 4);
                    ctx.fillStyle = '#8B4513';
                    ctx.fillRect(-6, -3, 8, 6);
                } else if (this.weapon === 'fireball') {
                    // Magic glow in hand
                    ctx.fillStyle = 'rgba(255, 100, 0, 0.6)';
                    ctx.beginPath();
                    ctx.arc(5, 0, 8, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }
        }

        // Head
        ctx.fillStyle = '#f4a460';
        ctx.fillRect(-12, -70 + bounce, 24, 20);

        // Hair
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(-12, -75 + bounce, 24, 10);

        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(-6, -65 + bounce, 4, 4);
        ctx.fillRect(2, -65 + bounce, 4, 4);

        // Hurt effect
        if (this.isHurt) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.fillRect(-20, -75 + bounce, 40, 80);
        }
    }
}

// Enemy Class
class Enemy extends Fighter {
    constructor(x, y, type = 'grunt') {
        const configs = {
            grunt: {
                width: 40,
                height: 65,
                color: '#e94560',
                maxHealth: 40,
                speed: 100,
                attackPower: 8,
                score: 100
            },
            tough: {
                width: 50,
                height: 75,
                color: '#ff6b35',
                maxHealth: 80,
                speed: 70,
                attackPower: 15,
                score: 200
            },
            fast: {
                width: 35,
                height: 60,
                color: '#9b59b6',
                maxHealth: 25,
                speed: 160,
                attackPower: 6,
                score: 150
            }
        };

        super(x, y, configs[type] || configs.grunt);
        this.type = type;
        this.scoreValue = configs[type]?.score || 100;
        this.aiState = 'idle';
        this.aiTimer = 0;
        this.targetX = x;
        this.targetY = y;
        this.aggroRange = 300;
        this.attackRange = 50;
        this.thinkTime = 0.5 + Math.random() * 0.5;
    }

    update(dt, player) {
        if (this.isDead) {
            super.update(dt);
            return;
        }

        this.aiTimer += dt;

        // AI State Machine
        const distToPlayer = distance(this.worldX, this.y, player.worldX, player.y);

        if (this.aiTimer >= this.thinkTime) {
            this.aiTimer = 0;
            this.thinkTime = 0.3 + Math.random() * 0.4;

            if (distToPlayer < this.attackRange && !this.isAttacking) {
                this.aiState = 'attack';
            } else if (distToPlayer < this.aggroRange) {
                this.aiState = 'chase';
            } else {
                this.aiState = 'idle';
            }
        }

        // Execute AI state
        this.vx = 0;

        if (!this.isAttacking && !this.isHurt) {
            switch (this.aiState) {
                case 'chase':
                    const dx = player.worldX - this.worldX;
                    const dy = player.y - this.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist > 5) {
                        this.vx = (dx / dist) * this.speed;
                        this.y += (dy / dist) * this.speed * dt * 0.3;
                    }

                    this.facing = dx > 0 ? 1 : -1;
                    break;

                case 'attack':
                    this.facing = player.worldX > this.worldX ? 1 : -1;
                    if (Math.random() < 0.5) {
                        this.punch();
                    } else {
                        this.kick();
                    }
                    break;
            }
        }

        // Keep in bounds
        this.worldX = clamp(this.worldX, worldOffset + 30, worldOffset + GAME_WIDTH - 30);

        super.update(dt);
    }

    die() {
        super.die();
        score += this.scoreValue * (1 + player.combo * 0.1);
        player.addCombo();
        enemiesRemaining--;

        // Chance to drop a weapon
        const dropChance = this.type === 'tough' ? 0.5 : 0.25;
        if (Math.random() < dropChance) {
            const weaponOptions = ['crowbar', 'pipe', 'knife', 'fireball'];
            const weights = [0.3, 0.3, 0.25, 0.15]; // Fireball is rarer
            let roll = Math.random();
            let weaponType = 'crowbar';
            let cumulative = 0;
            for (let i = 0; i < weaponOptions.length; i++) {
                cumulative += weights[i];
                if (roll < cumulative) {
                    weaponType = weaponOptions[i];
                    break;
                }
            }
            pickups.push(new Pickup(this.worldX, this.y, weaponType));
        }
    }

    drawCharacter(ctx) {
        const bounce = this.state === 'walk' ? Math.sin(this.frameIndex * 0.8) * 2 : 0;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 20, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Color based on type
        let bodyColor = this.color;
        let pantsColor = '#333';

        if (this.type === 'tough') {
            pantsColor = '#1a1a1a';
        } else if (this.type === 'fast') {
            pantsColor = '#4a235a';
        }

        // Legs
        ctx.fillStyle = pantsColor;
        if (this.state === 'walk') {
            const legOffset = Math.sin(this.frameIndex) * 6;
            ctx.fillRect(-10, -22 + bounce, 8, 22);
            ctx.fillRect(2, -22 + bounce - legOffset, 8, 22);
        } else if (this.state === 'attack' && this.attackType === 'kick') {
            ctx.fillRect(-10, -22, 8, 22);
            ctx.save();
            ctx.translate(4, -18);
            ctx.rotate(Math.PI / 4);
            ctx.fillRect(0, 0, 8, 30);
            ctx.restore();
        } else {
            ctx.fillRect(-10, -22 + bounce, 8, 22);
            ctx.fillRect(2, -22 + bounce, 8, 22);
        }

        // Body
        ctx.fillStyle = bodyColor;
        ctx.fillRect(-13, -48 + bounce, 26, 30);

        // Arms
        ctx.fillStyle = '#deb887';
        if (this.state === 'attack' && this.attackType === 'punch') {
            ctx.fillRect(-18, -44 + bounce, 10, 7);
            ctx.fillRect(6, -46 + bounce, 30, 9);
        } else {
            ctx.fillRect(-18, -44 + bounce, 10, 22);
            ctx.fillRect(8, -44 + bounce, 10, 22);
        }

        // Head
        ctx.fillStyle = '#deb887';
        ctx.fillRect(-10, -60 + bounce, 20, 16);

        // Angry eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(-5, -55 + bounce, 3, 3);
        ctx.fillRect(2, -55 + bounce, 3, 3);

        // Eyebrows (angry)
        ctx.fillStyle = '#000';
        ctx.fillRect(-6, -58 + bounce, 5, 2);
        ctx.fillRect(1, -58 + bounce, 5, 2);

        // Hurt effect
        if (this.isHurt) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fillRect(-18, -65 + bounce, 36, 70);
        }
    }
}

// Background / Level
class Level {
    constructor() {
        this.buildings = [];
        this.generateBuildings();
    }

    generateBuildings() {
        let x = 0;
        while (x < LEVEL_WIDTH) {
            const width = 100 + Math.random() * 150;
            const height = 80 + Math.random() * 120;
            const color = `hsl(${220 + Math.random() * 30}, 30%, ${15 + Math.random() * 15}%)`;

            this.buildings.push({
                x: x,
                width: width,
                height: height,
                color: color,
                windows: this.generateWindows(width, height)
            });

            x += width + 20 + Math.random() * 40;
        }
    }

    generateWindows(buildingWidth, buildingHeight) {
        const windows = [];
        const cols = Math.floor(buildingWidth / 30);
        const rows = Math.floor(buildingHeight / 25);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (Math.random() > 0.3) {
                    windows.push({
                        x: 15 + c * 28,
                        y: 15 + r * 24,
                        lit: Math.random() > 0.4
                    });
                }
            }
        }
        return windows;
    }

    draw(ctx) {
        // Sky gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(0.5, '#16213e');
        gradient.addColorStop(1, '#0f3460');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        // Stars
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 50; i++) {
            const x = (i * 97 + worldOffset * 0.1) % GAME_WIDTH;
            const y = (i * 73) % (GAME_HEIGHT * 0.4);
            const size = (i % 3) + 1;
            ctx.globalAlpha = 0.3 + (i % 5) * 0.15;
            ctx.fillRect(x, y, size, size);
        }
        ctx.globalAlpha = 1;

        // Moon
        ctx.fillStyle = '#f5f5dc';
        ctx.beginPath();
        ctx.arc(650 - worldOffset * 0.05, 60, 30, 0, Math.PI * 2);
        ctx.fill();

        // Buildings (parallax)
        this.buildings.forEach(building => {
            const screenX = building.x - worldOffset * 0.7;
            if (screenX > -building.width && screenX < GAME_WIDTH) {
                // Building body
                ctx.fillStyle = building.color;
                ctx.fillRect(
                    screenX,
                    GAME_HEIGHT - 80 - building.height,
                    building.width,
                    building.height
                );

                // Windows
                building.windows.forEach(win => {
                    ctx.fillStyle = win.lit ? '#ffd93d' : '#1a1a2e';
                    ctx.globalAlpha = win.lit ? 0.8 : 0.5;
                    ctx.fillRect(
                        screenX + win.x,
                        GAME_HEIGHT - 80 - building.height + win.y,
                        15,
                        12
                    );
                });
                ctx.globalAlpha = 1;
            }
        });

        // Ground
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(0, GAME_HEIGHT - 80, GAME_WIDTH, 80);

        // Road markings
        ctx.fillStyle = '#f39c12';
        for (let i = 0; i < 20; i++) {
            const x = (i * 120 - worldOffset) % (GAME_WIDTH + 200) - 100;
            ctx.fillRect(x, GAME_HEIGHT - 45, 60, 5);
        }

        // Sidewalk line
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(0, GAME_HEIGHT - 80, GAME_WIDTH, 3);
    }
}

// HUD
function drawHUD(ctx) {
    // Player health bar background
    ctx.fillStyle = '#333';
    ctx.fillRect(20, 20, 200, 25);

    // Player health bar
    const healthPercent = player.health / player.maxHealth;
    const healthColor = healthPercent > 0.5 ? '#4ecdc4' : healthPercent > 0.25 ? '#f39c12' : '#e74c3c';
    ctx.fillStyle = healthColor;
    ctx.fillRect(20, 20, 200 * healthPercent, 25);

    // Health bar border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 200, 25);

    // Player label
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.fillText('PLAYER', 25, 36);

    // Lives
    ctx.fillStyle = '#e94560';
    for (let i = 0; i < player.lives; i++) {
        ctx.beginPath();
        ctx.arc(240 + i * 25, 32, 8, 0, Math.PI * 2);
        ctx.fill();
    }

    // Score
    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`SCORE: ${Math.floor(score)}`, GAME_WIDTH - 20, 35);
    ctx.textAlign = 'left';

    // Combo
    if (player.combo > 1) {
        ctx.fillStyle = '#ffd93d';
        ctx.font = '20px monospace';
        ctx.fillText(`${player.combo}x COMBO!`, GAME_WIDTH / 2 - 60, 35);
    }

    // Wave indicator
    ctx.fillStyle = '#aaa';
    ctx.font = '12px monospace';
    ctx.fillText(`WAVE ${currentWave}`, 20, GAME_HEIGHT - 25);

    // Weapon indicator
    if (player.weapon) {
        const weaponData = WeaponTypes[player.weapon];

        // Background box
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(20, 55, 120, 35);
        ctx.strokeStyle = '#ffd93d';
        ctx.lineWidth = 2;
        ctx.strokeRect(20, 55, 120, 35);

        // Weapon name
        ctx.fillStyle = '#ffd93d';
        ctx.font = '11px monospace';
        ctx.fillText(weaponData.name.toUpperCase(), 28, 72);

        // Uses/durability
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        if (weaponData.type === 'melee') {
            ctx.fillText(`DUR:${player.weaponUses}`, 28, 85);
        } else {
            ctx.fillStyle = '#ff6b6b';
            ctx.fillText('TIL HIT', 28, 85);
        }

        // Weapon icon
        ctx.save();
        ctx.translate(110, 72);
        if (player.weapon === 'crowbar') {
            ctx.fillStyle = '#888';
            ctx.fillRect(-15, -2, 25, 4);
            ctx.fillRect(8, -5, 4, 8);
        } else if (player.weapon === 'pipe') {
            ctx.fillStyle = '#666';
            ctx.fillRect(-12, -3, 24, 6);
        } else if (player.weapon === 'knife') {
            ctx.fillStyle = '#ccc';
            ctx.fillRect(-10, -2, 18, 4);
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(-10, -3, 6, 6);
        } else if (player.weapon === 'fireball') {
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 10);
            gradient.addColorStop(0, '#fff');
            gradient.addColorStop(0.5, '#ff6600');
            gradient.addColorStop(1, '#ff0000');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, 10, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Key hint
        ctx.fillStyle = '#888';
        ctx.font = '9px monospace';
        ctx.fillText('[C/L]', 95, 85);
    }

    // Progress bar
    const progress = worldOffset / (LEVEL_WIDTH - GAME_WIDTH);
    ctx.fillStyle = '#333';
    ctx.fillRect(GAME_WIDTH / 2 - 100, GAME_HEIGHT - 20, 200, 8);
    ctx.fillStyle = '#4ecdc4';
    ctx.fillRect(GAME_WIDTH / 2 - 100, GAME_HEIGHT - 20, 200 * progress, 8);
}

// Wave Definitions
const waves = [
    { enemies: [{ type: 'grunt', count: 2 }], triggerX: 100 },
    { enemies: [{ type: 'grunt', count: 3 }], triggerX: 500 },
    { enemies: [{ type: 'grunt', count: 2 }, { type: 'fast', count: 1 }], triggerX: 900 },
    { enemies: [{ type: 'tough', count: 1 }, { type: 'grunt', count: 2 }], triggerX: 1300 },
    { enemies: [{ type: 'fast', count: 3 }], triggerX: 1700 },
    { enemies: [{ type: 'grunt', count: 3 }, { type: 'tough', count: 1 }], triggerX: 2100 },
    { enemies: [{ type: 'tough', count: 2 }, { type: 'fast', count: 2 }], triggerX: 2500 },
    { enemies: [{ type: 'grunt', count: 2 }, { type: 'tough', count: 2 }, { type: 'fast', count: 2 }], triggerX: 2900 }
];

// Weapon Definitions
const WeaponTypes = {
    crowbar: {
        name: 'Crowbar',
        type: 'melee',
        damage: 25,
        range: 70,
        durability: 8,
        color: '#888',
        swingSpeed: 0.35
    },
    pipe: {
        name: 'Pipe',
        type: 'melee',
        damage: 20,
        range: 60,
        durability: 10,
        color: '#666',
        swingSpeed: 0.3
    },
    knife: {
        name: 'Knife',
        type: 'thrown',
        damage: 30,
        speed: 500,
        uses: 3,
        color: '#ccc'
    },
    fireball: {
        name: 'Fireball',
        type: 'projectile',
        damage: 35,
        speed: 400,
        uses: 5,
        color: '#ff6600'
    }
};

// Projectile Class
class Projectile {
    constructor(x, y, facing, type, owner) {
        this.worldX = x;
        this.y = y;
        this.facing = facing;
        this.type = type;
        this.owner = owner;
        this.speed = WeaponTypes[type].speed;
        this.damage = WeaponTypes[type].damage;
        this.active = true;
        this.width = type === 'fireball' ? 30 : 15;
        this.height = type === 'fireball' ? 20 : 8;
        this.animTimer = 0;
    }

    update(dt) {
        this.worldX += this.facing * this.speed * dt;
        this.animTimer += dt;

        // Remove if off screen
        if (this.worldX < worldOffset - 50 || this.worldX > worldOffset + GAME_WIDTH + 50) {
            this.active = false;
        }
    }

    draw(ctx) {
        const screenX = this.worldX - worldOffset;
        ctx.save();
        ctx.translate(screenX, this.y);

        if (this.type === 'fireball') {
            // Fireball effect
            const flicker = Math.sin(this.animTimer * 20) * 3;

            // Outer glow
            ctx.fillStyle = 'rgba(255, 100, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(0, 0, 25 + flicker, 15, 0, 0, Math.PI * 2);
            ctx.fill();

            // Core
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
            gradient.addColorStop(0, '#fff');
            gradient.addColorStop(0.3, '#ffff00');
            gradient.addColorStop(0.6, '#ff6600');
            gradient.addColorStop(1, '#ff0000');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.ellipse(0, 0, 15 + flicker/2, 10, 0, 0, Math.PI * 2);
            ctx.fill();

            // Trail
            ctx.fillStyle = 'rgba(255, 150, 0, 0.5)';
            for (let i = 1; i <= 3; i++) {
                ctx.beginPath();
                ctx.ellipse(-this.facing * i * 12, 0, 8 - i*2, 6 - i, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (this.type === 'knife') {
            // Spinning knife
            ctx.rotate(this.animTimer * 15 * this.facing);
            ctx.fillStyle = '#ccc';
            ctx.fillRect(-12, -3, 24, 6);
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(-12, -3, 8, 6);
        }

        ctx.restore();
    }

    checkHit(target) {
        if (!this.active) return false;

        const depthDist = Math.abs(this.y - target.y);
        if (depthDist > 35) return false;

        const targetLeft = target.worldX - target.width / 2;
        const targetRight = target.worldX + target.width / 2;

        if (this.worldX > targetLeft && this.worldX < targetRight) {
            this.active = false;
            return true;
        }
        return false;
    }
}

// Pickup Class
class Pickup {
    constructor(x, y, weaponType) {
        this.worldX = x;
        this.y = y;
        this.weaponType = weaponType;
        this.width = 30;
        this.height = 20;
        this.bobTimer = Math.random() * Math.PI * 2;
        this.active = true;
        this.flashTimer = 0;
        this.lifetime = 15; // Disappears after 15 seconds
    }

    update(dt) {
        this.bobTimer += dt * 3;
        this.lifetime -= dt;
        if (this.lifetime <= 3) {
            this.flashTimer += dt;
        }
        if (this.lifetime <= 0) {
            this.active = false;
        }
    }

    draw(ctx) {
        if (!this.active) return;

        // Flash when about to disappear
        if (this.lifetime <= 3 && Math.floor(this.flashTimer * 6) % 2 === 0) {
            return;
        }

        const screenX = this.worldX - worldOffset;
        const bobY = Math.sin(this.bobTimer) * 3;

        ctx.save();
        ctx.translate(screenX, this.y - 10 + bobY);

        const weapon = WeaponTypes[this.weaponType];

        // Glow effect
        ctx.fillStyle = 'rgba(255, 255, 100, 0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 5, 20, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw weapon icon
        if (this.weaponType === 'crowbar') {
            ctx.fillStyle = '#888';
            ctx.fillRect(-20, -3, 40, 6);
            ctx.fillRect(-20, -8, 8, 12);
        } else if (this.weaponType === 'pipe') {
            ctx.fillStyle = '#666';
            ctx.beginPath();
            ctx.ellipse(0, 0, 20, 4, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.weaponType === 'knife') {
            ctx.fillStyle = '#ccc';
            ctx.fillRect(-15, -2, 25, 4);
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(-15, -3, 10, 6);
        } else if (this.weaponType === 'fireball') {
            // Magic orb
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 12);
            gradient.addColorStop(0, '#fff');
            gradient.addColorStop(0.5, '#ff6600');
            gradient.addColorStop(1, '#ff0000');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, 12, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    checkPickup(player) {
        if (!this.active) return false;

        const dist = Math.abs(player.worldX - this.worldX);
        const depthDist = Math.abs(player.y - this.y);

        if (dist < 40 && depthDist < 30) {
            this.active = false;
            return true;
        }
        return false;
    }
}

// Game Objects
let player;
let enemies = [];
let level;
let pickups = [];
let projectiles = [];

// Initialize Game
function startGame() {
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameState = GameState.PLAYING;
    resetGame();
}

function resetGame() {
    gameOverScreen.classList.add('hidden');
    score = 0;
    worldOffset = 0;
    currentWave = 0;
    waveSpawned = false;
    enemiesRemaining = 0;

    player = new Player(100, GROUND_Y);
    enemies = [];
    level = new Level();
    pickups = [];
    projectiles = [];

    // Reset wave spawned flags
    waves.forEach(w => w.spawned = false);

    gameState = GameState.PLAYING;
}

function spawnWave(waveIndex) {
    if (waveIndex >= waves.length) return;

    const wave = waves[waveIndex];
    currentWave = waveIndex + 1;

    wave.enemies.forEach(enemyGroup => {
        for (let i = 0; i < enemyGroup.count; i++) {
            const spawnX = worldOffset + GAME_WIDTH + 50 + Math.random() * 100;
            const spawnY = PLAY_AREA_TOP + Math.random() * (GROUND_Y - PLAY_AREA_TOP);
            enemies.push(new Enemy(spawnX, spawnY, enemyGroup.type));
            enemiesRemaining++;
        }
    });
}

// Collision Detection
function checkCollisions() {
    // Player attacks hitting enemies
    if (player.attackHitbox && !player.hasHit) {
        enemies.forEach(enemy => {
            if (enemy.isDead) return;

            const hitbox = player.attackHitbox;
            const enemyLeft = enemy.worldX - enemy.width / 2;
            const enemyRight = enemy.worldX + enemy.width / 2;
            const enemyTop = enemy.y - enemy.height;
            const enemyBottom = enemy.y;

            // Check Y proximity (depth)
            const depthDist = Math.abs(player.y - enemy.y);
            if (depthDist > 40) return;

            if (hitbox.x < enemyRight && hitbox.x + hitbox.width > enemyLeft &&
                hitbox.y < enemyBottom && hitbox.y + hitbox.height > enemyTop) {
                enemy.takeDamage(hitbox.damage, player.facing);
                player.hasHit = true;

                // Hit effect
                createHitEffect(enemy.worldX, enemy.y - enemy.height / 2);
            }
        });
    }

    // Enemy attacks hitting player
    enemies.forEach(enemy => {
        if (enemy.isDead || !enemy.attackHitbox || enemy.hasHit) return;

        const hitbox = enemy.attackHitbox;
        const playerLeft = player.worldX - player.width / 2;
        const playerRight = player.worldX + player.width / 2;
        const playerTop = player.y - player.height;
        const playerBottom = player.y;

        // Check Y proximity (depth)
        const depthDist = Math.abs(player.y - enemy.y);
        if (depthDist > 40) return;

        if (hitbox.x < playerRight && hitbox.x + hitbox.width > playerLeft &&
            hitbox.y < playerBottom && hitbox.y + hitbox.height > playerTop) {
            player.takeDamage(hitbox.damage, enemy.facing);
            enemy.hasHit = true;
        }
    });
}

// Hit Effects
const hitEffects = [];

function createHitEffect(x, y) {
    hitEffects.push({
        x: x,
        y: y,
        radius: 5,
        maxRadius: 30,
        alpha: 1
    });
}

function updateHitEffects(dt) {
    for (let i = hitEffects.length - 1; i >= 0; i--) {
        const effect = hitEffects[i];
        effect.radius += 150 * dt;
        effect.alpha -= 3 * dt;

        if (effect.alpha <= 0) {
            hitEffects.splice(i, 1);
        }
    }
}

function drawHitEffects(ctx) {
    hitEffects.forEach(effect => {
        ctx.strokeStyle = `rgba(255, 255, 100, ${effect.alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(effect.x - worldOffset, effect.y, effect.radius, 0, Math.PI * 2);
        ctx.stroke();
    });
}

// Game Loop
let lastTime = 0;

function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    if (gameState === GameState.PLAYING) {
        // Check wave spawning
        for (let i = 0; i < waves.length; i++) {
            if (player.worldX >= waves[i].triggerX && !waves[i].spawned) {
                waves[i].spawned = true;
                spawnWave(i);
            }
        }

        // Update player
        player.update(dt);

        // Update enemies
        enemies.forEach(enemy => enemy.update(dt, player));

        // Remove dead enemies after animation
        enemies = enemies.filter(e => !e.isDead || e.hurtTimer > -1);

        // Update pickups
        pickups.forEach(pickup => pickup.update(dt));
        pickups = pickups.filter(p => p.active);

        // Check pickup collisions
        pickups.forEach(pickup => {
            if (pickup.checkPickup(player)) {
                player.pickupWeapon(pickup.weaponType);
            }
        });

        // Update projectiles
        projectiles.forEach(proj => proj.update(dt));

        // Check projectile collisions
        projectiles.forEach(proj => {
            if (proj.owner === 'player') {
                enemies.forEach(enemy => {
                    if (!enemy.isDead && proj.checkHit(enemy)) {
                        enemy.takeDamage(proj.damage, proj.facing);
                        createHitEffect(enemy.worldX, enemy.y - enemy.height / 2);
                    }
                });
            }
        });
        projectiles = projectiles.filter(p => p.active);

        // Check collisions
        checkCollisions();

        // Update effects
        updateHitEffects(dt);

        // Scroll camera
        const targetOffset = player.worldX - SCROLL_THRESHOLD;
        if (targetOffset > worldOffset && enemiesRemaining === 0) {
            worldOffset = lerp(worldOffset, Math.min(targetOffset, LEVEL_WIDTH - GAME_WIDTH), 0.05);
        }
        worldOffset = clamp(worldOffset, 0, LEVEL_WIDTH - GAME_WIDTH);

        // Check victory
        if (worldOffset >= LEVEL_WIDTH - GAME_WIDTH - 10 && enemiesRemaining === 0 && currentWave >= waves.length) {
            gameState = GameState.VICTORY;
            score += 1000; // Victory bonus
            gameOverScreen.querySelector('h1').textContent = 'VICTORY!';
            gameOverScreen.classList.remove('hidden');
            finalScoreEl.textContent = `Final Score: ${Math.floor(score)}`;
        }
    }

    // Draw
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    if (gameState !== GameState.MENU) {
        level.draw(ctx);

        // Draw pickups (behind characters)
        pickups.forEach(pickup => pickup.draw(ctx));

        // Sort entities by Y for depth
        const allEntities = [player, ...enemies].filter(e => !e.isDead || e.hurtTimer > -0.5);
        allEntities.sort((a, b) => a.y - b.y);
        allEntities.forEach(entity => entity.draw(ctx));

        // Draw projectiles (in front of characters)
        projectiles.forEach(proj => proj.draw(ctx));

        drawHitEffects(ctx);
        drawHUD(ctx);

        // GO arrow when enemies cleared
        if (enemiesRemaining === 0 && currentWave < waves.length && currentWave > 0) {
            ctx.fillStyle = '#4ecdc4';
            ctx.font = '24px monospace';
            ctx.globalAlpha = 0.5 + Math.sin(timestamp / 200) * 0.5;
            ctx.fillText('GO >', GAME_WIDTH - 80, GAME_HEIGHT / 2);
            ctx.globalAlpha = 1;
        }
    }

    requestAnimationFrame(gameLoop);
}

// Start the game loop
requestAnimationFrame(gameLoop);

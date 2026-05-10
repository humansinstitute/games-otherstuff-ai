/**
 * Space Invaders - Entity Classes
 * Base Entity and all game objects
 */

// Base Entity class with position, size, and collision detection
export class Entity {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.active = true;
  }

  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }

  // AABB collision detection
  collidesWith(other) {
    if (!this.active || !other.active) return false;
    const a = this.getBounds();
    const b = other.getBounds();
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  // Get center point
  getCenterX() {
    return this.x + this.width / 2;
  }

  getCenterY() {
    return this.y + this.height / 2;
  }
}

// Player ship
export class Player extends Entity {
  constructor(canvasWidth, canvasHeight) {
    const width = 30;
    const height = 20;
    super(canvasWidth / 2 - width / 2, canvasHeight - 50, width, height);

    this.speed = 5;
    this.lives = 3;
    this.shootCooldown = 0;
    this.shootCooldownMax = 15; // frames between shots
    this.isInvincible = false;
    this.invincibleTimer = 0;
    this.invincibleDuration = 120; // 2 seconds at 60fps

    this.color = '#00ff88';
    this.glowColor = '#00ff88';

    this.canvasWidth = canvasWidth;
  }

  update(input) {
    // Movement
    if (input.left && this.x > 0) {
      this.x -= this.speed;
    }
    if (input.right && this.x < this.canvasWidth - this.width) {
      this.x += this.speed;
    }

    // Shooting cooldown
    if (this.shootCooldown > 0) {
      this.shootCooldown--;
    }

    // Invincibility timer
    if (this.isInvincible) {
      this.invincibleTimer--;
      if (this.invincibleTimer <= 0) {
        this.isInvincible = false;
      }
    }
  }

  // Returns a Bullet or null if on cooldown
  shoot() {
    if (this.shootCooldown > 0) return null;

    this.shootCooldown = this.shootCooldownMax;
    return new Bullet(
      this.getCenterX() - 2,
      this.y - 10,
      -8,  // velocity (upward)
      true // isPlayerBullet
    );
  }

  hit() {
    if (this.isInvincible) return false;

    this.lives--;
    this.isInvincible = true;
    this.invincibleTimer = this.invincibleDuration;
    return true;
  }

  reset(canvasWidth, canvasHeight) {
    this.x = canvasWidth / 2 - this.width / 2;
    this.y = canvasHeight - 50;
    this.lives = 3;
    this.isInvincible = false;
    this.invincibleTimer = 0;
    this.shootCooldown = 0;
  }
}

// Enemy with type-based properties
export class Enemy extends Entity {
  constructor(x, y, type, config) {
    super(x, y, config.width, config.height);

    this.type = type;
    this.health = config.health;
    this.maxHealth = config.health;
    this.points = config.points;
    this.color = config.color;
    this.glowColor = config.glowColor || config.color;
    this.shootChance = config.shootChance || 0.002;

    // Animation
    this.animFrame = 0;
    this.animTimer = 0;
  }

  update(direction, speed) {
    // Move horizontally
    this.x += direction * speed;

    // Animation
    this.animTimer++;
    if (this.animTimer > 30) {
      this.animTimer = 0;
      this.animFrame = 1 - this.animFrame;
    }
  }

  moveDown(amount) {
    this.y += amount;
  }

  takeDamage(amount = 1) {
    this.health -= amount;
    if (this.health <= 0) {
      this.active = false;
      return true; // destroyed
    }
    return false;
  }

  // Check if this enemy should shoot (random chance per frame)
  shouldShoot() {
    return Math.random() < this.shootChance;
  }

  shoot() {
    return new Bullet(
      this.getCenterX() - 2,
      this.y + this.height,
      4,    // velocity (downward)
      false // not player bullet
    );
  }
}

// Boss enemy with phases and attack patterns
export class Boss extends Entity {
  constructor(canvasWidth, config) {
    const width = 80;
    const height = 50;
    super(canvasWidth / 2 - width / 2, 60, width, height);

    this.name = config.name;
    this.maxHealth = config.health;
    this.health = config.health;
    this.patterns = config.patterns;
    this.currentPattern = 0;
    this.patternTimer = 0;
    this.patternCooldown = 60; // frames between attacks

    this.color = '#e74c3c';
    this.glowColor = '#ff0000';

    // Movement
    this.direction = 1;
    this.speed = 2;
    this.canvasWidth = canvasWidth;

    // Phase changes at health thresholds
    this.phase = 1;
  }

  update() {
    // Move side to side
    this.x += this.direction * this.speed;

    // Bounce off walls
    if (this.x <= 20 || this.x >= this.canvasWidth - this.width - 20) {
      this.direction *= -1;
    }

    // Pattern timer
    this.patternTimer++;

    // Check phase transitions
    const healthPercent = this.health / this.maxHealth;
    if (healthPercent < 0.3 && this.phase < 3) {
      this.phase = 3;
      this.speed = 4;
      this.patternCooldown = 30;
    } else if (healthPercent < 0.6 && this.phase < 2) {
      this.phase = 2;
      this.speed = 3;
      this.patternCooldown = 45;
    }
  }

  takeDamage(amount = 1) {
    this.health -= amount;
    if (this.health <= 0) {
      this.active = false;
      return true;
    }
    return false;
  }

  // Get attack bullets based on current pattern
  getAttack() {
    if (this.patternTimer < this.patternCooldown) return [];

    this.patternTimer = 0;
    const pattern = this.patterns[this.currentPattern % this.patterns.length];
    this.currentPattern++;

    const bullets = [];
    const cx = this.getCenterX();
    const cy = this.y + this.height;

    switch (pattern) {
      case 'spread3':
        bullets.push(new Bullet(cx - 2, cy, 4, false));
        bullets.push(new Bullet(cx - 2, cy, 4, false, 1, -2)); // angled left
        bullets.push(new Bullet(cx - 2, cy, 4, false, 1, 2));  // angled right
        break;

      case 'spread5':
        for (let i = -2; i <= 2; i++) {
          bullets.push(new Bullet(cx - 2, cy, 4, false, 1, i * 1.5));
        }
        break;

      case 'aimed':
        // Single fast bullet
        bullets.push(new Bullet(cx - 2, cy, 6, false));
        break;

      case 'wave':
        // Horizontal wave of bullets
        for (let i = 0; i < 5; i++) {
          bullets.push(new Bullet(this.x + i * 16, cy, 3, false));
        }
        break;

      case 'barrage':
        // Many bullets
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI;
          bullets.push(new Bullet(
            cx - 2, cy, 3, false, 1,
            Math.cos(angle) * 3
          ));
        }
        break;

      default:
        bullets.push(new Bullet(cx - 2, cy, 4, false));
    }

    return bullets;
  }
}

// Projectile
export class Bullet extends Entity {
  constructor(x, y, velocityY, isPlayerBullet, damage = 1, velocityX = 0) {
    super(x, y, 4, 10);

    this.velocityX = velocityX;
    this.velocityY = velocityY;
    this.isPlayerBullet = isPlayerBullet;
    this.damage = damage;

    this.color = isPlayerBullet ? '#4a9eff' : '#ff6b6b';
    this.glowColor = this.color;
  }

  update(canvasHeight) {
    this.x += this.velocityX;
    this.y += this.velocityY;

    // Deactivate if off screen
    if (this.y < -20 || this.y > canvasHeight + 20) {
      this.active = false;
    }
    if (this.x < -20 || this.x > 340) {
      this.active = false;
    }
  }
}

// Destructible shield block
export class ShieldBlock extends Entity {
  constructor(x, y) {
    super(x, y, 8, 8);

    this.health = 3;
    this.maxHealth = 3;
    this.color = '#4a7a9e';
  }

  takeDamage() {
    this.health--;
    if (this.health <= 0) {
      this.active = false;
      return true;
    }
    return false;
  }

  getAlpha() {
    return 0.3 + (this.health / this.maxHealth) * 0.7;
  }
}

// Create a shield (group of blocks)
export function createShield(x, y) {
  const blocks = [];
  const pattern = [
    [0, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1],
    [1, 1, 0, 0, 1, 1],
  ];

  for (let row = 0; row < pattern.length; row++) {
    for (let col = 0; col < pattern[row].length; col++) {
      if (pattern[row][col]) {
        blocks.push(new ShieldBlock(x + col * 8, y + row * 8));
      }
    }
  }

  return blocks;
}

// Particle for explosions
export class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;

    // Random velocity
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.size = 2 + Math.random() * 4;
    this.life = 30 + Math.random() * 20;
    this.maxLife = this.life;
    this.active = true;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.1; // gravity
    this.life--;

    if (this.life <= 0) {
      this.active = false;
    }
  }

  getAlpha() {
    return this.life / this.maxLife;
  }
}

// Create explosion particles
export function createExplosion(x, y, color, count = 8) {
  const particles = [];
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, color));
  }
  return particles;
}

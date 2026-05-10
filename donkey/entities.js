/**
 * Donkey Kong Style Platformer - Entity Classes
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

// Player character - blue body with yellow head
export class Player extends Entity {
  constructor(canvasWidth, canvasHeight) {
    const width = 24;
    const height = 32;
    super(50, canvasHeight - 80, width, height);

    this.speed = 3;
    this.lives = 3;
    this.isInvincible = false;
    this.invincibleTimer = 0;
    this.invincibleDuration = 120; // 2 seconds at 60fps

    // Physics
    this.velocityX = 0;
    this.velocityY = 0;
    this.gravity = 0.5;
    this.jumpPower = -10;
    this.maxFallSpeed = 12;
    this.isOnGround = false;
    this.isOnLadder = false;
    this.climbSpeed = 2.5;

    // Colors - blue body, yellow head
    this.bodyColor = '#3498db';
    this.headColor = '#f1c40f';
    this.glowColor = '#3498db';

    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    // Animation
    this.animFrame = 0;
    this.animTimer = 0;
    this.facingRight = true;
  }

  update(input, platforms, ladders) {
    // Store previous position for collision resolution
    const prevX = this.x;
    const prevY = this.y;

    // Check if on ladder (or near top of ladder for dismounting)
    this.isOnLadder = false;
    this.currentLadder = null;
    for (const ladder of ladders) {
      if (this.isOverlappingLadder(ladder)) {
        this.isOnLadder = true;
        this.currentLadder = ladder;
        break;
      }
    }

    // Check if at top of a ladder (for stepping off)
    let atLadderTop = false;
    let ladderTopY = 0;
    if (this.currentLadder) {
      ladderTopY = this.currentLadder.y;
      // Player's feet are near or above ladder top
      atLadderTop = (this.y + this.height) <= ladderTopY + 20;
    }

    // Horizontal movement
    this.velocityX = 0;
    if (input.left) {
      this.velocityX = -this.speed;
      this.facingRight = false;
    }
    if (input.right) {
      this.velocityX = this.speed;
      this.facingRight = true;
    }

    // Ladder climbing
    if (this.isOnLadder) {
      if (input.up) {
        // If at top of ladder, step off onto platform
        if (atLadderTop) {
          // Move up to step onto platform
          this.velocityY = -this.climbSpeed;
          // Check if we can land on a platform
          for (const platform of platforms) {
            if (this.y + this.height > platform.y - 5 &&
                this.y + this.height < platform.y + 15 &&
                this.getCenterX() > platform.x &&
                this.getCenterX() < platform.x + platform.width) {
              this.y = platform.y - this.height;
              this.velocityY = 0;
              this.isOnGround = true;
              this.isOnLadder = false;
              break;
            }
          }
        } else {
          this.velocityY = -this.climbSpeed;
        }
      } else if (input.down) {
        this.velocityY = this.climbSpeed;
      } else if (!input.jump) {
        this.velocityY = 0;
      }
    } else {
      // Apply gravity when not on ladder
      this.velocityY += this.gravity;
      if (this.velocityY > this.maxFallSpeed) {
        this.velocityY = this.maxFallSpeed;
      }
    }

    // Jumping
    if (input.jump && (this.isOnGround || this.isOnLadder)) {
      this.velocityY = this.jumpPower;
      this.isOnGround = false;
      this.isOnLadder = false;
    }

    // Apply horizontal movement
    this.x += this.velocityX;

    // Horizontal collision with platforms (but not when on ladder)
    if (!this.isOnLadder) {
      for (const platform of platforms) {
        if (this.collidesWith(platform)) {
          if (this.velocityX > 0) {
            this.x = platform.x - this.width;
          } else if (this.velocityX < 0) {
            this.x = platform.x + platform.width;
          }
          this.velocityX = 0;
        }
      }
    }

    // Apply vertical movement
    this.y += this.velocityY;

    // Vertical collision with platforms
    if (!this.isOnLadder) {
      this.isOnGround = false;
      for (const platform of platforms) {
        if (this.collidesWith(platform)) {
          if (this.velocityY > 0) {
            // Falling down - land on platform
            this.y = platform.y - this.height;
            this.velocityY = 0;
            this.isOnGround = true;
          } else if (this.velocityY < 0) {
            // Jumping up - hit head (but not when climbing)
            this.y = platform.y + platform.height;
            this.velocityY = 0;
          }
        }
      }
    }

    // Screen boundaries
    if (this.x < 0) this.x = 0;
    if (this.x > this.canvasWidth - this.width) this.x = this.canvasWidth - this.width;
    if (this.y > this.canvasHeight - this.height) {
      this.y = this.canvasHeight - this.height;
      this.isOnGround = true;
      this.velocityY = 0;
    }

    // Animation
    if (this.velocityX !== 0) {
      this.animTimer++;
      if (this.animTimer > 8) {
        this.animTimer = 0;
        this.animFrame = (this.animFrame + 1) % 4;
      }
    } else {
      this.animFrame = 0;
      this.animTimer = 0;
    }

    // Invincibility timer
    if (this.isInvincible) {
      this.invincibleTimer--;
      if (this.invincibleTimer <= 0) {
        this.isInvincible = false;
      }
    }
  }

  isOverlappingLadder(ladder) {
    const centerX = this.getCenterX();
    const feetY = this.y + this.height;
    const headY = this.y;

    return centerX > ladder.x &&
           centerX < ladder.x + ladder.width &&
           feetY > ladder.y &&
           headY < ladder.y + ladder.height;
  }

  hit() {
    if (this.isInvincible) return false;

    this.lives--;
    this.isInvincible = true;
    this.invincibleTimer = this.invincibleDuration;
    return true;
  }

  reset(startX, startY) {
    this.x = startX;
    this.y = startY;
    this.velocityX = 0;
    this.velocityY = 0;
    this.isOnGround = false;
    this.isOnLadder = false;
  }
}

// Platform - solid ground the player can stand on
export class Platform extends Entity {
  constructor(x, y, width, height = 12) {
    super(x, y, width, height);
    this.color = '#8B4513'; // Brown
    this.topColor = '#A0522D'; // Lighter brown for top
  }
}

// Ladder - allows climbing between platforms
export class Ladder extends Entity {
  constructor(x, y, height) {
    super(x, y, 20, height);
    this.color = '#DAA520'; // Golden brown
  }
}

// Barrel - rolling obstacle
export class Barrel extends Entity {
  constructor(x, y, direction = 1) {
    super(x, y, 20, 20);
    this.velocityX = direction * 2;
    this.velocityY = 0;
    this.gravity = 0.4;
    this.color = '#8B4513';
    this.rimColor = '#D2691E';
    this.rotation = 0;
    this.rotationSpeed = 0.15;
    this.currentPlatform = null;
  }

  update(platforms, canvasWidth, canvasHeight) {
    // Apply gravity
    this.velocityY += this.gravity;
    if (this.velocityY > 8) this.velocityY = 8;

    // Move horizontally
    this.x += this.velocityX;

    // Rotation animation
    this.rotation += this.rotationSpeed * Math.sign(this.velocityX);

    // Check if still on current platform (for edge detection)
    if (this.currentPlatform && this.velocityY === 0) {
      const stillOnPlatform = this.x + this.width > this.currentPlatform.x &&
                              this.x < this.currentPlatform.x + this.currentPlatform.width;
      if (!stillOnPlatform) {
        // Fell off the edge - start falling and reverse direction for next platform
        this.currentPlatform = null;
        this.velocityX *= -1;
      }
    }

    // Move vertically
    this.y += this.velocityY;

    // Platform collisions - only check when falling
    if (this.velocityY > 0) {
      for (const platform of platforms) {
        if (this.collidesWith(platform)) {
          this.y = platform.y - this.height;
          this.velocityY = 0;
          this.currentPlatform = platform;
          break;
        }
      }
    }

    // Bounce off walls
    if (this.x < 0) {
      this.x = 0;
      this.velocityX *= -1;
    }
    if (this.x > canvasWidth - this.width) {
      this.x = canvasWidth - this.width;
      this.velocityX *= -1;
    }

    // Deactivate if fallen off bottom
    if (this.y > canvasHeight + 50) {
      this.active = false;
    }
  }
}

// Cow Boss - the end boss at the top
export class CowBoss extends Entity {
  constructor(x, y) {
    super(x, y, 60, 50);
    this.maxHealth = 5;
    this.health = this.maxHealth;
    this.bodyColor = '#FFFFFF';
    this.spotColor = '#2c2c2c';
    this.glowColor = '#FFD700';

    // Movement
    this.direction = 1;
    this.speed = 1;
    this.moveTimer = 0;
    this.throwTimer = 0;
    this.throwInterval = 120; // Frames between barrel throws

    // Animation
    this.animFrame = 0;
    this.tailWag = 0;

    // Bounds for movement
    this.minX = x - 50;
    this.maxX = x + 50;
  }

  update() {
    // Move side to side
    this.moveTimer++;
    if (this.moveTimer > 60) {
      this.x += this.direction * this.speed;

      if (this.x <= this.minX || this.x >= this.maxX) {
        this.direction *= -1;
      }
    }

    // Tail animation
    this.tailWag = Math.sin(Date.now() / 200) * 0.3;

    // Throw timer
    this.throwTimer++;
  }

  shouldThrowBarrel() {
    if (this.throwTimer >= this.throwInterval) {
      this.throwTimer = 0;
      return true;
    }
    return false;
  }

  takeDamage() {
    this.health--;
    if (this.health <= 0) {
      this.active = false;
      return true;
    }
    return false;
  }

  getBarrelSpawnPosition() {
    return {
      x: this.getCenterX() - 10,
      y: this.y + this.height
    };
  }
}

// Goal/Princess - what the player is trying to reach
export class Goal extends Entity {
  constructor(x, y) {
    super(x, y, 24, 32);
    this.color = '#FF69B4'; // Pink
    this.glowColor = '#FF1493';
    this.bobOffset = 0;
  }

  update() {
    // Bobbing animation
    this.bobOffset = Math.sin(Date.now() / 300) * 3;
  }
}

// Collectible item for bonus points
export class Collectible extends Entity {
  constructor(x, y, type = 'coin') {
    super(x, y, 16, 16);
    this.type = type;
    this.points = type === 'coin' ? 100 : 500;
    this.color = type === 'coin' ? '#FFD700' : '#FF6B6B';
    this.glowColor = this.color;
    this.bobOffset = 0;
  }

  update() {
    this.bobOffset = Math.sin(Date.now() / 200) * 2;
  }
}

// Particle for effects
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

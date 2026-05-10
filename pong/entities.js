/**
 * Pong - Entity Classes
 * Paddle, Ball, and Particle classes
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

  getCenterX() {
    return this.x + this.width / 2;
  }

  getCenterY() {
    return this.y + this.height / 2;
  }
}

// Paddle class - player or AI controlled
export class Paddle extends Entity {
  constructor(x, y, width, height, isPlayer = true) {
    super(x, y, width, height);
    this.isPlayer = isPlayer;
    this.speed = 8;
    this.color = isPlayer ? '#00ff88' : '#ff4444';
    this.glowColor = isPlayer ? 'rgba(0, 255, 136, 0.6)' : 'rgba(255, 68, 68, 0.6)';

    // AI properties
    this.aiSpeed = 5;
    this.aiReactionTime = 0;
    this.aiPredictionError = 50;
    this.targetY = y;
  }

  moveUp() {
    this.y = Math.max(0, this.y - this.speed);
  }

  moveDown(canvasHeight) {
    this.y = Math.min(canvasHeight - this.height, this.y + this.speed);
  }

  // AI movement - tries to track the ball
  updateAI(ball, canvasHeight) {
    if (this.isPlayer || !ball) return;

    // Only react when ball is moving toward AI (right side)
    if (ball.vx > 0) {
      // Predict where ball will be with some error
      const paddleCenter = this.y + this.height / 2;
      const predictedY = ball.y + ball.height / 2 + (Math.random() - 0.5) * this.aiPredictionError;
      const diff = predictedY - paddleCenter;

      // Dead zone to prevent jittering
      if (Math.abs(diff) > 15) {
        if (diff > 0) {
          this.y = Math.min(canvasHeight - this.height, this.y + this.aiSpeed);
        } else {
          this.y = Math.max(0, this.y - this.aiSpeed);
        }
      }
    } else {
      // When ball moving away, slowly return to center
      const center = canvasHeight / 2 - this.height / 2;
      const diff = center - this.y;
      if (Math.abs(diff) > 5) {
        this.y += Math.sign(diff) * 2;
      }
    }
  }

  // Set difficulty for AI
  setDifficulty(level) {
    // Level 1-10 scaling
    this.aiSpeed = 3 + level * 0.6; // 3.6 to 9
    this.aiPredictionError = Math.max(5, 80 - level * 8); // 72 down to 5
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
  }
}

// Ball class with physics
export class Ball extends Entity {
  constructor(x, y, size) {
    super(x, y, size, size);
    this.size = size;
    this.baseSpeed = 5;
    this.speed = this.baseSpeed;
    this.vx = 0;
    this.vy = 0;
    this.color = '#ffffff';
    this.glowColor = 'rgba(255, 255, 255, 0.6)';
    this.trail = [];
    this.maxTrailLength = 8;
    this.launched = false;
  }

  // Launch ball in a direction (-1 = left, 1 = right)
  launch(direction = 1) {
    const angle = (Math.random() - 0.5) * Math.PI / 3; // -30 to +30 degrees
    this.vx = Math.cos(angle) * this.speed * direction;
    this.vy = Math.sin(angle) * this.speed;
    this.launched = true;
  }

  update(canvasWidth, canvasHeight) {
    if (!this.launched) return null;

    // Store trail position
    this.trail.unshift({ x: this.x + this.width / 2, y: this.y + this.height / 2 });
    if (this.trail.length > this.maxTrailLength) {
      this.trail.pop();
    }

    // Move ball
    this.x += this.vx;
    this.y += this.vy;

    // Bounce off top and bottom walls
    if (this.y <= 0) {
      this.y = 0;
      this.vy = -this.vy;
      return 'wall';
    } else if (this.y + this.height >= canvasHeight) {
      this.y = canvasHeight - this.height;
      this.vy = -this.vy;
      return 'wall';
    }

    // Check if ball went off sides (scoring)
    if (this.x + this.width < 0) {
      return 'left'; // Ball went off left side - AI scores
    } else if (this.x > canvasWidth) {
      return 'right'; // Ball went off right side - Player scores
    }

    return null;
  }

  bounceOffPaddle(paddle) {
    // Calculate bounce angle based on where ball hit paddle
    const paddleCenter = paddle.y + paddle.height / 2;
    const ballCenter = this.y + this.height / 2;
    const relativeIntersect = (paddleCenter - ballCenter) / (paddle.height / 2);

    // Clamp to prevent extreme angles
    const normalizedIntersect = Math.max(-0.8, Math.min(0.8, relativeIntersect));

    // Calculate new angle (max ~70 degrees from horizontal)
    const bounceAngle = normalizedIntersect * (Math.PI / 2.5);

    // Direction: right if hit player paddle (left side), left if hit AI paddle (right side)
    const direction = paddle.isPlayer ? 1 : -1;

    // Set new velocity
    this.vx = Math.cos(bounceAngle) * this.speed * direction;
    this.vy = -Math.sin(bounceAngle) * this.speed;

    // Slightly increase speed with each paddle hit (up to a max)
    this.speed = Math.min(this.speed * 1.03, this.baseSpeed * 2);

    // Reposition ball to prevent multiple collisions
    if (paddle.isPlayer) {
      this.x = paddle.x + paddle.width + 1;
    } else {
      this.x = paddle.x - this.width - 1;
    }
  }

  setSpeed(speed) {
    this.baseSpeed = speed;
    this.speed = speed;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.speed = this.baseSpeed;
    this.trail = [];
    this.launched = false;
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
    const speed = 2 + Math.random() * 4;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.size = 2 + Math.random() * 4;
    this.life = 20 + Math.random() * 20;
    this.maxLife = this.life;
    this.active = true;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.98;
    this.vy *= 0.98;
    this.life--;

    if (this.life <= 0) {
      this.active = false;
    }
  }

  getAlpha() {
    return this.life / this.maxLife;
  }
}

// Create score particles
export function createScoreParticles(x, y, color, count = 12) {
  const particles = [];
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, color));
  }
  return particles;
}

// Create wall hit particles
export function createWallParticles(x, y, count = 5) {
  const particles = [];
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, '#4a9eff'));
  }
  return particles;
}

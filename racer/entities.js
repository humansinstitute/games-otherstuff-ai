/**
 * Micro Machines Style Racing - Entity Classes
 * Top-down car physics and track objects
 */

// Player car with top-down physics
export class PlayerCar {
  constructor(x = 0, y = 0, angle = 0) {
    // Position in world coordinates
    this.x = x;
    this.y = y;
    this.angle = angle; // Radians, 0 = facing right

    // Velocity
    this.vx = 0;
    this.vy = 0;
    this.speed = 0;
    this.angularVelocity = 0;

    // Car dimensions (pixels)
    this.width = 24;
    this.height = 14;

    // Physics properties
    this.maxSpeed = 250;
    this.acceleration = 400;
    this.brakeForce = 500;
    this.friction = 100;
    this.turnSpeed = 4.0;
    this.driftFactor = 0.94; // How much sideways velocity is preserved
    this.tractionFactor = 0.12; // How quickly car aligns to direction

    // Visual properties
    this.color = '#e74c3c';
    this.accentColor = '#c0392b';
    this.windowColor = '#3498db';
    this.wheelColor = '#2c3e50';
  }

  update(dt, input) {
    // Acceleration / Braking
    if (input.accelerate) {
      this.speed += this.acceleration * dt;
    } else if (input.brake) {
      this.speed -= this.brakeForce * dt;
    } else {
      // Natural friction
      if (this.speed > 0) {
        this.speed -= this.friction * dt;
        if (this.speed < 0) this.speed = 0;
      } else if (this.speed < 0) {
        this.speed += this.friction * dt;
        if (this.speed > 0) this.speed = 0;
      }
    }

    // Clamp speed
    this.speed = Math.max(-this.maxSpeed * 0.3, Math.min(this.speed, this.maxSpeed));

    // Steering (only when moving)
    const absSpeed = Math.abs(this.speed);
    if (absSpeed > 5) {
      const turnModifier = Math.min(1, absSpeed / 80);
      const reverseModifier = this.speed < 0 ? -1 : 1;

      if (input.left) {
        this.angle -= this.turnSpeed * turnModifier * reverseModifier * dt;
      }
      if (input.right) {
        this.angle += this.turnSpeed * turnModifier * reverseModifier * dt;
      }
    }

    // Direct movement based on speed and angle (simpler, faster feel)
    const moveX = Math.cos(this.angle) * this.speed * dt;
    const moveY = Math.sin(this.angle) * this.speed * dt;

    // Apply movement directly
    this.x += moveX;
    this.y += moveY;

    // Store velocity for particle effects
    this.vx = moveX / dt;
    this.vy = moveY / dt;
  }

  // Get corners of car for collision detection
  getCorners() {
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    const hw = this.width / 2;
    const hh = this.height / 2;

    return [
      { x: this.x + cos * hw - sin * hh, y: this.y + sin * hw + cos * hh },
      { x: this.x + cos * hw + sin * hh, y: this.y + sin * hw - cos * hh },
      { x: this.x - cos * hw + sin * hh, y: this.y - sin * hw - cos * hh },
      { x: this.x - cos * hw - sin * hh, y: this.y - sin * hw + cos * hh },
    ];
  }

  // Apply off-track penalty
  applyOffTrackPenalty() {
    this.speed *= 0.95;
    this.vx *= 0.95;
    this.vy *= 0.95;
  }

  // Reset position
  reset(x, y, angle) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.vx = 0;
    this.vy = 0;
    this.speed = 0;
  }
}

// Track waypoint for defining the racing line
export class Waypoint {
  constructor(x, y, width = 80) {
    this.x = x;
    this.y = y;
    this.width = width; // Track width at this point
  }
}

// Track segment between two waypoints
export class TrackSegment {
  constructor(start, end) {
    this.start = start;
    this.end = end;

    // Calculate segment properties
    this.dx = end.x - start.x;
    this.dy = end.y - start.y;
    this.length = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
    this.angle = Math.atan2(this.dy, this.dx);

    // Normal vector (perpendicular to segment)
    this.nx = -this.dy / this.length;
    this.ny = this.dx / this.length;
  }

  // Check if a point is within track bounds for this segment
  isPointOnTrack(x, y) {
    // Project point onto segment line
    const t = Math.max(0, Math.min(1,
      ((x - this.start.x) * this.dx + (y - this.start.y) * this.dy) / (this.length * this.length)
    ));

    // Closest point on segment
    const closestX = this.start.x + t * this.dx;
    const closestY = this.start.y + t * this.dy;

    // Distance from point to closest point on segment
    const dist = Math.sqrt((x - closestX) ** 2 + (y - closestY) ** 2);

    // Interpolate track width
    const width = this.start.width + t * (this.end.width - this.start.width);

    return dist <= width / 2;
  }

  // Get distance from centerline (negative = left, positive = right)
  getOffsetFromCenter(x, y) {
    const t = ((x - this.start.x) * this.dx + (y - this.start.y) * this.dy) / (this.length * this.length);

    if (t < 0 || t > 1) return null;

    const closestX = this.start.x + t * this.dx;
    const closestY = this.start.y + t * this.dy;

    // Signed distance using cross product
    const cross = (x - this.start.x) * this.ny - (y - this.start.y) * (-this.nx);
    return cross;
  }
}

// Scenery item for decoration
export class Scenery {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.angle = Math.random() * Math.PI * 2;

    switch (type) {
      case 'tree':
        this.radius = 15 + Math.random() * 10;
        this.color = '#228B22';
        this.trunkColor = '#8B4513';
        break;
      case 'bush':
        this.radius = 8 + Math.random() * 5;
        this.color = '#2E8B57';
        break;
      case 'rock':
        this.radius = 6 + Math.random() * 8;
        this.color = '#696969';
        break;
      case 'cone':
        this.radius = 5;
        this.color = '#FF6600';
        break;
      case 'tire':
        this.radius = 8;
        this.color = '#1a1a1a';
        break;
      default:
        this.radius = 10;
        this.color = '#888888';
    }
  }
}

// Checkpoint/finish line
export class Checkpoint {
  constructor(x, y, angle, width = 80, isFinish = false) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.width = width;
    this.isFinish = isFinish;
    this.passed = false;
  }

  // Check if car crossed this checkpoint
  checkCrossing(car, prevX, prevY) {
    // Line from prev position to current position
    const dx = car.x - prevX;
    const dy = car.y - prevY;

    // Checkpoint line perpendicular to angle
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    const hw = this.width / 2;

    // Checkpoint endpoints
    const x1 = this.x - sin * hw;
    const y1 = this.y + cos * hw;
    const x2 = this.x + sin * hw;
    const y2 = this.y - cos * hw;

    // Check line intersection
    const denom = dx * (y2 - y1) - dy * (x2 - x1);
    if (Math.abs(denom) < 0.0001) return false;

    const t = ((x1 - prevX) * (y2 - y1) - (y1 - prevY) * (x2 - x1)) / denom;
    const u = -((prevX - x1) * dy - (prevY - y1) * dx) / denom;

    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  reset() {
    this.passed = false;
  }
}

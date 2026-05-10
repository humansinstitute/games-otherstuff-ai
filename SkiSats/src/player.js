import { CONFIG } from './config.js';
import { isLeftPressed, isRightPressed, isTouchLeft, isTouchRight } from './input.js';

export class Player {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 0;
    this.distance = 0;
    this.speed = CONFIG.playerBaseSpeed;
    this.shrubCollisionCooldown = 0;
  }

  update(dt = 0) {
    this.speed = Math.min(this.speed + CONFIG.playerSpeedAcceleration * dt, CONFIG.playerMaxSpeed);
    this.distance += this.speed * dt;

    // Decrement shrub collision cooldown
    if (this.shrubCollisionCooldown > 0) {
      this.shrubCollisionCooldown -= dt;
    }

    let horizontalInput = 0;
    if (isLeftPressed() || isTouchLeft()) {
      horizontalInput -= 1;
    }
    if (isRightPressed() || isTouchRight()) {
      horizontalInput += 1;
    }

    if (horizontalInput !== 0) {
      this.x += horizontalInput * CONFIG.playerHorizontalSpeed * dt;
    }

    const halfSlope = CONFIG.slopeWidth / 2;
    this.x = Math.max(-halfSlope, Math.min(halfSlope, this.x));
  }

  render() {}
}

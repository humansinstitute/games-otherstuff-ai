import { CONFIG } from './config.js';
import { wasKeyPressed, wasTapped, isTouchDevice, isTouchLeft, isTouchRight } from './input.js';
import {
  resetWorld,
  updateWorld,
  checkPlayerObstacleCollision,
  checkPlayerShrubCollision,
  collectCoinsForPlayer,
  updateYeti,
  checkYetiCollision,
} from './world.js';
import {
  resetHUD,
  updateHUD,
  renderHUD,
  getElapsedTime,
  formatDistance,
  formatTime,
} from './hud.js';
import { soundManager } from './sound.js';

const { GAME_STATES } = CONFIG;

export class GameStateManager {
  constructor({ player, onCrash, onReset }) {
    this.player = player;
    this.currentState = GAME_STATES.MENU;
    this.currentSats = 0;
    this.lastRunStats = null;
    this.onCrash = onCrash;
    this.onReset = onReset;
    this.yetiDistance = null;
  }

  setState(newState) {
    this.currentState = newState;
  }

  startRun() {
    // Initialize sound on first interaction
    if (!soundManager.initialized) {
      soundManager.init();
    }

    this.player.reset();
    resetWorld(this.player.distance);
    resetHUD();
    this.currentSats = 0;
    this.lastRunStats = null;
    this.setState(GAME_STATES.PLAYING);
    // Reset player animation to normal
    if (this.onReset) {
      this.onReset();
    }

    // Start skiing swoosh sound
    soundManager.startSkiingSwoosh(this.player.speed);
  }

  handleGameOver() {
    this.lastRunStats = {
      distance: this.player.distance,
      time: getElapsedTime(),
      sats: this.currentSats,
    };
    this.setState(GAME_STATES.GAME_OVER);

    // Stop skiing sound and play crash
    soundManager.stopSkiingSwoosh();
    soundManager.playTreeCrash();

    // Trigger crash animation
    if (this.onCrash) {
      this.onCrash();
    }
  }

  handleYetiCatch() {
    this.lastRunStats = {
      distance: this.player.distance,
      time: getElapsedTime(),
      sats: this.currentSats,
    };
    this.setState(GAME_STATES.YETI_CAUGHT);

    // Stop skiing sound and play yeti catch
    soundManager.stopSkiingSwoosh();
    soundManager.playYetiCatch();

    // Don't trigger crash animation - different death
  }

  update(dt) {
    switch (this.currentState) {
      case GAME_STATES.MENU:
        if (wasKeyPressed('Enter') || wasTapped()) {
          this.startRun();
        }
        break;
      case GAME_STATES.PLAYING:
        this.player.update(dt);
        updateWorld(dt, this.player.distance);
        updateHUD(dt, this.player.distance, this.currentSats);

        // Update skiing swoosh based on speed
        soundManager.updateSkiingSwoosh(this.player.speed);

        // Update yeti
        updateYeti(dt, this.player, getElapsedTime());

        // Check yeti collision first
        if (checkYetiCollision(this.player)) {
          this.handleYetiCatch();
          break;
        }

        const collected = collectCoinsForPlayer(this.player);
        if (collected > 0) {
          this.currentSats += collected * CONFIG.coins.satsPerCoin;
          soundManager.playCoinCollect();
        }

        // Check shrub collisions - strict single shrub processing with cooldown
        if (this.player.shrubCollisionCooldown <= 0) {
          const collidedShrubs = checkPlayerShrubCollision(this.player);
          if (collidedShrubs.length > 0) {
            // Find the closest shrub
            let closestShrub = null;
            let minDistanceSquared = Infinity;

            collidedShrubs.forEach((shrub) => {
              const dx = shrub.x - this.player.x;
              const dy = shrub.y - this.player.distance;
              const distSquared = dx * dx + dy * dy;

              // Only consider shrubs within very close range (3 units)
              if (distSquared < 9 && distSquared < minDistanceSquared) {
                minDistanceSquared = distSquared;
                closestShrub = shrub;
              }
            });

            // Only process if we found a very close shrub
            if (closestShrub && !closestShrub.processed) {
              if (this.player.speed >= CONFIG.shrubs.fireSpeedThreshold) {
                // High speed - set shrub on fire
                closestShrub.isOnFire = true;
                soundManager.playShrubFire();
              } else {
                // Low speed - slow down player
                this.player.speed *= CONFIG.shrubs.speedSlowdown;
                soundManager.playShrubThud();
              }
              closestShrub.processed = true;
              // Set cooldown to prevent processing another shrub immediately
              this.player.shrubCollisionCooldown = 0.5;
            }
          }
        }

        if (checkPlayerObstacleCollision(this.player)) {
          this.handleGameOver();
        }
        break;
      case GAME_STATES.GAME_OVER:
        if (wasKeyPressed('Enter') || wasTapped()) {
          this.startRun();
        }
        break;
      case GAME_STATES.YETI_CAUGHT:
        if (wasKeyPressed('Enter') || wasTapped()) {
          this.startRun();
        }
        break;
      default:
        break;
    }
  }

  render(ctx, viewport) {
    switch (this.currentState) {
      case GAME_STATES.MENU:
        this.renderMenu(ctx, viewport);
        break;
      case GAME_STATES.PLAYING:
        this.renderPlaying(ctx, viewport);
        break;
      case GAME_STATES.GAME_OVER:
        this.renderGameOver(ctx, viewport);
        break;
      case GAME_STATES.YETI_CAUGHT:
        this.renderYetiGameOver(ctx, viewport);
        break;
      default:
        break;
    }
  }

  renderMenu(ctx, { width, height }) {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 42, 61, 0.85)';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';

    // Title with retro 8-bit font and text shadow for depth
    const titleSize = Math.max(32, Math.floor(width * 0.05));
    ctx.font = `${titleSize}px 'Press Start 2P', monospace`;

    // Add shadow effect
    ctx.shadowColor = 'rgba(255, 150, 0, 0.8)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = '#FFD700';
    ctx.fillText('SKISATS', width / 2, height / 2 - 20);

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Instructions with smaller retro font
    ctx.fillStyle = '#fff';
    const instructionSize = Math.max(12, Math.floor(width * 0.015));
    ctx.font = `${instructionSize}px 'Press Start 2P', monospace`;

    if (isTouchDevice()) {
      ctx.fillText('TAP TO START', width / 2, height / 2 + 55);
    } else {
      ctx.fillText('PRESS ENTER', width / 2, height / 2 + 40);
      ctx.fillText('TO START', width / 2, height / 2 + 70);
    }
    ctx.restore();
  }

  renderPlaying(ctx, { width, height }) {
    ctx.save();

    // Apply screen shake if yeti is close
    if (this.yetiDistance !== null && this.yetiDistance < 50) {
      const intensity = Math.max(0, 1 - this.yetiDistance / 50); // 0 to 1
      const shakeAmount = intensity * 8;
      const shakeX = (Math.random() - 0.5) * shakeAmount;
      const shakeY = (Math.random() - 0.5) * shakeAmount;
      ctx.translate(shakeX, shakeY);
    }

    // Render header title during gameplay
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const headerSize = Math.max(18, Math.floor(width * 0.025));
    ctx.font = `${headerSize}px 'Press Start 2P', monospace`;

    // Add glow effect to header
    ctx.shadowColor = 'rgba(255, 150, 0, 0.6)';
    ctx.shadowBlur = 10;
    ctx.fillText('SKISATS', width / 2, 20);

    ctx.restore();

    renderHUD(ctx, width, height, this.player.distance, this.currentSats);

    // Show touch control indicators on mobile
    if (isTouchDevice()) {
      this.renderTouchControls(ctx, width, height);
    }
  }

  renderTouchControls(ctx, width, height) {
    ctx.save();

    // Check if touch is active for visual feedback
    const touchingLeft = isTouchLeft();
    const touchingRight = isTouchRight();

    // Only show subtle hints, no overlays or divider line
    // Draw arrow indicators at bottom corners
    const arrowSize = Math.min(35, width * 0.06);
    const arrowY = height - 80;
    const arrowX = 60;

    // Left arrow - highlight if being touched
    ctx.fillStyle = touchingLeft ? 'rgba(255, 255, 0, 0.8)' : 'rgba(255, 255, 255, 0.25)';
    ctx.font = `${arrowSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u25C0', arrowX, arrowY);

    // Right arrow - highlight if being touched
    ctx.fillStyle = touchingRight ? 'rgba(255, 255, 0, 0.8)' : 'rgba(255, 255, 255, 0.25)';
    ctx.fillText('\u25B6', width - arrowX, arrowY);

    // Subtle instructions text
    const instructionSize = Math.max(8, Math.floor(width * 0.015));
    ctx.font = `${instructionSize}px 'Press Start 2P', monospace`;

    // Left text
    ctx.fillStyle = touchingLeft ? 'rgba(255, 255, 0, 0.8)' : 'rgba(255, 255, 255, 0.3)';
    ctx.fillText('HOLD', arrowX, arrowY + 35);

    // Right text
    ctx.fillStyle = touchingRight ? 'rgba(255, 255, 0, 0.8)' : 'rgba(255, 255, 255, 0.3)';
    ctx.fillText('HOLD', width - arrowX, arrowY + 35);

    ctx.restore();
  }

  renderGameOver(ctx, { width, height }) {
    const stats = this.lastRunStats || {
      distance: this.player.distance,
      time: getElapsedTime(),
      sats: this.currentSats,
    };

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, width, height);

    ctx.textAlign = 'center';

    // Game Over title with retro font
    ctx.font = '36px "Press Start 2P", monospace';
    ctx.fillStyle = '#FF4444';
    ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
    ctx.shadowBlur = 15;
    ctx.fillText('GAME OVER', width / 2, height / 2 - 100);

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Stats with retro font and colors
    ctx.font = '16px "Press Start 2P", monospace';

    ctx.fillStyle = '#00FF00';
    ctx.fillText(`DISTANCE: ${formatDistance(stats.distance)}`, width / 2, height / 2 - 20);

    ctx.fillStyle = '#00BFFF';
    ctx.fillText(`TIME: ${formatTime(stats.time)}`, width / 2, height / 2 + 20);

    ctx.fillStyle = '#FFD700';
    ctx.fillText(`SATS: ${stats.sats}`, width / 2, height / 2 + 60);

    // Restart instruction
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillStyle = '#fff';

    if (isTouchDevice()) {
      ctx.fillText('TAP TO RESTART', width / 2, height / 2 + 132);
    } else {
      ctx.fillText('PRESS ENTER', width / 2, height / 2 + 120);
      ctx.fillText('TO RESTART', width / 2, height / 2 + 145);
    }
    ctx.restore();
  }

  renderYetiGameOver(ctx, { width, height }) {
    const stats = this.lastRunStats || {
      distance: this.player.distance,
      time: getElapsedTime(),
      sats: this.currentSats,
    };

    ctx.save();
    ctx.fillStyle = 'rgba(20, 0, 0, 0.85)';  // Dark red tint
    ctx.fillRect(0, 0, width, height);

    ctx.textAlign = 'center';

    // Yeti caught message
    ctx.font = '28px "Press Start 2P", monospace';
    ctx.fillStyle = '#FF6666';
    ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
    ctx.shadowBlur = 20;
    ctx.fillText('CAUGHT BY', width / 2, height / 2 - 140);

    ctx.font = '40px "Press Start 2P", monospace';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('THE YETI!', width / 2, height / 2 - 90);

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Stats
    ctx.font = '16px "Press Start 2P", monospace';
    ctx.fillStyle = '#00FF00';
    ctx.fillText(`DISTANCE: ${formatDistance(stats.distance)}`, width / 2, height / 2);

    ctx.fillStyle = '#00BFFF';
    ctx.fillText(`TIME: ${formatTime(stats.time)}`, width / 2, height / 2 + 40);

    ctx.fillStyle = '#FFD700';
    ctx.fillText(`SATS: ${stats.sats}`, width / 2, height / 2 + 80);

    // Restart
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillStyle = '#fff';

    if (isTouchDevice()) {
      ctx.fillText('TAP TO RESTART', width / 2, height / 2 + 152);
    } else {
      ctx.fillText('PRESS ENTER', width / 2, height / 2 + 140);
      ctx.fillText('TO RESTART', width / 2, height / 2 + 165);
    }
    ctx.restore();
  }
}

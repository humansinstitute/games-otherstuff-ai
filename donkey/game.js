/**
 * Donkey Kong Style Platformer - Game Controller
 * State machine and main game loop
 */

import { Player, Barrel, createExplosion } from './entities.js';
import { createLevel, getTotalLevels, getLevelName } from './levels.js';
import { Renderer } from './renderer.js';

// Game states
export const GameState = {
  START_SCREEN: 'start',
  PLAYING: 'playing',
  LEVEL_TRANSITION: 'level_transition',
  LEVEL_COMPLETE: 'level_complete',
  GAME_OVER: 'game_over',
  VICTORY: 'victory',
  PAUSED: 'paused'
};

const STORAGE_KEY = 'cowkeyKong.best';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.renderer = new Renderer(canvas);

    // State
    this.state = GameState.START_SCREEN;
    this.stateTimer = 0;

    // Game entities
    this.player = null;
    this.platforms = [];
    this.ladders = [];
    this.barrels = [];
    this.boss = null;
    this.goal = null;
    this.collectibles = [];
    this.particles = [];

    // Progress
    this.score = 0;
    this.bestScore = parseInt(localStorage.getItem(STORAGE_KEY) || '0');
    this.currentLevel = 0;

    // Input state
    this.input = { left: false, right: false, up: false, down: false, jump: false };

    // Timing
    this.lastTime = 0;
    this.running = false;

    // Barrel spawn timer
    this.barrelTimer = 0;
    this.barrelInterval = 150;

    // Callbacks for UI
    this.onStateChange = null;
    this.onScoreChange = null;
  }

  setState(newState, data = {}) {
    const oldState = this.state;
    this.state = newState;
    this.stateTimer = 0;

    if (this.onStateChange) {
      this.onStateChange(newState, oldState, data);
    }

    this.onStateEnter(newState, data);
  }

  onStateEnter(state, data) {
    switch (state) {
      case GameState.PLAYING:
        if (data.newLevel !== false) {
          this.loadLevel(this.currentLevel);
        }
        break;

      case GameState.LEVEL_TRANSITION:
        this.stateTimer = 90; // 1.5 seconds
        break;

      case GameState.LEVEL_COMPLETE:
        this.stateTimer = 120; // 2 seconds
        break;

      case GameState.GAME_OVER:
        this.saveBestScore();
        break;

      case GameState.VICTORY:
        this.saveBestScore();
        break;
    }
  }

  start() {
    // Reset game state
    this.score = 0;
    this.currentLevel = 0;

    // Create player
    this.player = new Player(this.canvas.width, this.canvas.height);

    // Clear entities
    this.barrels = [];
    this.particles = [];

    // Load first level
    this.loadLevel(0);

    // Start the game
    this.setState(GameState.PLAYING);

    if (!this.running) {
      this.running = true;
      this.lastTime = performance.now();
      requestAnimationFrame((t) => this.gameLoop(t));
    }
  }

  loadLevel(levelIndex) {
    const level = createLevel(levelIndex, this.canvas.width, this.canvas.height);

    if (!level) {
      console.error('Failed to load level:', levelIndex);
      return;
    }

    this.platforms = level.platforms;
    this.ladders = level.ladders;
    this.boss = level.boss;
    this.goal = level.goal;
    this.collectibles = level.collectibles;
    this.barrels = [];
    this.barrelInterval = level.barrelInterval;
    this.barrelTimer = 0;

    // Position player at start
    this.player.reset(level.playerStart.x, level.playerStart.y);
    this.player.velocityY = 0;
    this.player.isOnGround = false;
  }

  gameLoop(timestamp) {
    if (!this.running) return;

    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;

    this.update(deltaTime);
    this.render();

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  update(deltaTime) {
    // Always update particles
    this.updateParticles();

    switch (this.state) {
      case GameState.PLAYING:
        this.updatePlaying();
        break;

      case GameState.LEVEL_TRANSITION:
        this.stateTimer--;
        if (this.stateTimer <= 0) {
          this.setState(GameState.PLAYING);
        }
        break;

      case GameState.LEVEL_COMPLETE:
        this.stateTimer--;
        if (this.stateTimer <= 0) {
          this.advanceLevel();
        }
        break;

      case GameState.GAME_OVER:
      case GameState.VICTORY:
        // Just render, wait for user input
        break;
    }
  }

  updatePlaying() {
    // Update player
    this.player.update(this.input, this.platforms, this.ladders);

    // Update boss
    if (this.boss && this.boss.active) {
      this.boss.update();

      // Boss throws barrels
      if (this.boss.shouldThrowBarrel()) {
        this.spawnBarrel();
      }
    }

    // Update barrels
    this.updateBarrels();

    // Update goal animation
    if (this.goal) {
      this.goal.update();
    }

    // Update collectibles animation
    for (const collectible of this.collectibles) {
      if (collectible.active) {
        collectible.update();
      }
    }

    // Check collisions
    this.checkCollisions();

    // Check if player reached goal
    if (this.goal && this.player.collidesWith(this.goal)) {
      this.addScore(200); // Level completion bonus
      this.setState(GameState.LEVEL_COMPLETE);
    }

    // Check if player fell off bottom (should not happen with ground platform)
    if (this.player.y > this.canvas.height) {
      this.playerDied();
    }
  }

  spawnBarrel() {
    if (!this.boss) return;

    const pos = this.boss.getBarrelSpawnPosition();
    const direction = Math.random() < 0.5 ? -1 : 1;
    const barrel = new Barrel(pos.x, pos.y, direction);
    this.barrels.push(barrel);
  }

  updateBarrels() {
    for (const barrel of this.barrels) {
      if (barrel.active) {
        barrel.update(this.platforms, this.canvas.width, this.canvas.height);
      }
    }

    // Remove inactive barrels
    this.barrels = this.barrels.filter(b => b.active);
  }

  updateParticles() {
    for (const p of this.particles) {
      p.update();
    }
    this.particles = this.particles.filter(p => p.active);
  }

  checkCollisions() {
    // Player vs barrels
    for (const barrel of this.barrels) {
      if (!barrel.active) continue;

      if (this.player.collidesWith(barrel)) {
        // Check if player is jumping on barrel (from above)
        if (this.player.velocityY > 0 &&
            this.player.y + this.player.height - 10 < barrel.y) {
          // Jumped on barrel - destroy it and bounce
          barrel.active = false;
          this.player.velocityY = this.player.jumpPower * 0.7;
          this.addScore(50);
          this.particles.push(...createExplosion(
            barrel.getCenterX(),
            barrel.getCenterY(),
            barrel.color
          ));
        } else {
          // Hit by barrel
          this.playerHit();
        }
      }
    }

    // Player vs collectibles
    for (const collectible of this.collectibles) {
      if (!collectible.active) continue;

      if (this.player.collidesWith(collectible)) {
        collectible.active = false;
        this.addScore(collectible.points);
        this.particles.push(...createExplosion(
          collectible.getCenterX(),
          collectible.getCenterY(),
          collectible.color,
          6
        ));
      }
    }
  }

  playerHit() {
    const wasHit = this.player.hit();

    if (wasHit) {
      this.particles.push(...createExplosion(
        this.player.getCenterX(),
        this.player.getCenterY(),
        '#ff8c00'
      ));

      if (this.player.lives <= 0) {
        this.playerDied();
      } else {
        // Reset player position
        const level = createLevel(this.currentLevel, this.canvas.width, this.canvas.height);
        this.player.reset(level.playerStart.x, level.playerStart.y);
      }
    }
  }

  playerDied() {
    this.setState(GameState.GAME_OVER);
  }

  advanceLevel() {
    this.currentLevel++;

    if (this.currentLevel >= getTotalLevels()) {
      // All levels complete!
      this.setState(GameState.VICTORY);
    } else {
      // Start next level
      this.setState(GameState.LEVEL_TRANSITION, { newLevel: true });
    }
  }

  addScore(points) {
    this.score += points;
    if (this.onScoreChange) {
      this.onScoreChange(this.score);
    }
  }

  saveBestScore() {
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem(STORAGE_KEY, this.bestScore.toString());
    }
  }

  render() {
    const r = this.renderer;

    // Clear and draw background
    r.clear();
    r.drawBackground();

    // Draw game entities based on state
    switch (this.state) {
      case GameState.START_SCREEN:
        // Just background, UI handles the rest
        break;

      case GameState.PLAYING:
        r.drawLadders(this.ladders);
        r.drawPlatforms(this.platforms);
        r.drawCollectibles(this.collectibles);
        r.drawGoal(this.goal);
        r.drawBoss(this.boss);
        for (const barrel of this.barrels) {
          r.drawBarrel(barrel);
        }
        r.drawPlayer(this.player);
        r.drawParticles(this.particles);
        r.drawHUD(this.score, this.player.lives, this.currentLevel, this.bestScore);
        break;

      case GameState.LEVEL_TRANSITION:
        r.drawLadders(this.ladders);
        r.drawPlatforms(this.platforms);
        r.drawGoal(this.goal);
        r.drawBoss(this.boss);
        r.drawPlayer(this.player);
        r.drawHUD(this.score, this.player.lives, this.currentLevel, this.bestScore);
        r.drawLevelTransition(getLevelName(this.currentLevel), this.stateTimer / 90);
        break;

      case GameState.LEVEL_COMPLETE:
        r.drawParticles(this.particles);
        r.drawLevelComplete(getLevelName(this.currentLevel), this.score);
        break;

      case GameState.GAME_OVER:
        r.drawParticles(this.particles);
        r.drawGameOver(this.score, this.bestScore);
        break;

      case GameState.VICTORY:
        r.drawParticles(this.particles);
        r.drawVictory(this.score);
        break;
    }
  }

  // Input methods (called from index.html)
  setInput(key, value) {
    this.input[key] = value;
  }

  restart() {
    this.start();
  }

  isGameOver() {
    return this.state === GameState.GAME_OVER;
  }

  isVictory() {
    return this.state === GameState.VICTORY;
  }

  isStartScreen() {
    return this.state === GameState.START_SCREEN;
  }
}

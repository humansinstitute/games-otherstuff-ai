/**
 * Space Invaders - Game Controller
 * State machine and main game loop
 */

import { Player, createShield, createExplosion } from './entities.js';
import { STAGES, generateWaveEnemies, createBoss, getTotalStages } from './levels.js';
import { Renderer } from './renderer.js';

// Game states
export const GameState = {
  START_SCREEN: 'start',
  PLAYING: 'playing',
  WAVE_TRANSITION: 'wave_transition',
  BOSS_INTRO: 'boss_intro',
  BOSS_FIGHT: 'boss_fight',
  STAGE_COMPLETE: 'stage_complete',
  GAME_OVER: 'game_over',
  VICTORY: 'victory',
  PAUSED: 'paused'
};

const STORAGE_KEY = 'spaceInvaders.best';

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
    this.enemies = [];
    this.bullets = [];
    this.shields = [];
    this.boss = null;
    this.particles = [];

    // Progress
    this.score = 0;
    this.bestScore = parseInt(localStorage.getItem(STORAGE_KEY) || '0');
    this.currentStage = 0;
    this.currentWave = 0;

    // Enemy movement
    this.enemyDirection = 1;
    this.enemyMoveTimer = 0;
    this.enemyMoveInterval = 60; // frames between moves
    this.enemySpeed = 1;
    this.enemyDropDistance = 15;

    // Input state (continuous)
    this.input = { left: false, right: false, shoot: false };

    // Timing
    this.lastTime = 0;
    this.running = false;

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
        if (data.newWave !== false) {
          this.spawnWave();
        }
        break;

      case GameState.WAVE_TRANSITION:
        this.stateTimer = 90; // 1.5 seconds
        break;

      case GameState.BOSS_INTRO:
        this.stateTimer = 120; // 2 seconds
        this.spawnBoss();
        break;

      case GameState.STAGE_COMPLETE:
        this.stateTimer = 150; // 2.5 seconds
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
    this.currentStage = 0;
    this.currentWave = 0;

    // Create player
    this.player = new Player(this.canvas.width, this.canvas.height);

    // Clear entities
    this.enemies = [];
    this.bullets = [];
    this.boss = null;
    this.particles = [];

    // Spawn shields
    this.spawnShields();

    // Start the game
    this.setState(GameState.PLAYING);

    if (!this.running) {
      this.running = true;
      this.lastTime = performance.now();
      requestAnimationFrame((t) => this.gameLoop(t));
    }
  }

  spawnWave() {
    const stage = STAGES[this.currentStage];
    const waveConfig = stage.waves[this.currentWave];

    this.enemies = generateWaveEnemies(waveConfig, this.canvas.width);
    this.enemySpeed = waveConfig.speed;
    this.enemyDropDistance = waveConfig.dropDistance;
    this.enemyMoveInterval = Math.max(20, 60 - this.currentStage * 5 - this.currentWave * 3);
    this.enemyDirection = 1;
    this.enemyMoveTimer = 0;
  }

  spawnBoss() {
    const stage = STAGES[this.currentStage];
    this.boss = createBoss(stage.boss, this.canvas.width);
    this.enemies = [];
  }

  spawnShields() {
    const stage = STAGES[this.currentStage];
    const shieldCount = stage ? stage.shieldCount : 4;

    this.shields = [];
    const spacing = this.canvas.width / (shieldCount + 1);

    for (let i = 0; i < shieldCount; i++) {
      const x = spacing * (i + 1) - 24; // Center each shield
      const y = this.canvas.height - 120;
      const blocks = createShield(x, y);
      this.shields.push(...blocks);
    }
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

      case GameState.WAVE_TRANSITION:
        this.stateTimer--;
        if (this.stateTimer <= 0) {
          this.advanceWave();
        }
        break;

      case GameState.BOSS_INTRO:
        this.stateTimer--;
        if (this.stateTimer <= 0) {
          this.setState(GameState.BOSS_FIGHT, { newWave: false });
        }
        break;

      case GameState.BOSS_FIGHT:
        this.updateBossFight();
        break;

      case GameState.STAGE_COMPLETE:
        this.stateTimer--;
        if (this.stateTimer <= 0) {
          this.advanceStage();
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
    this.player.update(this.input);

    // Player shooting
    if (this.input.shoot) {
      const bullet = this.player.shoot();
      if (bullet) {
        this.bullets.push(bullet);
      }
    }

    // Update bullets
    this.updateBullets();

    // Update enemies
    this.updateEnemies();

    // Enemy shooting
    this.enemyShoot();

    // Check collisions
    this.checkCollisions();

    // Check wave complete
    if (this.enemies.filter(e => e.active).length === 0) {
      this.setState(GameState.WAVE_TRANSITION);
    }
  }

  updateBossFight() {
    // Update player
    this.player.update(this.input);

    // Player shooting
    if (this.input.shoot) {
      const bullet = this.player.shoot();
      if (bullet) {
        this.bullets.push(bullet);
      }
    }

    // Update bullets
    this.updateBullets();

    // Update boss
    if (this.boss && this.boss.active) {
      this.boss.update();

      // Boss attacks
      const attacks = this.boss.getAttack();
      this.bullets.push(...attacks);
    }

    // Check collisions
    this.checkBossCollisions();

    // Check boss defeated
    if (this.boss && !this.boss.active) {
      this.addScore(500); // Boss bonus
      this.particles.push(...createExplosion(
        this.boss.getCenterX(),
        this.boss.getCenterY(),
        this.boss.color,
        20
      ));
      this.boss = null;
      this.setState(GameState.STAGE_COMPLETE);
    }
  }

  updateEnemies() {
    this.enemyMoveTimer++;

    if (this.enemyMoveTimer >= this.enemyMoveInterval) {
      this.enemyMoveTimer = 0;

      // Check if any enemy hit the edge
      let hitEdge = false;
      for (const enemy of this.enemies) {
        if (!enemy.active) continue;

        const nextX = enemy.x + this.enemyDirection * 10 * this.enemySpeed;
        if (nextX <= 5 || nextX + enemy.width >= this.canvas.width - 5) {
          hitEdge = true;
          break;
        }
      }

      // Move enemies
      for (const enemy of this.enemies) {
        if (!enemy.active) continue;

        if (hitEdge) {
          enemy.moveDown(this.enemyDropDistance);
        } else {
          enemy.update(this.enemyDirection, 10 * this.enemySpeed);
        }
      }

      // Reverse direction if hit edge
      if (hitEdge) {
        this.enemyDirection *= -1;
      }

      // Speed up as enemies are destroyed
      const activeCount = this.enemies.filter(e => e.active).length;
      const totalCount = this.enemies.length;
      if (activeCount > 0) {
        const speedMultiplier = 1 + (1 - activeCount / totalCount) * 2;
        this.enemyMoveInterval = Math.max(10, 60 / speedMultiplier);
      }
    }

    // Check if enemies reached bottom
    for (const enemy of this.enemies) {
      if (enemy.active && enemy.y + enemy.height >= this.player.y - 10) {
        this.setState(GameState.GAME_OVER);
        return;
      }
    }
  }

  enemyShoot() {
    // Only bottom-most enemies in each column can shoot
    const activeEnemies = this.enemies.filter(e => e.active);
    const bottomEnemies = [];

    // Group by approximate x position
    const columns = {};
    for (const enemy of activeEnemies) {
      const col = Math.floor(enemy.x / 30);
      if (!columns[col] || enemy.y > columns[col].y) {
        columns[col] = enemy;
      }
    }

    for (const col in columns) {
      const enemy = columns[col];
      if (enemy.shouldShoot()) {
        this.bullets.push(enemy.shoot());
      }
    }
  }

  updateBullets() {
    for (const bullet of this.bullets) {
      bullet.update(this.canvas.height);
    }

    // Remove inactive bullets
    this.bullets = this.bullets.filter(b => b.active);
  }

  updateParticles() {
    for (const p of this.particles) {
      p.update();
    }
    this.particles = this.particles.filter(p => p.active);
  }

  checkCollisions() {
    // Player bullets vs enemies
    for (const bullet of this.bullets) {
      if (!bullet.isPlayerBullet || !bullet.active) continue;

      for (const enemy of this.enemies) {
        if (!enemy.active) continue;

        if (bullet.collidesWith(enemy)) {
          bullet.active = false;
          const destroyed = enemy.takeDamage(bullet.damage);

          if (destroyed) {
            this.addScore(enemy.points);
            this.particles.push(...createExplosion(
              enemy.getCenterX(),
              enemy.getCenterY(),
              enemy.color
            ));
          }
          break;
        }
      }
    }

    // Enemy bullets vs player
    for (const bullet of this.bullets) {
      if (bullet.isPlayerBullet || !bullet.active) continue;

      if (bullet.collidesWith(this.player)) {
        bullet.active = false;
        const wasHit = this.player.hit();

        if (wasHit) {
          this.particles.push(...createExplosion(
            this.player.getCenterX(),
            this.player.getCenterY(),
            '#ff8c00'
          ));

          if (this.player.lives <= 0) {
            this.setState(GameState.GAME_OVER);
            return;
          }
        }
      }
    }

    // Bullets vs shields
    for (const bullet of this.bullets) {
      if (!bullet.active) continue;

      for (const block of this.shields) {
        if (!block.active) continue;

        if (bullet.collidesWith(block)) {
          bullet.active = false;
          block.takeDamage();
          break;
        }
      }
    }

    // Enemies vs shields (aliens destroy shields on contact)
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;

      for (const block of this.shields) {
        if (!block.active) continue;

        if (enemy.collidesWith(block)) {
          block.active = false;
        }
      }
    }
  }

  checkBossCollisions() {
    // Player bullets vs boss
    for (const bullet of this.bullets) {
      if (!bullet.isPlayerBullet || !bullet.active) continue;

      if (this.boss && this.boss.active && bullet.collidesWith(this.boss)) {
        bullet.active = false;
        this.boss.takeDamage(bullet.damage);
        this.addScore(5); // Small points for hitting boss
      }
    }

    // Boss bullets vs player
    for (const bullet of this.bullets) {
      if (bullet.isPlayerBullet || !bullet.active) continue;

      if (bullet.collidesWith(this.player)) {
        bullet.active = false;
        const wasHit = this.player.hit();

        if (wasHit) {
          this.particles.push(...createExplosion(
            this.player.getCenterX(),
            this.player.getCenterY(),
            '#ff8c00'
          ));

          if (this.player.lives <= 0) {
            this.setState(GameState.GAME_OVER);
            return;
          }
        }
      }
    }

    // Bullets vs shields
    for (const bullet of this.bullets) {
      if (!bullet.active) continue;

      for (const block of this.shields) {
        if (!block.active) continue;

        if (bullet.collidesWith(block)) {
          bullet.active = false;
          block.takeDamage();
          break;
        }
      }
    }
  }

  advanceWave() {
    const stage = STAGES[this.currentStage];

    this.currentWave++;

    if (this.currentWave >= stage.waves.length) {
      // All waves complete, boss time!
      this.setState(GameState.BOSS_INTRO);
    } else {
      this.setState(GameState.PLAYING);
    }
  }

  advanceStage() {
    this.currentStage++;

    if (this.currentStage >= getTotalStages()) {
      // All stages complete!
      this.setState(GameState.VICTORY);
    } else {
      // Start next stage
      this.currentWave = 0;
      this.spawnShields();
      this.setState(GameState.PLAYING);
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
    r.drawGrid();
    r.drawStarfield();

    // Draw game entities based on state
    switch (this.state) {
      case GameState.START_SCREEN:
        // Just background, UI handles the rest
        break;

      case GameState.PLAYING:
        r.drawShields(this.shields);
        for (const enemy of this.enemies) {
          r.drawEnemy(enemy);
        }
        for (const bullet of this.bullets) {
          r.drawBullet(bullet);
        }
        r.drawPlayer(this.player);
        r.drawParticles(this.particles);
        r.drawHUD(this.score, this.player.lives, this.currentStage, this.currentWave, this.bestScore);
        break;

      case GameState.WAVE_TRANSITION:
        r.drawShields(this.shields);
        r.drawPlayer(this.player);
        r.drawParticles(this.particles);
        r.drawHUD(this.score, this.player.lives, this.currentStage, this.currentWave, this.bestScore);

        const stage = STAGES[this.currentStage];
        const nextWave = this.currentWave + 1;
        const text = nextWave >= stage.waves.length
          ? 'BOSS INCOMING!'
          : `WAVE ${nextWave + 1}`;
        r.drawWaveTransition(text, this.stateTimer / 90);
        break;

      case GameState.BOSS_INTRO:
        r.drawShields(this.shields);
        r.drawPlayer(this.player);
        r.drawBossIntro(this.boss.name, this.stateTimer);
        break;

      case GameState.BOSS_FIGHT:
        r.drawShields(this.shields);
        if (this.boss) {
          r.drawBoss(this.boss);
        }
        for (const bullet of this.bullets) {
          r.drawBullet(bullet);
        }
        r.drawPlayer(this.player);
        r.drawParticles(this.particles);
        r.drawHUD(this.score, this.player.lives, this.currentStage, this.currentWave, this.bestScore);
        break;

      case GameState.STAGE_COMPLETE:
        r.drawParticles(this.particles);
        r.drawStageComplete(STAGES[this.currentStage].name, this.score);
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

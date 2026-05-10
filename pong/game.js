/**
 * Pong - Game Controller
 * State machine and main game loop
 */

import { Paddle, Ball, createScoreParticles, createWallParticles } from './entities.js';
import { LEVELS, getLevel, getTotalLevels, calculateScorePoints, getLevelBonus } from './levels.js';
import { Renderer } from './renderer.js';

// Game states
export const GameState = {
  START_SCREEN: 'start',
  PLAYING: 'playing',
  POINT_SCORED: 'point_scored',
  LEVEL_COMPLETE: 'level_complete',
  GAME_OVER: 'game_over',
  VICTORY: 'victory',
  PAUSED: 'paused'
};

const STORAGE_KEY = 'pong.best';
const PADDLE_WIDTH = 12;
const PADDLE_MARGIN = 20;
const BALL_SIZE = 12;

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.renderer = new Renderer(canvas);

    // State
    this.state = GameState.START_SCREEN;
    this.stateTimer = 0;

    // Game entities
    this.playerPaddle = null;
    this.aiPaddle = null;
    this.ball = null;
    this.particles = [];

    // Scores
    this.score = 0; // Total game score
    this.bestScore = parseInt(localStorage.getItem(STORAGE_KEY) || '0');
    this.playerPoints = 0; // Points in current level
    this.aiPoints = 0; // AI points in current level
    this.currentLevel = 0;
    this.pointsToWin = 3;

    // Track who scored last for ball direction
    this.lastScorer = 'player';

    // Input state
    this.input = { up: false, down: false };

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
        // Reset ball position and launch
        if (data.resetBall !== false) {
          this.resetBall();
          // Short delay before launching
          setTimeout(() => {
            if (this.state === GameState.PLAYING && this.ball) {
              // Ball goes toward whoever scored last (they "serve")
              this.ball.launch(this.lastScorer === 'ai' ? 1 : -1);
            }
          }, 500);
        }
        break;

      case GameState.POINT_SCORED:
        this.stateTimer = 60; // 1 second pause
        break;

      case GameState.LEVEL_COMPLETE:
        this.stateTimer = 120; // 2 seconds
        // Add level bonus to score
        const bonus = getLevelBonus(this.currentLevel);
        this.addScore(bonus);
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
    this.playerPoints = 0;
    this.aiPoints = 0;
    this.lastScorer = 'player';
    this.particles = [];

    // Setup level
    this.setupLevel();

    // Start the game
    this.setState(GameState.PLAYING);

    if (!this.running) {
      this.running = true;
      this.lastTime = performance.now();
      requestAnimationFrame((t) => this.gameLoop(t));
    }
  }

  setupLevel() {
    const level = getLevel(this.currentLevel);
    if (!level) return;

    this.pointsToWin = level.pointsToWin;

    // Create paddles
    const centerY = this.canvas.height / 2;

    this.playerPaddle = new Paddle(
      PADDLE_MARGIN,
      centerY - level.playerPaddleHeight / 2,
      PADDLE_WIDTH,
      level.playerPaddleHeight,
      true
    );

    this.aiPaddle = new Paddle(
      this.canvas.width - PADDLE_MARGIN - PADDLE_WIDTH,
      centerY - level.aiPaddleHeight / 2,
      PADDLE_WIDTH,
      level.aiPaddleHeight,
      false
    );

    // Set AI difficulty
    this.aiPaddle.aiSpeed = level.aiSpeed;
    this.aiPaddle.aiPredictionError = level.aiError;

    // Create ball
    this.ball = new Ball(
      this.canvas.width / 2 - BALL_SIZE / 2,
      this.canvas.height / 2 - BALL_SIZE / 2,
      BALL_SIZE
    );
    this.ball.setSpeed(level.ballSpeed);

    // Reset level points
    this.playerPoints = 0;
    this.aiPoints = 0;
  }

  resetBall() {
    if (!this.ball) return;

    this.ball.reset(
      this.canvas.width / 2 - BALL_SIZE / 2,
      this.canvas.height / 2 - BALL_SIZE / 2
    );

    // Reset paddles to center
    const level = getLevel(this.currentLevel);
    if (level) {
      this.playerPaddle.y = this.canvas.height / 2 - level.playerPaddleHeight / 2;
      this.aiPaddle.y = this.canvas.height / 2 - level.aiPaddleHeight / 2;
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

      case GameState.POINT_SCORED:
        this.stateTimer--;
        if (this.stateTimer <= 0) {
          // Check for level completion
          if (this.playerPoints >= this.pointsToWin) {
            this.setState(GameState.LEVEL_COMPLETE);
          } else if (this.aiPoints >= this.pointsToWin) {
            this.setState(GameState.GAME_OVER);
          } else {
            this.setState(GameState.PLAYING);
          }
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
        // Wait for user input
        break;
    }
  }

  updatePlaying() {
    // Update player paddle
    if (this.input.up) {
      this.playerPaddle.moveUp();
    }
    if (this.input.down) {
      this.playerPaddle.moveDown(this.canvas.height);
    }

    // Update AI paddle
    this.aiPaddle.updateAI(this.ball, this.canvas.height);

    // Update ball
    const ballResult = this.ball.update(this.canvas.width, this.canvas.height);

    if (ballResult === 'wall') {
      // Wall bounce particles
      this.particles.push(...createWallParticles(
        this.ball.x + this.ball.width / 2,
        this.ball.y < 10 ? 0 : this.canvas.height
      ));
    } else if (ballResult === 'left') {
      // AI scored (ball went off player's side)
      this.aiPoints++;
      this.lastScorer = 'ai';
      this.particles.push(...createScoreParticles(
        this.ball.x,
        this.ball.y + this.ball.height / 2,
        '#ff4444'
      ));
      this.setState(GameState.POINT_SCORED, { scorer: 'ai' });
      return;
    } else if (ballResult === 'right') {
      // Player scored (ball went off AI's side)
      this.playerPoints++;
      this.lastScorer = 'player';
      const points = calculateScorePoints(this.currentLevel);
      this.addScore(points);
      this.particles.push(...createScoreParticles(
        this.ball.x,
        this.ball.y + this.ball.height / 2,
        '#00ff88'
      ));
      this.setState(GameState.POINT_SCORED, { scorer: 'player' });
      return;
    }

    // Check paddle collisions
    this.checkPaddleCollisions();
  }

  checkPaddleCollisions() {
    // Player paddle collision
    if (this.ball.vx < 0 && this.ball.collidesWith(this.playerPaddle)) {
      this.ball.bounceOffPaddle(this.playerPaddle);
      this.particles.push(...createWallParticles(
        this.playerPaddle.x + this.playerPaddle.width,
        this.ball.y + this.ball.height / 2
      ));
    }

    // AI paddle collision
    if (this.ball.vx > 0 && this.ball.collidesWith(this.aiPaddle)) {
      this.ball.bounceOffPaddle(this.aiPaddle);
      this.particles.push(...createWallParticles(
        this.aiPaddle.x,
        this.ball.y + this.ball.height / 2
      ));
    }
  }

  updateParticles() {
    for (const p of this.particles) {
      p.update();
    }
    this.particles = this.particles.filter(p => p.active);
  }

  advanceLevel() {
    this.currentLevel++;

    if (this.currentLevel >= getTotalLevels()) {
      // All levels complete!
      this.setState(GameState.VICTORY);
    } else {
      // Setup next level
      this.setupLevel();
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
    r.drawCenterLine();

    // Draw based on state
    switch (this.state) {
      case GameState.START_SCREEN:
        // Just background, UI handles the rest
        break;

      case GameState.PLAYING:
      case GameState.POINT_SCORED:
        r.drawPaddle(this.playerPaddle);
        r.drawPaddle(this.aiPaddle);
        r.drawBall(this.ball);
        r.drawParticles(this.particles);
        r.drawHUD(
          this.score,
          this.playerPoints,
          this.aiPoints,
          this.currentLevel,
          this.pointsToWin,
          this.bestScore
        );

        if (this.state === GameState.POINT_SCORED) {
          // Show who scored
          const level = getLevel(this.currentLevel);
          r.drawPointScored(this.lastScorer, level ? level.name : '');
        }
        break;

      case GameState.LEVEL_COMPLETE:
        r.drawPaddle(this.playerPaddle);
        r.drawPaddle(this.aiPaddle);
        r.drawParticles(this.particles);
        const level = getLevel(this.currentLevel);
        r.drawLevelComplete(level ? level.name : '', this.score);
        break;

      case GameState.GAME_OVER:
        r.drawParticles(this.particles);
        r.drawGameOver(this.score, this.bestScore, this.currentLevel + 1);
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

  getCurrentLevelName() {
    const level = getLevel(this.currentLevel);
    return level ? level.name : '';
  }
}

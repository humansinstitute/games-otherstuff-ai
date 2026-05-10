/**
 * Tron Bike - Game Controller
 * Two bikes racing, leaving light trails
 * Features level progression with increasing difficulty
 */

import { Renderer } from './renderer.js';

// Direction constants
export const Direction = {
  UP: 0,
  RIGHT: 1,
  DOWN: 2,
  LEFT: 3
};

// Game states
export const GameState = {
  START_SCREEN: 'start',
  PLAYING: 'playing',
  GAME_OVER: 'game_over',
  VICTORY: 'victory',
  COUNTDOWN: 'countdown',
  LEVEL_UP: 'level_up'
};

// Level definitions
export const LEVELS = [
  {
    name: 'TRAINING GRID',
    description: 'Basic AI opponent',
    speed: 90,           // ms between moves (higher = slower)
    aiLookAhead: 8,      // How far AI looks ahead
    aiReactDistance: 4,  // How close before AI reacts
    aiRandomTurn: 0.01   // Chance of random turn
  },
  {
    name: 'SECTOR ALPHA',
    description: 'Faster bikes',
    speed: 80,
    aiLookAhead: 10,
    aiReactDistance: 5,
    aiRandomTurn: 0.015
  },
  {
    name: 'NEON DISTRICT',
    description: 'Smarter opponent',
    speed: 75,
    aiLookAhead: 12,
    aiReactDistance: 6,
    aiRandomTurn: 0.02
  },
  {
    name: 'CYBER ZONE',
    description: 'Quick reflexes needed',
    speed: 70,
    aiLookAhead: 14,
    aiReactDistance: 6,
    aiRandomTurn: 0.02
  },
  {
    name: 'DARK SECTOR',
    description: 'Elite AI',
    speed: 65,
    aiLookAhead: 16,
    aiReactDistance: 7,
    aiRandomTurn: 0.025
  },
  {
    name: 'CORE MATRIX',
    description: 'Maximum difficulty',
    speed: 60,
    aiLookAhead: 18,
    aiReactDistance: 8,
    aiRandomTurn: 0.03
  },
  {
    name: 'THE GRID',
    description: 'Master level',
    speed: 55,
    aiLookAhead: 20,
    aiReactDistance: 8,
    aiRandomTurn: 0.03
  },
  {
    name: 'INFINITY',
    description: 'Beyond limits',
    speed: 50,
    aiLookAhead: 22,
    aiReactDistance: 9,
    aiRandomTurn: 0.035
  }
];

const STORAGE_KEY = 'tronBike.stats';
const WINS_TO_LEVEL_UP = 3; // Consecutive wins needed to level up

// Bike class
class Bike {
  constructor(x, y, direction, color, trailColor, isPlayer = false) {
    this.x = x;
    this.y = y;
    this.direction = direction;
    this.nextDirection = direction;
    this.color = color;
    this.trailColor = trailColor;
    this.isPlayer = isPlayer;
    this.alive = true;
    this.trail = [{ x, y }];
    this.speed = 1; // cells per move
  }

  // Queue a direction change (will be applied on next move)
  setDirection(dir) {
    // Prevent 180-degree turns (can't go backwards into your own trail)
    const opposite = (this.direction + 2) % 4;
    if (dir !== opposite) {
      this.nextDirection = dir;
    }
  }

  move() {
    if (!this.alive) return;

    // Apply queued direction
    this.direction = this.nextDirection;

    // Store current position in trail before moving
    this.trail.push({ x: this.x, y: this.y });

    // Move based on direction
    switch (this.direction) {
      case Direction.UP:
        this.y -= this.speed;
        break;
      case Direction.RIGHT:
        this.x += this.speed;
        break;
      case Direction.DOWN:
        this.y += this.speed;
        break;
      case Direction.LEFT:
        this.x -= this.speed;
        break;
    }
  }

  // Check if bike has crashed into walls or trails
  checkCollision(gridWidth, gridHeight, otherBike) {
    // Wall collision
    if (this.x < 0 || this.x >= gridWidth || this.y < 0 || this.y >= gridHeight) {
      return true;
    }

    // Self collision (check all trail segments except the last few to give some grace)
    for (let i = 0; i < this.trail.length - 1; i++) {
      if (this.trail[i].x === this.x && this.trail[i].y === this.y) {
        return true;
      }
    }

    // Other bike trail collision
    if (otherBike) {
      for (const segment of otherBike.trail) {
        if (segment.x === this.x && segment.y === this.y) {
          return true;
        }
      }
      // Head-on collision
      if (otherBike.x === this.x && otherBike.y === this.y) {
        return true;
      }
    }

    return false;
  }
}

// AI for computer opponent - difficulty scales with level
class BikeAI {
  constructor(bike, gridWidth, gridHeight, levelConfig) {
    this.bike = bike;
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.turnCooldown = 0;
    this.preferredDirection = null;

    // Level-based difficulty settings
    this.lookAheadMax = levelConfig.aiLookAhead;
    this.reactDistance = levelConfig.aiReactDistance;
    this.randomTurnChance = levelConfig.aiRandomTurn;
  }

  update(playerBike) {
    if (!this.bike.alive) return;

    this.turnCooldown--;

    // Check if we need to turn to avoid collision
    const currentDir = this.bike.direction;
    const lookAhead = this.getLookAheadDistance(currentDir, playerBike);

    // If danger is close, consider turning
    if (lookAhead < this.reactDistance || this.turnCooldown <= 0) {
      const bestDir = this.findBestDirection(playerBike);
      if (bestDir !== null && bestDir !== currentDir) {
        this.bike.setDirection(bestDir);
        this.turnCooldown = 3 + Math.floor(Math.random() * 5);
      }
    }

    // Random turns for unpredictability
    if (Math.random() < this.randomTurnChance && this.turnCooldown <= 0) {
      const possibleDirs = this.getSafeDirections(playerBike);
      if (possibleDirs.length > 0) {
        const randomDir = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
        this.bike.setDirection(randomDir);
        this.turnCooldown = 5;
      }
    }
  }

  getLookAheadDistance(direction, playerBike) {
    let x = this.bike.x;
    let y = this.bike.y;
    let distance = 0;

    while (distance < this.lookAheadMax) {
      switch (direction) {
        case Direction.UP: y--; break;
        case Direction.RIGHT: x++; break;
        case Direction.DOWN: y++; break;
        case Direction.LEFT: x--; break;
      }

      // Check wall
      if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) {
        return distance;
      }

      // Check own trail
      for (const seg of this.bike.trail) {
        if (seg.x === x && seg.y === y) return distance;
      }

      // Check player trail
      if (playerBike) {
        for (const seg of playerBike.trail) {
          if (seg.x === x && seg.y === y) return distance;
        }
        if (playerBike.x === x && playerBike.y === y) return distance;
      }

      distance++;
    }

    return distance;
  }

  getSafeDirections(playerBike) {
    const safe = [];
    const opposite = (this.bike.direction + 2) % 4;

    for (let dir = 0; dir < 4; dir++) {
      if (dir === opposite) continue; // Can't go backwards

      const lookAhead = this.getLookAheadDistance(dir, playerBike);
      if (lookAhead >= 3) {
        safe.push(dir);
      }
    }

    return safe;
  }

  findBestDirection(playerBike) {
    let bestDir = null;
    let bestDistance = -1;
    const opposite = (this.bike.direction + 2) % 4;

    for (let dir = 0; dir < 4; dir++) {
      if (dir === opposite) continue;

      const distance = this.getLookAheadDistance(dir, playerBike);
      if (distance > bestDistance) {
        bestDistance = distance;
        bestDir = dir;
      }
    }

    return bestDir;
  }
}

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Grid settings - the arena is divided into cells
    this.cellSize = 8;
    this.gridWidth = Math.floor(canvas.width / this.cellSize);
    this.gridHeight = Math.floor(canvas.height / this.cellSize);

    this.renderer = new Renderer(canvas, this.cellSize, this.gridWidth, this.gridHeight);

    // State
    this.state = GameState.START_SCREEN;
    this.stateTimer = 0;
    this.countdownValue = 3;

    // Game entities
    this.playerBike = null;
    this.aiBike = null;
    this.ai = null;

    // Stats and progression
    this.wins = 0;
    this.losses = 0;
    this.level = 1;
    this.winStreak = 0;
    this.currentRound = 0;
    this.loadStats();

    // Game speed (ms between moves) - set by level
    this.moveInterval = 80;
    this.lastMoveTime = 0;

    // Input state
    this.pendingDirection = null;

    // Timing
    this.lastTime = 0;
    this.running = false;

    // Callbacks for UI
    this.onStateChange = null;
    this.onScoreChange = null;
  }

  loadStats() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stats = JSON.parse(raw);
        this.wins = stats.wins || 0;
        this.losses = stats.losses || 0;
        this.level = stats.level || 1;
        this.winStreak = stats.winStreak || 0;
      }
    } catch (_) {}
  }

  saveStats() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        wins: this.wins,
        losses: this.losses,
        level: this.level,
        winStreak: this.winStreak
      }));
    } catch (_) {}
  }

  getLevelConfig() {
    const levelIndex = Math.min(this.level - 1, LEVELS.length - 1);
    return LEVELS[levelIndex];
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
      case GameState.COUNTDOWN:
        this.countdownValue = 3;
        this.stateTimer = 180; // 3 seconds
        break;

      case GameState.GAME_OVER:
        this.losses++;
        this.winStreak = 0; // Reset win streak on loss
        this.saveStats();
        break;

      case GameState.VICTORY:
        this.wins++;
        this.winStreak++;

        // Check for level up
        if (this.winStreak >= WINS_TO_LEVEL_UP) {
          this.level++;
          this.winStreak = 0;
          this.saveStats();
          // Delay showing level up screen
          setTimeout(() => {
            this.setState(GameState.LEVEL_UP);
          }, 1500);
        } else {
          this.saveStats();
        }
        break;

      case GameState.LEVEL_UP:
        // Level up celebration state
        break;
    }
  }

  start() {
    this.currentRound++;

    // Get level configuration
    const levelConfig = this.getLevelConfig();
    this.moveInterval = levelConfig.speed;

    // Create player bike (starts on left side, moving right)
    const playerStartX = Math.floor(this.gridWidth * 0.25);
    const playerStartY = Math.floor(this.gridHeight / 2);
    this.playerBike = new Bike(
      playerStartX,
      playerStartY,
      Direction.RIGHT,
      '#00ffff', // Cyan
      '#0088aa',
      true
    );

    // Create AI bike (starts on right side, moving left)
    const aiStartX = Math.floor(this.gridWidth * 0.75);
    const aiStartY = Math.floor(this.gridHeight / 2);
    this.aiBike = new Bike(
      aiStartX,
      aiStartY,
      Direction.LEFT,
      '#ff6600', // Orange
      '#aa4400',
      false
    );

    // Create AI controller with level-based difficulty
    this.ai = new BikeAI(this.aiBike, this.gridWidth, this.gridHeight, levelConfig);

    this.pendingDirection = null;

    // Start countdown
    this.setState(GameState.COUNTDOWN);

    if (!this.running) {
      this.running = true;
      this.lastTime = performance.now();
      this.lastMoveTime = performance.now();
      requestAnimationFrame((t) => this.gameLoop(t));
    }
  }

  gameLoop(timestamp) {
    if (!this.running) return;

    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;

    this.update(timestamp, deltaTime);
    this.render();

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  update(timestamp, deltaTime) {
    switch (this.state) {
      case GameState.COUNTDOWN:
        this.stateTimer--;
        const newCountdown = Math.ceil(this.stateTimer / 60);
        if (newCountdown !== this.countdownValue && newCountdown > 0) {
          this.countdownValue = newCountdown;
        }
        if (this.stateTimer <= 0) {
          this.setState(GameState.PLAYING);
          this.lastMoveTime = timestamp;
        }
        break;

      case GameState.PLAYING:
        // Apply pending direction change
        if (this.pendingDirection !== null) {
          this.playerBike.setDirection(this.pendingDirection);
          this.pendingDirection = null;
        }

        // Update AI
        this.ai.update(this.playerBike);

        // Move bikes at fixed intervals
        if (timestamp - this.lastMoveTime >= this.moveInterval) {
          this.lastMoveTime = timestamp;

          // Move both bikes
          this.playerBike.move();
          this.aiBike.move();

          // Check collisions
          const playerCrashed = this.playerBike.checkCollision(
            this.gridWidth,
            this.gridHeight,
            this.aiBike
          );
          const aiCrashed = this.aiBike.checkCollision(
            this.gridWidth,
            this.gridHeight,
            this.playerBike
          );

          if (playerCrashed && aiCrashed) {
            // Both crashed at same time - it's a draw, but player loses
            this.playerBike.alive = false;
            this.aiBike.alive = false;
            this.setState(GameState.GAME_OVER);
          } else if (playerCrashed) {
            this.playerBike.alive = false;
            this.setState(GameState.GAME_OVER);
          } else if (aiCrashed) {
            this.aiBike.alive = false;
            this.setState(GameState.VICTORY);
          }
        }
        break;

      case GameState.GAME_OVER:
      case GameState.VICTORY:
      case GameState.LEVEL_UP:
        // Just render, wait for user input
        break;
    }
  }

  render() {
    const r = this.renderer;

    // Clear and draw background
    r.clear();
    r.drawGrid();

    // Draw game entities based on state
    switch (this.state) {
      case GameState.START_SCREEN:
        // Just background, UI handles the rest
        break;

      case GameState.COUNTDOWN:
        r.drawBike(this.playerBike);
        r.drawBike(this.aiBike);
        r.drawCountdown(this.countdownValue);
        r.drawHUD(this.wins, this.losses, this.level, this.currentRound);
        break;

      case GameState.PLAYING:
        r.drawTrail(this.playerBike);
        r.drawTrail(this.aiBike);
        r.drawBike(this.playerBike);
        r.drawBike(this.aiBike);
        r.drawHUD(this.wins, this.losses, this.level, this.currentRound);
        break;

      case GameState.GAME_OVER:
        r.drawTrail(this.playerBike);
        r.drawTrail(this.aiBike);
        r.drawBike(this.playerBike);
        r.drawBike(this.aiBike);
        r.drawCrash(this.playerBike);
        r.drawHUD(this.wins, this.losses, this.level, this.currentRound);
        break;

      case GameState.VICTORY:
      case GameState.LEVEL_UP:
        r.drawTrail(this.playerBike);
        r.drawTrail(this.aiBike);
        r.drawBike(this.playerBike);
        r.drawBike(this.aiBike);
        r.drawCrash(this.aiBike);
        r.drawHUD(this.wins, this.losses, this.level, this.currentRound);
        break;
    }
  }

  // Input methods (called from index.html)
  setDirection(direction) {
    if (this.state === GameState.PLAYING) {
      this.pendingDirection = direction;
    }
  }

  // Legacy input method for compatibility
  setInput(key, value) {
    if (!value || this.state !== GameState.PLAYING) return;

    switch (key) {
      case 'up':
        this.setDirection(Direction.UP);
        break;
      case 'down':
        this.setDirection(Direction.DOWN);
        break;
      case 'left':
        this.setDirection(Direction.LEFT);
        break;
      case 'right':
        this.setDirection(Direction.RIGHT);
        break;
    }
  }

  restart() {
    this.start();
  }

  resetLevel() {
    this.level = 1;
    this.winStreak = 0;
    this.saveStats();
  }

  getScore() {
    return this.wins;
  }

  get score() {
    return this.wins;
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

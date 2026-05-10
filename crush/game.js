/**
 * Candy Crush - Game Controller
 * State machine and main game loop
 */

import { Board, SpecialType, ScorePopup, createExplosion } from './entities.js';
import { Renderer } from './renderer.js';

// Game states
export const GameState = {
  MODE_SELECT: 'mode_select',
  PLAYING: 'playing',
  SWAPPING: 'swapping',
  MATCHING: 'matching',
  FALLING: 'falling',
  GAME_OVER: 'game_over',
  VICTORY: 'victory',
  PAUSED: 'paused',
  NO_MOVES: 'no_moves'
};

// Game modes
export const GameMode = {
  ENDLESS: 'endless',
  MOVES: 'moves',
  TIMED: 'timed'
};

const STORAGE_KEY = 'candyCrush.best';

// Scoring constants
const SCORE_3_MATCH = 60;
const SCORE_4_MATCH = 120;
const SCORE_5_MATCH = 200;
const SCORE_SPECIAL_ACTIVATION = 100;

// Animation durations (in ms)
const SWAP_DURATION = 150;
const MATCH_DURATION = 200;
const FALL_DURATION = 150;

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.renderer = new Renderer(canvas);

    // Board
    this.board = null;

    // State
    this.state = GameState.MODE_SELECT;
    this.mode = null;

    // Animation state
    this.animating = false;
    this.animationStart = 0;
    this.animationDuration = 0;
    this.swapData = null;
    this.fallingCandies = [];
    this.matchedCandies = [];

    // Game progress
    this.score = 0;
    this.bestScore = parseInt(localStorage.getItem(STORAGE_KEY) || '0');
    this.combo = 0;
    this.movesRemaining = 30;
    this.timeRemaining = 120; // seconds
    this.targetScore = 5000;

    // Visual effects
    this.scorePopups = [];
    this.particles = [];

    // Input state
    this.selectedCell = null;
    this.inputEnabled = true;

    // Timing
    this.lastTime = 0;
    this.running = false;

    // Callbacks for UI
    this.onStateChange = null;
    this.onScoreChange = null;
    this.onMovesChange = null;
    this.onTimeChange = null;
  }

  setState(newState, data = {}) {
    const oldState = this.state;
    this.state = newState;

    // Safety: ensure input is enabled when entering PLAYING state
    if (newState === GameState.PLAYING) {
      this.inputEnabled = true;
    }

    if (this.onStateChange) {
      this.onStateChange(newState, oldState, data);
    }
  }

  start(mode = GameMode.ENDLESS) {
    this.mode = mode;
    this.score = 0;
    this.combo = 0;
    this.scorePopups = [];
    this.particles = [];
    this.selectedCell = null;
    this.inputEnabled = true;

    // Mode-specific setup
    switch (mode) {
      case GameMode.ENDLESS:
        this.movesRemaining = -1; // Unlimited
        this.timeRemaining = -1;
        this.targetScore = -1;
        break;
      case GameMode.MOVES:
        this.movesRemaining = 30;
        this.timeRemaining = -1;
        this.targetScore = 5000;
        break;
      case GameMode.TIMED:
        this.movesRemaining = -1;
        this.timeRemaining = 120;
        this.targetScore = 3000;
        break;
    }

    // Create board
    this.board = new Board(8, 8);

    // Ensure there are valid moves
    if (!this.board.hasValidMoves()) {
      this.board.shuffle();
    }

    this.setState(GameState.PLAYING);

    if (!this.running) {
      this.running = true;
      this.lastTime = performance.now();
      requestAnimationFrame((t) => this.gameLoop(t));
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
    // Update particles
    this.particles = this.particles.filter(p => {
      p.update();
      return p.active;
    });

    // Update score popups
    this.scorePopups = this.scorePopups.filter(p => p.update());

    // Update timer for timed mode
    if (this.mode === GameMode.TIMED && this.state === GameState.PLAYING && this.timeRemaining > 0) {
      this.timeRemaining -= deltaTime / 1000;
      if (this.onTimeChange) {
        this.onTimeChange(Math.ceil(this.timeRemaining));
      }
      if (this.timeRemaining <= 0) {
        this.timeRemaining = 0;
        this.checkGameEnd();
      }
    }

    // State-specific updates
    switch (this.state) {
      case GameState.SWAPPING:
        this.updateSwapping(deltaTime);
        break;

      case GameState.MATCHING:
        this.updateMatching(deltaTime);
        break;

      case GameState.FALLING:
        this.updateFalling(deltaTime);
        break;

      case GameState.NO_MOVES:
        // Shuffle animation, then check again
        if (!this.board.hasValidMoves()) {
          this.board.shuffle();
        }
        this.setState(GameState.PLAYING);
        break;
    }
  }

  updateSwapping(deltaTime) {
    if (!this.swapData) {
      this.inputEnabled = true;
      this.setState(GameState.PLAYING);
      return;
    }

    const elapsed = performance.now() - this.animationStart;
    const progress = Math.min(elapsed / SWAP_DURATION, 1);

    // Ease out quad
    const eased = 1 - (1 - progress) * (1 - progress);

    const { candy1, candy2, col1, row1, col2, row2 } = this.swapData;

    // Animate candy positions
    if (candy1) {
      candy1.x = col1 + (col2 - col1) * eased;
      candy1.y = row1 + (row2 - row1) * eased;
    }
    if (candy2) {
      candy2.x = col2 + (col1 - col2) * eased;
      candy2.y = row2 + (row1 - row2) * eased;
    }

    if (progress >= 1) {
      // Finalize positions
      if (candy1) { candy1.x = col2; candy1.y = row2; }
      if (candy2) { candy2.x = col1; candy2.y = row1; }

      // Check for special activation first (color bombs)
      const specialActivated = this.checkSpecialActivation(candy1, candy2);

      if (specialActivated) {
        // Color bomb was activated - startFalling already called
        this.swapData = null;
        return;
      }

      // Check for matches
      const matches = this.board.findMatches();

      if (matches.length > 0) {
        // Valid swap - process matches
        this.combo = 1;
        this.processMatches();
      } else {
        // Invalid swap - swap back
        this.board.swap(col1, row1, col2, row2);
        if (candy1) { candy1.x = col1; candy1.y = row1; candy1.col = col1; candy1.row = row1; }
        if (candy2) { candy2.x = col2; candy2.y = row2; candy2.col = col2; candy2.row = row2; }
        this.inputEnabled = true;
        this.setState(GameState.PLAYING);
      }

      this.swapData = null;
    }
  }

  checkSpecialActivation(candy1, candy2) {
    // Check if swapping a color bomb with another candy
    if (candy1 && candy1.special === SpecialType.COLOR_BOMB && candy2) {
      this.combo = 1;
      this.activateColorBomb(candy1, candy2.type);
      return true;
    }
    if (candy2 && candy2.special === SpecialType.COLOR_BOMB && candy1) {
      this.combo = 1;
      this.activateColorBomb(candy2, candy1.type);
      return true;
    }
    return false;
  }

  activateColorBomb(bomb, targetType) {
    const cleared = this.board.clearByType(targetType);
    if (bomb && this.board.grid[bomb.row] && this.board.grid[bomb.row][bomb.col] === bomb) {
      this.board.grid[bomb.row][bomb.col] = null;
    }

    const points = cleared.length * SCORE_SPECIAL_ACTIVATION;
    this.addScore(points);

    // Create particles for each cleared candy
    for (const candy of cleared) {
      const pixelPos = this.renderer.getCandyPixelPosition(candy.col, candy.row);
      this.particles.push(...createExplosion(pixelPos.x, pixelPos.y, candy.getColor(), 6));
      this.scorePopups.push(new ScorePopup(pixelPos.x, pixelPos.y, 20, this.combo));
    }

    this.startFalling();
  }

  updateMatching(deltaTime) {
    // Safety: if no candies to match, move on
    if (this.matchedCandies.length === 0) {
      this.startFalling();
      return;
    }

    const elapsed = performance.now() - this.animationStart;
    const progress = Math.min(elapsed / MATCH_DURATION, 1);

    // Shrink matched candies
    for (const candy of this.matchedCandies) {
      if (candy) {
        candy.scale = 1 - progress;
        candy.alpha = 1 - progress;
      }
    }

    if (progress >= 1) {
      // Remove matched candies from board
      for (const candy of this.matchedCandies) {
        if (candy) {
          const gridCandy = this.board.getCandy(candy.col, candy.row);
          if (gridCandy === candy) {
            this.board.grid[candy.row][candy.col] = null;
          }
        }
      }
      this.matchedCandies = [];

      // Start falling phase
      this.startFalling();
    }
  }

  updateFalling(deltaTime) {
    // Safety: if no falling candies, move on
    if (!this.fallingCandies || this.fallingCandies.length === 0) {
      this.combo = 0;
      this.inputEnabled = true;
      if (!this.board.hasValidMoves()) {
        this.setState(GameState.NO_MOVES);
      } else {
        this.setState(GameState.PLAYING);
      }
      return;
    }

    const elapsed = performance.now() - this.animationStart;
    const progress = Math.min(elapsed / FALL_DURATION, 1);

    // Ease out bounce
    const eased = 1 - Math.pow(1 - progress, 2);

    // Animate falling candies
    for (const fallData of this.fallingCandies) {
      if (fallData && fallData.candy) {
        fallData.candy.y = fallData.fromRow + (fallData.toRow - fallData.fromRow) * eased;
      }
    }

    if (progress >= 1) {
      // Finalize positions
      for (const fallData of this.fallingCandies) {
        if (fallData && fallData.candy) {
          fallData.candy.y = fallData.toRow;
        }
      }
      this.fallingCandies = [];

      // Check for new matches (cascades)
      const matches = this.board.findMatches();
      if (matches.length > 0) {
        this.combo++;
        this.processMatches();
      } else {
        // No more matches, back to playing
        this.combo = 0;
        this.inputEnabled = true;

        // Check for valid moves
        if (!this.board.hasValidMoves()) {
          this.setState(GameState.NO_MOVES);
        } else {
          this.checkGameEnd();
          if (this.state !== GameState.GAME_OVER && this.state !== GameState.VICTORY) {
            this.setState(GameState.PLAYING);
          }
        }
      }
    }
  }

  processMatches() {
    const matches = this.board.findMatches();
    if (matches.length === 0) {
      this.startFalling();
      return;
    }

    // Find special patterns (L, T shapes)
    const specialPatterns = this.board.findSpecialPatterns(matches);

    // Collect all matched candies
    this.matchedCandies = [];
    const matchedPositions = new Set();
    let totalPoints = 0;

    // Track which position should get a special candy
    let specialPosition = null;
    let specialType = null;

    for (const match of matches) {
      // Determine if this match creates a special candy
      if (match.length >= 5) {
        // 5+ match = color bomb
        specialPosition = { col: match.candies[2].col, row: match.candies[2].row };
        specialType = SpecialType.COLOR_BOMB;
      } else if (match.length === 4 && !specialPosition) {
        // 4 match = striped candy
        const midCandy = match.candies[1];
        specialPosition = { col: midCandy.col, row: midCandy.row };
        specialType = match.type === 'horizontal' ? SpecialType.STRIPED_V : SpecialType.STRIPED_H;
      }

      for (const candy of match.candies) {
        const key = `${candy.col},${candy.row}`;
        if (!matchedPositions.has(key)) {
          matchedPositions.add(key);

          // Check for special candy activation
          if (candy.special !== SpecialType.NONE) {
            this.activateSpecialCandy(candy);
          }

          this.matchedCandies.push(candy);
        }
      }

      // Calculate points
      const matchPoints = this.getMatchPoints(match.length);
      totalPoints += matchPoints * this.combo;
    }

    // Handle special patterns (L, T shapes create wrapped candy)
    for (const pattern of specialPatterns) {
      specialPosition = { col: pattern.center.col, row: pattern.center.row };
      specialType = SpecialType.WRAPPED;
    }

    // Add score
    this.addScore(totalPoints);

    // Create score popup at center of matches
    if (this.matchedCandies.length > 0) {
      const avgCol = this.matchedCandies.reduce((s, c) => s + c.col, 0) / this.matchedCandies.length;
      const avgRow = this.matchedCandies.reduce((s, c) => s + c.row, 0) / this.matchedCandies.length;
      const pixelPos = this.renderer.getCandyPixelPosition(avgCol, avgRow);
      this.scorePopups.push(new ScorePopup(pixelPos.x, pixelPos.y, totalPoints, this.combo));

      // Create particles
      for (const candy of this.matchedCandies) {
        const pos = this.renderer.getCandyPixelPosition(candy.col, candy.row);
        this.particles.push(...createExplosion(pos.x, pos.y, candy.getColor(), 4));
      }
    }

    // Create special candy if applicable
    if (specialPosition && specialType) {
      // Don't remove the candy at special position, transform it
      this.matchedCandies = this.matchedCandies.filter(c =>
        !(c.col === specialPosition.col && c.row === specialPosition.row)
      );

      const specialCandy = this.board.getCandy(specialPosition.col, specialPosition.row);
      if (specialCandy) {
        specialCandy.special = specialType;
        specialCandy.scale = 1;
        specialCandy.alpha = 1;
      }
    }

    // Start match animation
    this.animationStart = performance.now();
    this.setState(GameState.MATCHING);
  }

  activateSpecialCandy(candy) {
    let cleared = [];
    const pos = this.renderer.getCandyPixelPosition(candy.col, candy.row);

    switch (candy.special) {
      case SpecialType.STRIPED_H:
        cleared = this.board.clearRow(candy.row);
        break;
      case SpecialType.STRIPED_V:
        cleared = this.board.clearColumn(candy.col);
        break;
      case SpecialType.WRAPPED:
        cleared = this.board.clear3x3(candy.col, candy.row);
        break;
    }

    // Add points and effects for cleared candies
    const points = cleared.length * SCORE_SPECIAL_ACTIVATION;
    this.addScore(points);

    for (const c of cleared) {
      const clearPos = this.renderer.getCandyPixelPosition(c.col, c.row);
      this.particles.push(...createExplosion(clearPos.x, clearPos.y, c.getColor(), 4));
    }
  }

  getMatchPoints(length) {
    switch (length) {
      case 3: return SCORE_3_MATCH;
      case 4: return SCORE_4_MATCH;
      case 5: return SCORE_5_MATCH;
      default: return SCORE_5_MATCH + (length - 5) * 50;
    }
  }

  startFalling() {
    // Apply gravity
    const falls = this.board.applyGravity();

    // Fill empty spaces
    const newCandies = this.board.fillBoard();

    // Combine for animation
    this.fallingCandies = [...falls, ...newCandies];

    if (this.fallingCandies.length > 0) {
      this.animationStart = performance.now();
      this.setState(GameState.FALLING);
    } else {
      // No falling needed, check for more matches
      const matches = this.board.findMatches();
      if (matches.length > 0) {
        this.combo++;
        this.processMatches();
      } else {
        this.combo = 0;
        this.inputEnabled = true;

        if (!this.board.hasValidMoves()) {
          this.setState(GameState.NO_MOVES);
        } else {
          this.checkGameEnd();
          if (this.state !== GameState.GAME_OVER && this.state !== GameState.VICTORY) {
            this.setState(GameState.PLAYING);
          }
        }
      }
    }
  }

  handleClick(canvasX, canvasY) {
    if (!this.inputEnabled || this.state !== GameState.PLAYING) return;

    const cell = this.renderer.getCellFromPixel(canvasX, canvasY);
    if (!cell) return;

    const { col, row } = cell;
    const candy = this.board.getCandy(col, row);
    if (!candy) return;

    if (this.selectedCell) {
      // Second selection - try to swap
      const { col: selCol, row: selRow } = this.selectedCell;

      if (col === selCol && row === selRow) {
        // Clicked same cell - deselect
        this.selectedCell = null;
      } else if (this.board.areAdjacent(col, row, selCol, selRow)) {
        // Adjacent - perform swap
        this.performSwap(selCol, selRow, col, row);
        this.selectedCell = null;
      } else {
        // Not adjacent - select new cell
        this.selectedCell = { col, row };
      }
    } else {
      // First selection
      this.selectedCell = { col, row };
    }
  }

  handleDrag(fromX, fromY, toX, toY) {
    if (!this.inputEnabled || this.state !== GameState.PLAYING) return;

    const fromCell = this.renderer.getCellFromPixel(fromX, fromY);
    const toCell = this.renderer.getCellFromPixel(toX, toY);

    if (!fromCell || !toCell) return;

    if (this.board.areAdjacent(fromCell.col, fromCell.row, toCell.col, toCell.row)) {
      this.performSwap(fromCell.col, fromCell.row, toCell.col, toCell.row);
      this.selectedCell = null;
    }
  }

  performSwap(col1, row1, col2, row2) {
    const candy1 = this.board.getCandy(col1, row1);
    const candy2 = this.board.getCandy(col2, row2);

    if (!candy1 || !candy2) return;

    this.inputEnabled = false;

    // Use a move (for moves mode)
    if (this.mode === GameMode.MOVES && this.movesRemaining > 0) {
      this.movesRemaining--;
      if (this.onMovesChange) {
        this.onMovesChange(this.movesRemaining);
      }
    }

    // Perform the swap in the data model
    this.board.swap(col1, row1, col2, row2);

    // Set up swap animation
    this.swapData = { candy1, candy2, col1, row1, col2, row2 };
    this.animationStart = performance.now();
    this.setState(GameState.SWAPPING);
  }

  checkGameEnd() {
    switch (this.mode) {
      case GameMode.ENDLESS:
        // Endless only ends when no moves
        if (!this.board.hasValidMoves()) {
          this.saveBestScore();
          this.setState(GameState.GAME_OVER);
        }
        break;

      case GameMode.MOVES:
        if (this.movesRemaining <= 0) {
          this.saveBestScore();
          if (this.score >= this.targetScore) {
            this.setState(GameState.VICTORY);
          } else {
            this.setState(GameState.GAME_OVER);
          }
        }
        break;

      case GameMode.TIMED:
        if (this.timeRemaining <= 0) {
          this.saveBestScore();
          if (this.score >= this.targetScore) {
            this.setState(GameState.VICTORY);
          } else {
            this.setState(GameState.GAME_OVER);
          }
        }
        break;
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

    if (this.state === GameState.MODE_SELECT) {
      // Mode select screen - UI handles this
      return;
    }

    if (!this.board) return;

    // Draw the board
    r.drawBoard(this.board, this.selectedCell);

    // Draw particles
    r.drawParticles(this.particles);

    // Draw score popups
    r.drawScorePopups(this.scorePopups);

    // Draw HUD
    r.drawHUD(this.score, this.mode, this.movesRemaining, this.timeRemaining, this.targetScore, this.combo, this.bestScore);

    // Draw game over / victory overlay
    if (this.state === GameState.GAME_OVER) {
      r.drawGameOver(this.score, this.bestScore);
    } else if (this.state === GameState.VICTORY) {
      r.drawVictory(this.score);
    } else if (this.state === GameState.NO_MOVES) {
      r.drawMessage('NO MOVES - SHUFFLING...');
    }
  }

  restart() {
    if (this.mode) {
      this.start(this.mode);
    }
  }

  setMode(mode) {
    this.mode = mode;
  }

  isGameOver() {
    return this.state === GameState.GAME_OVER;
  }

  isVictory() {
    return this.state === GameState.VICTORY;
  }

  isModeSelect() {
    return this.state === GameState.MODE_SELECT;
  }
}

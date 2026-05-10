/**
 * Candy Crush Game Entities
 * - Candy: Individual candy piece with type and special properties
 * - Board: 8x8 grid management
 */

// Candy types (6 colors)
export const CandyType = {
  RED: 0,
  ORANGE: 1,
  YELLOW: 2,
  GREEN: 3,
  BLUE: 4,
  PURPLE: 5
};

// Special candy types
export const SpecialType = {
  NONE: 'none',
  STRIPED_H: 'striped_h',  // Clears row
  STRIPED_V: 'striped_v',  // Clears column
  WRAPPED: 'wrapped',       // 3x3 explosion
  COLOR_BOMB: 'color_bomb'  // Clears all of one color
};

// Candy colors for rendering
export const CandyColors = {
  [CandyType.RED]: '#ff4757',
  [CandyType.ORANGE]: '#ffa502',
  [CandyType.YELLOW]: '#ffdd59',
  [CandyType.GREEN]: '#2ed573',
  [CandyType.BLUE]: '#1e90ff',
  [CandyType.PURPLE]: '#a55eea'
};

/**
 * Individual candy piece
 */
export class Candy {
  constructor(type, col, row) {
    this.type = type;
    this.col = col;
    this.row = row;
    this.special = SpecialType.NONE;

    // Animation state
    this.x = col;  // Visual x position (can differ during animation)
    this.y = row;  // Visual y position
    this.scale = 1;
    this.alpha = 1;
    this.removing = false;
  }

  /**
   * Get the color for this candy
   */
  getColor() {
    if (this.special === SpecialType.COLOR_BOMB) {
      return '#ffffff';  // White/rainbow for color bomb
    }
    return CandyColors[this.type];
  }

  /**
   * Check if this candy matches another (same type, not color bombs)
   */
  matches(other) {
    if (!other) return false;
    if (this.special === SpecialType.COLOR_BOMB || other.special === SpecialType.COLOR_BOMB) {
      return false;  // Color bombs don't match normally
    }
    return this.type === other.type;
  }

  /**
   * Create a copy of this candy
   */
  clone() {
    const candy = new Candy(this.type, this.col, this.row);
    candy.special = this.special;
    candy.x = this.x;
    candy.y = this.y;
    candy.scale = this.scale;
    candy.alpha = this.alpha;
    return candy;
  }
}

/**
 * Game board - manages the 8x8 grid
 */
export class Board {
  constructor(cols = 8, rows = 8) {
    this.cols = cols;
    this.rows = rows;
    this.grid = [];
    this.selected = null;  // {col, row} of selected candy

    this.initialize();
  }

  /**
   * Initialize board with random candies (no initial matches)
   */
  initialize() {
    this.grid = [];

    for (let row = 0; row < this.rows; row++) {
      this.grid[row] = [];
      for (let col = 0; col < this.cols; col++) {
        let type;
        do {
          type = this.randomCandyType();
        } while (this.wouldCreateMatch(col, row, type));

        this.grid[row][col] = new Candy(type, col, row);
      }
    }
  }

  /**
   * Get random candy type
   */
  randomCandyType() {
    return Math.floor(Math.random() * 6);
  }

  /**
   * Check if placing a candy type at position would create a match
   * (used during initialization to avoid starting matches)
   */
  wouldCreateMatch(col, row, type) {
    // Check horizontal (left 2)
    if (col >= 2) {
      const left1 = this.grid[row][col - 1];
      const left2 = this.grid[row][col - 2];
      if (left1 && left2 && left1.type === type && left2.type === type) {
        return true;
      }
    }

    // Check vertical (up 2)
    if (row >= 2) {
      const up1 = this.grid[row - 1][col];
      const up2 = this.grid[row - 2][col];
      if (up1 && up2 && up1.type === type && up2.type === type) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get candy at position
   */
  getCandy(col, row) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
      return null;
    }
    return this.grid[row][col];
  }

  /**
   * Set candy at position
   */
  setCandy(col, row, candy) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
      return;
    }
    this.grid[row][col] = candy;
    if (candy) {
      candy.col = col;
      candy.row = row;
    }
  }

  /**
   * Check if two positions are adjacent
   */
  areAdjacent(col1, row1, col2, row2) {
    const dx = Math.abs(col1 - col2);
    const dy = Math.abs(row1 - row2);
    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
  }

  /**
   * Swap two candies
   */
  swap(col1, row1, col2, row2) {
    const candy1 = this.getCandy(col1, row1);
    const candy2 = this.getCandy(col2, row2);

    this.setCandy(col1, row1, candy2);
    this.setCandy(col2, row2, candy1);
  }

  /**
   * Find all matches on the board
   * Returns array of match objects: {candies: [], type: 'horizontal'|'vertical'|'special'}
   */
  findMatches() {
    const matches = [];
    const matched = new Set();  // Track already matched positions

    // Find horizontal matches
    for (let row = 0; row < this.rows; row++) {
      let matchStart = 0;
      for (let col = 1; col <= this.cols; col++) {
        const current = this.getCandy(col, row);
        const prev = this.getCandy(col - 1, row);

        const sameType = current && prev && current.matches(prev);

        if (!sameType || col === this.cols) {
          const matchLength = col - matchStart;
          if (matchLength >= 3) {
            const candies = [];
            for (let c = matchStart; c < col; c++) {
              const candy = this.getCandy(c, row);
              if (candy && !candy.removing) {
                candies.push(candy);
                matched.add(`${c},${row}`);
              }
            }
            if (candies.length >= 3) {
              matches.push({
                candies,
                type: 'horizontal',
                length: candies.length,
                col: matchStart,
                row
              });
            }
          }
          matchStart = col;
        }
      }
    }

    // Find vertical matches
    for (let col = 0; col < this.cols; col++) {
      let matchStart = 0;
      for (let row = 1; row <= this.rows; row++) {
        const current = this.getCandy(col, row);
        const prev = this.getCandy(col, row - 1);

        const sameType = current && prev && current.matches(prev);

        if (!sameType || row === this.rows) {
          const matchLength = row - matchStart;
          if (matchLength >= 3) {
            const candies = [];
            for (let r = matchStart; r < row; r++) {
              const candy = this.getCandy(col, r);
              if (candy && !candy.removing) {
                candies.push(candy);
                matched.add(`${col},${r}`);
              }
            }
            if (candies.length >= 3) {
              matches.push({
                candies,
                type: 'vertical',
                length: candies.length,
                col,
                row: matchStart
              });
            }
          }
          matchStart = row;
        }
      }
    }

    return matches;
  }

  /**
   * Find special patterns (L, T shapes for wrapped candy)
   */
  findSpecialPatterns(matches) {
    const patterns = [];

    // Look for intersections between matches (L and T shapes)
    for (let i = 0; i < matches.length; i++) {
      for (let j = i + 1; j < matches.length; j++) {
        const match1 = matches[i];
        const match2 = matches[j];

        // Need one horizontal and one vertical
        if (match1.type === match2.type) continue;

        // Find intersection
        for (const c1 of match1.candies) {
          for (const c2 of match2.candies) {
            if (c1.col === c2.col && c1.row === c2.row) {
              // Found intersection - this forms L or T shape
              const allCandies = new Set([...match1.candies, ...match2.candies]);
              patterns.push({
                type: 'wrapped',
                center: c1,
                candies: Array.from(allCandies)
              });
            }
          }
        }
      }
    }

    return patterns;
  }

  /**
   * Remove matched candies and return them
   */
  removeMatches(matches) {
    const removed = [];
    const removedPositions = new Set();

    for (const match of matches) {
      for (const candy of match.candies) {
        const key = `${candy.col},${candy.row}`;
        if (!removedPositions.has(key)) {
          removedPositions.add(key);
          removed.push(candy);
          this.grid[candy.row][candy.col] = null;
        }
      }
    }

    return removed;
  }

  /**
   * Apply gravity - candies fall down to fill gaps
   * Returns array of {candy, fromRow, toRow} for animation
   */
  applyGravity() {
    const falls = [];

    for (let col = 0; col < this.cols; col++) {
      let writeRow = this.rows - 1;  // Start from bottom

      // Move existing candies down
      for (let row = this.rows - 1; row >= 0; row--) {
        const candy = this.getCandy(col, row);
        if (candy) {
          if (row !== writeRow) {
            falls.push({
              candy,
              fromRow: row,
              toRow: writeRow
            });
            this.grid[writeRow][col] = candy;
            this.grid[row][col] = null;
            candy.row = writeRow;
          }
          writeRow--;
        }
      }
    }

    return falls;
  }

  /**
   * Fill empty spaces with new candies from top
   * Returns array of new candies with spawn info
   */
  fillBoard() {
    const newCandies = [];

    for (let col = 0; col < this.cols; col++) {
      let spawnRow = -1;  // New candies spawn above the board

      for (let row = 0; row < this.rows; row++) {
        if (!this.getCandy(col, row)) {
          const type = this.randomCandyType();
          const candy = new Candy(type, col, row);
          candy.y = spawnRow;  // Start above board for animation
          this.grid[row][col] = candy;

          newCandies.push({
            candy,
            fromRow: spawnRow,
            toRow: row
          });

          spawnRow--;
        }
      }
    }

    return newCandies;
  }

  /**
   * Check if any valid moves exist
   */
  hasValidMoves() {
    // Check each position for possible swaps that would create matches
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        // Try swap right
        if (col < this.cols - 1) {
          this.swap(col, row, col + 1, row);
          const matches = this.findMatches();
          this.swap(col, row, col + 1, row);  // Swap back
          if (matches.length > 0) return true;
        }

        // Try swap down
        if (row < this.rows - 1) {
          this.swap(col, row, col, row + 1);
          const matches = this.findMatches();
          this.swap(col, row, col, row + 1);  // Swap back
          if (matches.length > 0) return true;
        }
      }
    }

    return false;
  }

  /**
   * Get hint - returns a valid swap {col1, row1, col2, row2}
   */
  getHint() {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        // Try swap right
        if (col < this.cols - 1) {
          this.swap(col, row, col + 1, row);
          const matches = this.findMatches();
          this.swap(col, row, col + 1, row);
          if (matches.length > 0) {
            return { col1: col, row1: row, col2: col + 1, row2: row };
          }
        }

        // Try swap down
        if (row < this.rows - 1) {
          this.swap(col, row, col, row + 1);
          const matches = this.findMatches();
          this.swap(col, row, col, row + 1);
          if (matches.length > 0) {
            return { col1: col, row1: row, col2: col, row2: row + 1 };
          }
        }
      }
    }

    return null;
  }

  /**
   * Shuffle board (when no moves available)
   */
  shuffle() {
    // Collect all candies
    const candies = [];
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const candy = this.getCandy(col, row);
        if (candy) {
          candies.push(candy.type);
        }
      }
    }

    // Fisher-Yates shuffle
    for (let i = candies.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candies[i], candies[j]] = [candies[j], candies[i]];
    }

    // Place back on board
    let idx = 0;
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const candy = this.getCandy(col, row);
        if (candy) {
          candy.type = candies[idx++];
          candy.special = SpecialType.NONE;  // Remove specials on shuffle
        }
      }
    }
  }

  /**
   * Clear entire row (for striped horizontal candy)
   */
  clearRow(row) {
    const cleared = [];
    for (let col = 0; col < this.cols; col++) {
      const candy = this.getCandy(col, row);
      if (candy) {
        cleared.push(candy);
        this.grid[row][col] = null;
      }
    }
    return cleared;
  }

  /**
   * Clear entire column (for striped vertical candy)
   */
  clearColumn(col) {
    const cleared = [];
    for (let row = 0; row < this.rows; row++) {
      const candy = this.getCandy(col, row);
      if (candy) {
        cleared.push(candy);
        this.grid[row][col] = null;
      }
    }
    return cleared;
  }

  /**
   * Clear 3x3 area around position (for wrapped candy)
   */
  clear3x3(centerCol, centerRow) {
    const cleared = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const candy = this.getCandy(centerCol + dc, centerRow + dr);
        if (candy) {
          cleared.push(candy);
          this.grid[centerRow + dr][centerCol + dc] = null;
        }
      }
    }
    return cleared;
  }

  /**
   * Clear all candies of a specific type (for color bomb)
   */
  clearByType(type) {
    const cleared = [];
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const candy = this.getCandy(col, row);
        if (candy && candy.type === type) {
          cleared.push(candy);
          this.grid[row][col] = null;
        }
      }
    }
    return cleared;
  }
}

/**
 * Animation helper class
 */
export class Animation {
  constructor(type, duration, onUpdate, onComplete) {
    this.type = type;
    this.duration = duration;
    this.elapsed = 0;
    this.onUpdate = onUpdate;
    this.onComplete = onComplete;
    this.complete = false;
  }

  update(dt) {
    if (this.complete) return;

    this.elapsed += dt;
    const progress = Math.min(this.elapsed / this.duration, 1);

    if (this.onUpdate) {
      this.onUpdate(progress);
    }

    if (progress >= 1) {
      this.complete = true;
      if (this.onComplete) {
        this.onComplete();
      }
    }
  }
}

/**
 * Score popup for displaying points
 */
export class ScorePopup {
  constructor(x, y, points, combo = 1) {
    this.x = x;
    this.y = y;
    this.points = points;
    this.combo = combo;
    this.alpha = 1;
    this.life = 0;
    this.maxLife = 60;  // frames
  }

  update() {
    this.life++;
    this.y -= 1;  // Float up
    this.alpha = 1 - (this.life / this.maxLife);
    return this.life < this.maxLife;
  }
}

/**
 * Particle for effects
 */
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

/**
 * Create explosion particles
 */
export function createExplosion(x, y, color, count = 8) {
  const particles = [];
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, color));
  }
  return particles;
}

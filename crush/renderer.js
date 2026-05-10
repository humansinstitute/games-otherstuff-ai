/**
 * Candy Crush - Renderer
 * Grid-based candy rendering with animations
 */

import { SpecialType, CandyColors } from './entities.js';
import { GameMode } from './game.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;

    // Grid settings
    this.gridCols = 8;
    this.gridRows = 8;
    this.cellSize = 35;
    this.gridWidth = this.cellSize * this.gridCols;
    this.gridHeight = this.cellSize * this.gridRows;

    // Center the grid horizontally
    this.gridOffsetX = (this.width - this.gridWidth) / 2;
    this.gridOffsetY = 80; // Leave room for HUD at top

    // Colors
    this.bgColor = '#0a1628';
    this.gridBgColor = '#0d1a2d';
    this.gridLineColor = 'rgba(74, 154, 255, 0.15)';
    this.textColor = '#4a9eff';
    this.highlightColor = '#ffffff';
  }

  clear() {
    this.ctx.fillStyle = this.bgColor;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawBackground() {
    // Gradient background
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#0a1628');
    gradient.addColorStop(1, '#0d1f3c');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Subtle pattern
    this.ctx.fillStyle = 'rgba(74, 154, 255, 0.02)';
    for (let y = 0; y < this.height; y += 4) {
      for (let x = (y / 4) % 2 === 0 ? 0 : 2; x < this.width; x += 4) {
        this.ctx.fillRect(x, y, 2, 2);
      }
    }
  }

  drawBoard(board, selectedCell) {
    const ctx = this.ctx;

    // Draw grid background
    ctx.fillStyle = this.gridBgColor;
    ctx.fillRect(this.gridOffsetX - 2, this.gridOffsetY - 2,
                 this.gridWidth + 4, this.gridHeight + 4);

    // Draw grid border
    ctx.strokeStyle = 'rgba(74, 154, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.gridOffsetX - 2, this.gridOffsetY - 2,
                   this.gridWidth + 4, this.gridHeight + 4);

    // Draw grid lines
    ctx.strokeStyle = this.gridLineColor;
    ctx.lineWidth = 1;

    for (let col = 0; col <= this.gridCols; col++) {
      const x = this.gridOffsetX + col * this.cellSize;
      ctx.beginPath();
      ctx.moveTo(x, this.gridOffsetY);
      ctx.lineTo(x, this.gridOffsetY + this.gridHeight);
      ctx.stroke();
    }

    for (let row = 0; row <= this.gridRows; row++) {
      const y = this.gridOffsetY + row * this.cellSize;
      ctx.beginPath();
      ctx.moveTo(this.gridOffsetX, y);
      ctx.lineTo(this.gridOffsetX + this.gridWidth, y);
      ctx.stroke();
    }

    // Draw selected cell highlight
    if (selectedCell) {
      const pulse = Math.sin(Date.now() / 100) * 0.3 + 0.7;
      ctx.strokeStyle = `rgba(255, 255, 255, ${pulse})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(
        this.gridOffsetX + selectedCell.col * this.cellSize + 2,
        this.gridOffsetY + selectedCell.row * this.cellSize + 2,
        this.cellSize - 4,
        this.cellSize - 4
      );
    }

    // Draw candies
    for (let row = 0; row < board.rows; row++) {
      for (let col = 0; col < board.cols; col++) {
        const candy = board.getCandy(col, row);
        if (candy) {
          this.drawCandy(candy);
        }
      }
    }
  }

  drawCandy(candy) {
    const ctx = this.ctx;

    // Calculate pixel position from visual position (for animations)
    const pixelX = this.gridOffsetX + candy.x * this.cellSize + this.cellSize / 2;
    const pixelY = this.gridOffsetY + candy.y * this.cellSize + this.cellSize / 2;

    // Apply scale and alpha
    ctx.globalAlpha = candy.alpha;

    const radius = (this.cellSize / 2 - 4) * candy.scale;
    const color = candy.getColor();

    // Draw glow
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;

    // Draw candy based on special type
    switch (candy.special) {
      case SpecialType.STRIPED_H:
        this.drawStripedCandy(pixelX, pixelY, radius, color, 'horizontal');
        break;
      case SpecialType.STRIPED_V:
        this.drawStripedCandy(pixelX, pixelY, radius, color, 'vertical');
        break;
      case SpecialType.WRAPPED:
        this.drawWrappedCandy(pixelX, pixelY, radius, color);
        break;
      case SpecialType.COLOR_BOMB:
        this.drawColorBomb(pixelX, pixelY, radius);
        break;
      default:
        this.drawNormalCandy(pixelX, pixelY, radius, color);
    }

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  drawNormalCandy(x, y, radius, color) {
    const ctx = this.ctx;

    // Main circle
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    const gradient = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0,
                                               x, y, radius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  drawStripedCandy(x, y, radius, color, direction) {
    const ctx = this.ctx;

    // Base candy
    this.drawNormalCandy(x, y, radius, color);

    // Stripes
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius - 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 3;

    if (direction === 'horizontal') {
      for (let i = -3; i <= 3; i++) {
        const yOffset = i * 6;
        ctx.beginPath();
        ctx.moveTo(x - radius, y + yOffset);
        ctx.lineTo(x + radius, y + yOffset);
        ctx.stroke();
      }
    } else {
      for (let i = -3; i <= 3; i++) {
        const xOffset = i * 6;
        ctx.beginPath();
        ctx.moveTo(x + xOffset, y - radius);
        ctx.lineTo(x + xOffset, y + radius);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  drawWrappedCandy(x, y, radius, color) {
    const ctx = this.ctx;

    // Base candy
    this.drawNormalCandy(x, y, radius, color);

    // Wrapped effect - inner square
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2;
    const innerSize = radius * 0.7;
    ctx.strokeRect(x - innerSize, y - innerSize, innerSize * 2, innerSize * 2);

    // Corner decorations
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    for (const [dx, dy] of corners) {
      ctx.beginPath();
      ctx.arc(x + dx * innerSize, y + dy * innerSize, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawColorBomb(x, y, radius) {
    const ctx = this.ctx;

    // Rotating rainbow effect
    const time = Date.now() / 500;

    // Draw multicolored segments
    const colors = Object.values(CandyColors);
    const segmentAngle = (Math.PI * 2) / colors.length;

    for (let i = 0; i < colors.length; i++) {
      const startAngle = time + i * segmentAngle;
      const endAngle = startAngle + segmentAngle;

      ctx.fillStyle = colors[i];
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fill();
    }

    // White center
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Star pattern
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const angle = time * 2 + (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * radius * 0.8, y + Math.sin(angle) * radius * 0.8);
      ctx.stroke();
    }
  }

  getCandyPixelPosition(col, row) {
    return {
      x: this.gridOffsetX + col * this.cellSize + this.cellSize / 2,
      y: this.gridOffsetY + row * this.cellSize + this.cellSize / 2
    };
  }

  getCellFromPixel(pixelX, pixelY) {
    const col = Math.floor((pixelX - this.gridOffsetX) / this.cellSize);
    const row = Math.floor((pixelY - this.gridOffsetY) / this.cellSize);

    if (col >= 0 && col < this.gridCols && row >= 0 && row < this.gridRows) {
      return { col, row };
    }
    return null;
  }

  drawParticles(particles) {
    const ctx = this.ctx;

    for (const p of particles) {
      if (!p.active) continue;

      ctx.globalAlpha = p.getAlpha();
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 4;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  drawScorePopups(popups) {
    const ctx = this.ctx;

    for (const popup of popups) {
      ctx.globalAlpha = popup.alpha;
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillStyle = popup.combo > 1 ? '#ffa502' : '#ffffff';
      ctx.shadowColor = popup.combo > 1 ? '#ffa502' : '#ffffff';
      ctx.shadowBlur = 6;
      ctx.textAlign = 'center';

      let text = `+${popup.points}`;
      if (popup.combo > 1) {
        text += ` x${popup.combo}`;
      }

      ctx.fillText(text, popup.x, popup.y);
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  drawHUD(score, mode, moves, time, target, combo, bestScore) {
    const ctx = this.ctx;
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.textAlign = 'left';

    // Score (top left)
    ctx.fillStyle = this.textColor;
    ctx.fillText('SCORE', 15, 25);
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = this.textColor;
    ctx.shadowBlur = 6;
    ctx.fillText(score.toLocaleString(), 15, 48);
    ctx.shadowBlur = 0;

    // Best score (below score)
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.fillStyle = '#4a7a9e';
    ctx.fillText(`BEST: ${bestScore.toLocaleString()}`, 15, 65);

    // Mode-specific HUD (top right)
    ctx.textAlign = 'right';
    const rightX = this.width - 15;

    if (mode === GameMode.MOVES && moves >= 0) {
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillStyle = '#e8a030';
      ctx.fillText('MOVES', rightX, 25);
      ctx.font = 'bold 20px "Courier New", monospace';
      ctx.fillStyle = moves <= 5 ? '#ff4757' : '#ffffff';
      ctx.shadowColor = moves <= 5 ? '#ff4757' : '#e8a030';
      ctx.shadowBlur = 6;
      ctx.fillText(moves.toString(), rightX, 48);
      ctx.shadowBlur = 0;
    } else if (mode === GameMode.TIMED && time >= 0) {
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillStyle = '#2ed573';
      ctx.fillText('TIME', rightX, 25);
      ctx.font = 'bold 20px "Courier New", monospace';
      const timeInt = Math.ceil(time);
      ctx.fillStyle = timeInt <= 10 ? '#ff4757' : '#ffffff';
      ctx.shadowColor = timeInt <= 10 ? '#ff4757' : '#2ed573';
      ctx.shadowBlur = 6;
      ctx.fillText(timeInt.toString() + 's', rightX, 48);
      ctx.shadowBlur = 0;
    } else if (mode === GameMode.ENDLESS) {
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillStyle = '#a55eea';
      ctx.fillText('ENDLESS', rightX, 25);
    }

    // Target score (if applicable)
    if (target > 0) {
      ctx.font = 'bold 10px "Courier New", monospace';
      ctx.fillStyle = '#4a7a9e';
      ctx.fillText(`TARGET: ${target.toLocaleString()}`, rightX, 65);
    }

    // Combo indicator (center top)
    if (combo > 1) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 16px "Courier New", monospace';
      ctx.fillStyle = '#ffa502';
      ctx.shadowColor = '#ffa502';
      ctx.shadowBlur = 10;
      ctx.fillText(`COMBO x${combo}!`, this.width / 2, 40);
      ctx.shadowBlur = 0;
    }
  }

  drawGameOver(score, bestScore) {
    const ctx = this.ctx;

    // Overlay
    ctx.fillStyle = 'rgba(10, 22, 40, 0.9)';
    ctx.fillRect(0, 0, this.width, this.height);

    // Game Over text
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.fillStyle = '#ff6b6b';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 20;
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 60);

    // Score
    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.fillStyle = '#4a9eff';
    ctx.shadowColor = '#4a9eff';
    ctx.shadowBlur = 10;
    ctx.fillText(`Score: ${score.toLocaleString()}`, this.width / 2, this.height / 2 - 10);

    // Best score
    ctx.fillStyle = '#e8a030';
    ctx.shadowColor = '#e8a030';
    ctx.fillText(`Best: ${bestScore.toLocaleString()}`, this.width / 2, this.height / 2 + 20);

    // New best indicator
    if (score >= bestScore && score > 0) {
      ctx.fillStyle = '#00ff88';
      ctx.shadowColor = '#00ff88';
      ctx.fillText('NEW BEST!', this.width / 2, this.height / 2 + 50);
    }

    ctx.shadowBlur = 0;
  }

  drawVictory(score) {
    const ctx = this.ctx;

    // Overlay
    ctx.fillStyle = 'rgba(10, 22, 40, 0.9)';
    ctx.fillRect(0, 0, this.width, this.height);

    // Victory text
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.fillStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 25;
    ctx.textAlign = 'center';
    ctx.fillText('VICTORY!', this.width / 2, this.height / 2 - 50);

    // Target reached
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillStyle = '#4a9eff';
    ctx.shadowColor = '#4a9eff';
    ctx.shadowBlur = 10;
    ctx.fillText('Target score reached!', this.width / 2, this.height / 2);

    // Final score
    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.fillStyle = '#e8a030';
    ctx.shadowColor = '#e8a030';
    ctx.fillText(`Final Score: ${score.toLocaleString()}`, this.width / 2, this.height / 2 + 40);

    ctx.shadowBlur = 0;
  }

  drawMessage(message) {
    const ctx = this.ctx;

    // Semi-transparent background
    ctx.fillStyle = 'rgba(10, 22, 40, 0.8)';
    const boxWidth = 260;
    const boxHeight = 50;
    ctx.fillRect(
      (this.width - boxWidth) / 2,
      (this.height - boxHeight) / 2,
      boxWidth,
      boxHeight
    );

    // Border
    ctx.strokeStyle = '#4a9eff';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      (this.width - boxWidth) / 2,
      (this.height - boxHeight) / 2,
      boxWidth,
      boxHeight
    );

    // Text
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#4a9eff';
    ctx.shadowBlur = 8;
    ctx.textAlign = 'center';
    ctx.fillText(message, this.width / 2, this.height / 2 + 5);

    ctx.shadowBlur = 0;
  }
}

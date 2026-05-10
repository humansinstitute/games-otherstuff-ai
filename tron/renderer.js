/**
 * Tron Bike - Renderer
 * Neon glow effects for the light cycle arena
 */

export class Renderer {
  constructor(canvas, cellSize, gridWidth, gridHeight) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.cellSize = cellSize;
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;

    // Colors
    this.bgColor = '#0a0a1a';
    this.gridColor = 'rgba(0, 150, 255, 0.08)';
    this.borderColor = '#0066cc';
    this.textColor = '#00ffff';
  }

  clear() {
    this.ctx.fillStyle = this.bgColor;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawGrid() {
    const ctx = this.ctx;

    // Draw grid lines
    ctx.strokeStyle = this.gridColor;
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x <= this.width; x += this.cellSize * 4) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= this.height; y += this.cellSize * 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    // Draw arena border with glow
    ctx.strokeStyle = this.borderColor;
    ctx.shadowColor = this.borderColor;
    ctx.shadowBlur = 15;
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, this.width - 4, this.height - 4);
    ctx.shadowBlur = 0;
  }

  drawTrail(bike) {
    if (!bike || bike.trail.length < 2) return;

    const ctx = this.ctx;
    const cs = this.cellSize;

    // Draw trail with glow
    ctx.strokeStyle = bike.trailColor;
    ctx.shadowColor = bike.color;
    ctx.shadowBlur = 8;
    ctx.lineWidth = cs - 2;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';

    ctx.beginPath();
    ctx.moveTo(
      bike.trail[0].x * cs + cs / 2,
      bike.trail[0].y * cs + cs / 2
    );

    for (let i = 1; i < bike.trail.length; i++) {
      ctx.lineTo(
        bike.trail[i].x * cs + cs / 2,
        bike.trail[i].y * cs + cs / 2
      );
    }

    // Connect to current position
    ctx.lineTo(
      bike.x * cs + cs / 2,
      bike.y * cs + cs / 2
    );

    ctx.stroke();

    // Draw brighter core
    ctx.strokeStyle = bike.color;
    ctx.shadowBlur = 4;
    ctx.lineWidth = cs / 2;

    ctx.beginPath();
    ctx.moveTo(
      bike.trail[0].x * cs + cs / 2,
      bike.trail[0].y * cs + cs / 2
    );

    for (let i = 1; i < bike.trail.length; i++) {
      ctx.lineTo(
        bike.trail[i].x * cs + cs / 2,
        bike.trail[i].y * cs + cs / 2
      );
    }

    ctx.lineTo(
      bike.x * cs + cs / 2,
      bike.y * cs + cs / 2
    );

    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  drawBike(bike) {
    if (!bike) return;

    const ctx = this.ctx;
    const cs = this.cellSize;
    const x = bike.x * cs;
    const y = bike.y * cs;

    // Draw bike head with strong glow
    ctx.fillStyle = bike.color;
    ctx.shadowColor = bike.color;
    ctx.shadowBlur = 15;

    // Draw a larger, more visible bike head
    const headSize = cs * 1.5;
    const offset = (cs - headSize) / 2;

    ctx.beginPath();
    ctx.arc(x + cs / 2, y + cs / 2, headSize / 2, 0, Math.PI * 2);
    ctx.fill();

    // Inner bright core
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(x + cs / 2, y + cs / 2, headSize / 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  drawCrash(bike) {
    if (!bike) return;

    const ctx = this.ctx;
    const cs = this.cellSize;
    const x = bike.x * cs + cs / 2;
    const y = bike.y * cs + cs / 2;

    // Draw explosion effect
    const time = Date.now();
    const pulseSize = 20 + Math.sin(time / 50) * 10;

    ctx.strokeStyle = '#ff0000';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 20;
    ctx.lineWidth = 3;

    // Concentric circles
    for (let i = 0; i < 3; i++) {
      const radius = pulseSize + i * 15;
      ctx.globalAlpha = 1 - (i * 0.3);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // X marks the spot
    ctx.globalAlpha = 1;
    ctx.lineWidth = 4;
    const size = 15;
    ctx.beginPath();
    ctx.moveTo(x - size, y - size);
    ctx.lineTo(x + size, y + size);
    ctx.moveTo(x + size, y - size);
    ctx.lineTo(x - size, y + size);
    ctx.stroke();

    ctx.shadowBlur = 0;
  }

  drawCountdown(value) {
    const ctx = this.ctx;

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(10, 10, 26, 0.7)';
    ctx.fillRect(0, 0, this.width, this.height);

    // Countdown number
    ctx.font = 'bold 80px "Courier New", monospace';
    ctx.fillStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 30;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const text = value === 0 ? 'GO!' : value.toString();
    ctx.fillText(text, this.width / 2, this.height / 2);

    ctx.shadowBlur = 0;
  }

  drawHUD(wins, losses, level, round) {
    const ctx = this.ctx;
    ctx.font = 'bold 11px "Courier New", monospace';

    // Level (top left) - green
    ctx.fillStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 4;
    ctx.textAlign = 'left';
    ctx.fillText(`LVL ${level}`, 12, 20);

    // Player wins - cyan
    ctx.fillStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.fillText(`W:${wins}`, 70, 20);

    // AI wins (losses) - orange
    ctx.fillStyle = '#ff6600';
    ctx.shadowColor = '#ff6600';
    ctx.textAlign = 'right';
    ctx.fillText(`CPU:${losses}`, this.width - 12, 20);

    // Round (top center)
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`R${round}`, this.width / 2, 20);

    ctx.shadowBlur = 0;
  }

  drawGameOver() {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(10, 10, 26, 0.85)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.font = 'bold 32px "Courier New", monospace';
    ctx.fillStyle = '#ff0000';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 20;
    ctx.textAlign = 'center';
    ctx.fillText('DEREZZ', this.width / 2, this.height / 2 - 20);

    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillStyle = '#ff6666';
    ctx.shadowBlur = 10;
    ctx.fillText('You crashed!', this.width / 2, this.height / 2 + 20);

    ctx.shadowBlur = 0;
  }

  drawVictory() {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(10, 10, 26, 0.85)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.font = 'bold 32px "Courier New", monospace';
    ctx.fillStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 25;
    ctx.textAlign = 'center';
    ctx.fillText('VICTORY', this.width / 2, this.height / 2 - 20);

    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillStyle = '#00ffff';
    ctx.shadowBlur = 10;
    ctx.fillText('Opponent derezzed!', this.width / 2, this.height / 2 + 20);

    ctx.shadowBlur = 0;
  }
}

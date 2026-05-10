/**
 * Pong - Renderer
 * All canvas rendering with neon glow effects
 */

import { LEVELS } from './levels.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;

    // Colors
    this.bgColor = '#0a1628';
    this.gridColor = 'rgba(74, 154, 255, 0.03)';
    this.textColor = '#4a9eff';
    this.centerLineColor = 'rgba(74, 154, 255, 0.3)';
  }

  clear() {
    this.ctx.fillStyle = this.bgColor;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawGrid() {
    const ctx = this.ctx;
    ctx.strokeStyle = this.gridColor;
    ctx.lineWidth = 1;

    const gridSize = 20;
    for (let x = 0; x <= this.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y <= this.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }
  }

  drawCenterLine() {
    const ctx = this.ctx;
    ctx.strokeStyle = this.centerLineColor;
    ctx.lineWidth = 3;
    ctx.setLineDash([15, 10]);

    ctx.beginPath();
    ctx.moveTo(this.width / 2, 0);
    ctx.lineTo(this.width / 2, this.height);
    ctx.stroke();

    ctx.setLineDash([]);
  }

  drawPaddle(paddle) {
    if (!paddle || !paddle.active) return;

    const ctx = this.ctx;

    // Glow effect
    ctx.shadowColor = paddle.glowColor;
    ctx.shadowBlur = 15;
    ctx.fillStyle = paddle.color;

    // Draw paddle with rounded corners
    const radius = 4;
    ctx.beginPath();
    ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, radius);
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  drawBall(ball) {
    if (!ball || !ball.active) return;

    const ctx = this.ctx;

    // Draw trail
    if (ball.trail.length > 0) {
      for (let i = 0; i < ball.trail.length; i++) {
        const pos = ball.trail[i];
        const alpha = (1 - i / ball.trail.length) * 0.3;
        const size = ball.size * (1 - i / ball.trail.length * 0.5);

        ctx.globalAlpha = alpha;
        ctx.fillStyle = ball.color;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Glow effect
    ctx.shadowColor = ball.glowColor;
    ctx.shadowBlur = 12;
    ctx.fillStyle = ball.color;

    // Draw ball
    ctx.beginPath();
    ctx.arc(
      ball.x + ball.width / 2,
      ball.y + ball.height / 2,
      ball.size / 2,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  drawParticle(particle) {
    if (!particle.active) return;

    const ctx = this.ctx;
    ctx.globalAlpha = particle.getAlpha();
    ctx.fillStyle = particle.color;
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = 4;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  drawParticles(particles) {
    for (const p of particles) {
      this.drawParticle(p);
    }
  }

  drawHUD(score, playerPoints, aiPoints, levelIndex, pointsToWin, bestScore) {
    const ctx = this.ctx;
    const level = LEVELS[levelIndex];

    // Total score (top left)
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.fillStyle = this.textColor;
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 10, 20);

    // Best score
    ctx.fillStyle = '#4a7a9e';
    ctx.fillText(`BEST: ${bestScore}`, 10, 35);

    // Level name (top center)
    ctx.fillStyle = '#e8a030';
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL ${levelIndex + 1}`, this.width / 2, 20);
    ctx.fillStyle = '#4a7a9e';
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.fillText(level ? level.name : '', this.width / 2, 33);

    // Points to win
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.fillStyle = '#4a7a9e';
    ctx.fillText(`First to ${pointsToWin}`, this.width / 2, 48);

    // Match score (large, center)
    ctx.font = 'bold 48px "Courier New", monospace';
    ctx.textAlign = 'center';

    // Player score (green)
    ctx.fillStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 10;
    ctx.fillText(playerPoints.toString(), this.width / 2 - 50, this.height / 2 + 15);

    // Dash
    ctx.fillStyle = '#4a7a9e';
    ctx.shadowBlur = 0;
    ctx.fillText('-', this.width / 2, this.height / 2 + 15);

    // AI score (red)
    ctx.fillStyle = '#ff4444';
    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur = 10;
    ctx.fillText(aiPoints.toString(), this.width / 2 + 50, this.height / 2 + 15);

    ctx.shadowBlur = 0;
  }

  drawPointScored(scorer, levelName) {
    const ctx = this.ctx;

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(10, 22, 40, 0.5)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.textAlign = 'center';

    if (scorer === 'player') {
      ctx.fillStyle = '#00ff88';
      ctx.shadowColor = '#00ff88';
    } else {
      ctx.fillStyle = '#ff4444';
      ctx.shadowColor = '#ff4444';
    }
    ctx.shadowBlur = 15;

    const text = scorer === 'player' ? 'POINT!' : 'OPPONENT SCORES';
    ctx.fillText(text, this.width / 2, this.height / 2 + 80);

    ctx.shadowBlur = 0;
  }

  drawLevelComplete(levelName, score) {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(10, 22, 40, 0.85)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 15;
    ctx.textAlign = 'center';
    ctx.fillText('LEVEL COMPLETE!', this.width / 2, this.height / 2 - 30);

    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillStyle = '#4a9eff';
    ctx.shadowColor = '#4a9eff';
    ctx.fillText(levelName, this.width / 2, this.height / 2 + 10);

    ctx.fillStyle = '#e8a030';
    ctx.shadowColor = '#e8a030';
    ctx.fillText(`Score: ${score}`, this.width / 2, this.height / 2 + 40);

    ctx.shadowBlur = 0;
  }

  drawGameOver(score, bestScore, levelReached) {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(10, 22, 40, 0.9)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.fillStyle = '#ff6b6b';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 20;
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 70);

    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillStyle = '#4a7a9e';
    ctx.shadowBlur = 0;
    ctx.fillText(`Reached Level ${levelReached}`, this.width / 2, this.height / 2 - 35);

    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.fillStyle = '#4a9eff';
    ctx.shadowColor = '#4a9eff';
    ctx.shadowBlur = 10;
    ctx.fillText(`Score: ${score}`, this.width / 2, this.height / 2);

    ctx.fillStyle = '#e8a030';
    ctx.shadowColor = '#e8a030';
    ctx.fillText(`Best: ${bestScore}`, this.width / 2, this.height / 2 + 30);

    ctx.shadowBlur = 0;
  }

  drawVictory(score) {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(10, 22, 40, 0.9)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.fillStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 25;
    ctx.textAlign = 'center';
    ctx.fillText('VICTORY!', this.width / 2, this.height / 2 - 60);

    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillStyle = '#4a9eff';
    ctx.shadowColor = '#4a9eff';
    ctx.shadowBlur = 10;
    ctx.fillText('You are the PONG GOD!', this.width / 2, this.height / 2 - 20);

    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.fillStyle = '#e8a030';
    ctx.shadowColor = '#e8a030';
    ctx.fillText(`Final Score: ${score}`, this.width / 2, this.height / 2 + 20);

    ctx.shadowBlur = 0;
  }
}

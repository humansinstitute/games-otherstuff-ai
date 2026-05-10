/**
 * Space Invaders - Renderer
 * All canvas rendering with neon glow effects
 */

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

    // Starfield
    this.stars = this.createStarfield(50);
  }

  createStarfield(count) {
    const stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 2 + 0.5,
        brightness: Math.random() * 0.5 + 0.3,
        speed: Math.random() * 0.3 + 0.1
      });
    }
    return stars;
  }

  updateStarfield() {
    for (const star of this.stars) {
      star.y += star.speed;
      if (star.y > this.height) {
        star.y = 0;
        star.x = Math.random() * this.width;
      }
    }
  }

  clear() {
    this.ctx.fillStyle = this.bgColor;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawGrid() {
    this.ctx.strokeStyle = this.gridColor;
    this.ctx.lineWidth = 1;

    const gridSize = 20;
    for (let x = 0; x <= this.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }
    for (let y = 0; y <= this.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
  }

  drawStarfield() {
    this.updateStarfield();
    for (const star of this.stars) {
      this.ctx.globalAlpha = star.brightness;
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(star.x, star.y, star.size, star.size);
    }
    this.ctx.globalAlpha = 1;
  }

  drawPlayer(player) {
    if (!player.active) return;

    // Flicker when invincible
    if (player.isInvincible && Math.floor(player.invincibleTimer / 4) % 2 === 0) {
      return;
    }

    const ctx = this.ctx;
    ctx.shadowColor = player.glowColor;
    ctx.shadowBlur = 12;
    ctx.fillStyle = player.color;

    // Triangle ship shape
    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y);
    ctx.lineTo(player.x, player.y + player.height);
    ctx.lineTo(player.x + player.width, player.y + player.height);
    ctx.closePath();
    ctx.fill();

    // Engine glow
    ctx.shadowColor = '#ff8c00';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ff8c00';
    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2 - 4, player.y + player.height);
    ctx.lineTo(player.x + player.width / 2, player.y + player.height + 8);
    ctx.lineTo(player.x + player.width / 2 + 4, player.y + player.height);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  drawEnemy(enemy) {
    if (!enemy.active) return;

    const ctx = this.ctx;
    ctx.shadowColor = enemy.glowColor;
    ctx.shadowBlur = 8;
    ctx.fillStyle = enemy.color;

    // Simple blocky alien shape
    const x = enemy.x;
    const y = enemy.y;
    const w = enemy.width;
    const h = enemy.height;

    // Main body
    ctx.fillRect(x + w * 0.2, y, w * 0.6, h * 0.6);
    ctx.fillRect(x, y + h * 0.3, w, h * 0.4);

    // "Eyes" - small darker rectangles
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(x + w * 0.25, y + h * 0.35, w * 0.15, h * 0.2);
    ctx.fillRect(x + w * 0.6, y + h * 0.35, w * 0.15, h * 0.2);

    // Antenna animation
    ctx.fillStyle = enemy.color;
    if (enemy.animFrame === 0) {
      ctx.fillRect(x + w * 0.1, y - h * 0.2, w * 0.1, h * 0.25);
      ctx.fillRect(x + w * 0.8, y - h * 0.2, w * 0.1, h * 0.25);
    } else {
      ctx.fillRect(x, y - h * 0.15, w * 0.1, h * 0.2);
      ctx.fillRect(x + w * 0.9, y - h * 0.15, w * 0.1, h * 0.2);
    }

    ctx.shadowBlur = 0;
  }

  drawBoss(boss) {
    if (!boss.active) return;

    const ctx = this.ctx;

    // Pulsing glow intensity based on health
    const healthPercent = boss.health / boss.maxHealth;
    const pulseIntensity = 15 + Math.sin(Date.now() / 150) * 5;

    ctx.shadowColor = boss.glowColor;
    ctx.shadowBlur = pulseIntensity;
    ctx.fillStyle = boss.color;

    // Main body - more complex shape
    const x = boss.x;
    const y = boss.y;
    const w = boss.width;
    const h = boss.height;

    // Core
    ctx.fillRect(x + w * 0.1, y + h * 0.2, w * 0.8, h * 0.6);
    // Top
    ctx.fillRect(x + w * 0.2, y, w * 0.6, h * 0.3);
    // Wings
    ctx.fillRect(x, y + h * 0.3, w * 0.2, h * 0.4);
    ctx.fillRect(x + w * 0.8, y + h * 0.3, w * 0.2, h * 0.4);

    // Eye (changes color with phase)
    const eyeColors = ['#4a9eff', '#f39c12', '#ff0000'];
    ctx.fillStyle = eyeColors[boss.phase - 1] || '#4a9eff';
    ctx.shadowColor = eyeColors[boss.phase - 1] || '#4a9eff';
    ctx.fillRect(x + w * 0.35, y + h * 0.35, w * 0.3, h * 0.2);

    ctx.shadowBlur = 0;

    // Health bar
    this.drawBossHealthBar(boss);
  }

  drawBossHealthBar(boss) {
    const ctx = this.ctx;
    const barWidth = boss.width;
    const barHeight = 6;
    const x = boss.x;
    const y = boss.y - 15;

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(x, y, barWidth, barHeight);

    // Health fill
    const healthPercent = boss.health / boss.maxHealth;
    const fillColor = healthPercent > 0.5 ? '#00ff88' :
                      healthPercent > 0.25 ? '#f39c12' : '#ff6b6b';

    ctx.shadowColor = fillColor;
    ctx.shadowBlur = 4;
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, barWidth * healthPercent, barHeight);

    ctx.shadowBlur = 0;

    // Border
    ctx.strokeStyle = '#4a7a9e';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, barWidth, barHeight);
  }

  drawBullet(bullet) {
    if (!bullet.active) return;

    const ctx = this.ctx;
    ctx.shadowColor = bullet.glowColor;
    ctx.shadowBlur = 6;
    ctx.fillStyle = bullet.color;
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    ctx.shadowBlur = 0;
  }

  drawShields(shields) {
    const ctx = this.ctx;

    for (const block of shields) {
      if (!block.active) continue;

      const alpha = block.getAlpha();
      ctx.globalAlpha = alpha;

      // Color based on damage
      if (block.health === block.maxHealth) {
        ctx.fillStyle = '#4a7a9e';
        ctx.shadowColor = '#4a9eff';
      } else if (block.health === 2) {
        ctx.fillStyle = '#3a5a7e';
        ctx.shadowColor = '#3a7adf';
      } else {
        ctx.fillStyle = '#2a4a5e';
        ctx.shadowColor = '#2a5abf';
      }

      ctx.shadowBlur = 4;
      ctx.fillRect(block.x, block.y, block.width, block.height);
    }

    ctx.globalAlpha = 1;
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

  drawHUD(score, lives, stage, wave, bestScore) {
    const ctx = this.ctx;
    ctx.font = 'bold 12px "Courier New", monospace';

    // Score (top left)
    ctx.fillStyle = this.textColor;
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 10, 20);

    // Best score
    ctx.fillStyle = '#4a7a9e';
    ctx.fillText(`BEST: ${bestScore}`, 10, 35);

    // Stage/Wave (top center)
    ctx.fillStyle = '#e8a030';
    ctx.textAlign = 'center';
    ctx.fillText(`STAGE ${stage + 1}`, this.width / 2, 20);
    ctx.fillStyle = '#4a7a9e';
    ctx.fillText(`WAVE ${wave + 1}`, this.width / 2, 35);

    // Lives (top right) - draw small ships
    ctx.textAlign = 'right';
    ctx.fillStyle = '#00ff88';
    const livesX = this.width - 10;
    for (let i = 0; i < lives; i++) {
      const x = livesX - i * 20 - 15;
      ctx.beginPath();
      ctx.moveTo(x + 6, 12);
      ctx.lineTo(x, 22);
      ctx.lineTo(x + 12, 22);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawWaveTransition(text, progress) {
    const ctx = this.ctx;

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(10, 22, 40, 0.7)';
    ctx.fillRect(0, 0, this.width, this.height);

    // Text
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.fillStyle = '#e8a030';
    ctx.shadowColor = '#e8a030';
    ctx.shadowBlur = 15;
    ctx.textAlign = 'center';
    ctx.fillText(text, this.width / 2, this.height / 2);

    ctx.shadowBlur = 0;
  }

  drawBossIntro(bossName, timer) {
    const ctx = this.ctx;

    // Dark overlay
    ctx.fillStyle = 'rgba(10, 22, 40, 0.85)';
    ctx.fillRect(0, 0, this.width, this.height);

    // Warning text - flashing
    if (Math.floor(timer / 15) % 2 === 0) {
      ctx.font = 'bold 18px "Courier New", monospace';
      ctx.fillStyle = '#e74c3c';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 20;
      ctx.textAlign = 'center';
      ctx.fillText('! WARNING !', this.width / 2, this.height / 2 - 40);
    }

    // Boss name
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.fillStyle = '#ff6b6b';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 25;
    ctx.fillText(bossName, this.width / 2, this.height / 2 + 10);

    ctx.shadowBlur = 0;
  }

  drawStageComplete(stageName, score) {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(10, 22, 40, 0.85)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 15;
    ctx.textAlign = 'center';
    ctx.fillText('STAGE COMPLETE!', this.width / 2, this.height / 2 - 30);

    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillStyle = '#4a9eff';
    ctx.shadowColor = '#4a9eff';
    ctx.fillText(stageName, this.width / 2, this.height / 2 + 10);

    ctx.fillStyle = '#e8a030';
    ctx.shadowColor = '#e8a030';
    ctx.fillText(`Score: ${score}`, this.width / 2, this.height / 2 + 40);

    ctx.shadowBlur = 0;
  }

  drawGameOver(score, bestScore) {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(10, 22, 40, 0.9)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.fillStyle = '#ff6b6b';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 20;
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 60);

    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.fillStyle = '#4a9eff';
    ctx.shadowColor = '#4a9eff';
    ctx.shadowBlur = 10;
    ctx.fillText(`Score: ${score}`, this.width / 2, this.height / 2 - 10);

    ctx.fillStyle = '#e8a030';
    ctx.shadowColor = '#e8a030';
    ctx.fillText(`Best: ${bestScore}`, this.width / 2, this.height / 2 + 20);

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
    ctx.fillText('VICTORY!', this.width / 2, this.height / 2 - 50);

    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillStyle = '#4a9eff';
    ctx.shadowColor = '#4a9eff';
    ctx.shadowBlur = 10;
    ctx.fillText('You defended the galaxy!', this.width / 2, this.height / 2);

    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.fillStyle = '#e8a030';
    ctx.shadowColor = '#e8a030';
    ctx.fillText(`Final Score: ${score}`, this.width / 2, this.height / 2 + 40);

    ctx.shadowBlur = 0;
  }
}

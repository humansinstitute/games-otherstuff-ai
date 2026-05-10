/**
 * Donkey Kong Style Platformer - Renderer
 * All canvas rendering for platformer graphics
 */

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;

    // Colors - farm/barn theme
    this.bgColor = '#1a2a1a';
    this.textColor = '#f1c40f';
  }

  clear() {
    this.ctx.fillStyle = this.bgColor;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawBackground() {
    const ctx = this.ctx;

    // Draw a subtle grid pattern (barn boards)
    ctx.strokeStyle = 'rgba(139, 69, 19, 0.1)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= this.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }

    for (let y = 0; y <= this.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }
  }

  drawPlatforms(platforms) {
    const ctx = this.ctx;

    for (const platform of platforms) {
      if (!platform.active) continue;

      // Main platform body
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);

      // Top highlight
      ctx.fillStyle = '#A0522D';
      ctx.fillRect(platform.x, platform.y, platform.width, 3);

      // Wood grain lines
      ctx.strokeStyle = '#5D3A1A';
      ctx.lineWidth = 1;
      for (let i = 0; i < platform.width; i += 20) {
        ctx.beginPath();
        ctx.moveTo(platform.x + i, platform.y);
        ctx.lineTo(platform.x + i, platform.y + platform.height);
        ctx.stroke();
      }

      // Bottom shadow
      ctx.fillStyle = '#5D3A1A';
      ctx.fillRect(platform.x, platform.y + platform.height - 2, platform.width, 2);
    }
  }

  drawLadders(ladders) {
    const ctx = this.ctx;

    for (const ladder of ladders) {
      if (!ladder.active) continue;

      const x = ladder.x;
      const y = ladder.y;
      const w = ladder.width;
      const h = ladder.height;

      // Side rails
      ctx.fillStyle = '#DAA520';
      ctx.fillRect(x, y, 4, h);
      ctx.fillRect(x + w - 4, y, 4, h);

      // Rungs
      const rungSpacing = 15;
      const rungCount = Math.floor(h / rungSpacing);
      ctx.fillStyle = '#B8860B';

      for (let i = 0; i < rungCount; i++) {
        const ry = y + i * rungSpacing + 5;
        ctx.fillRect(x + 4, ry, w - 8, 4);
      }

      // Highlight on rails
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(x + 1, y, 1, h);
      ctx.fillRect(x + w - 3, y, 1, h);
    }
  }

  drawPlayer(player) {
    if (!player.active) return;

    // Flicker when invincible
    if (player.isInvincible && Math.floor(player.invincibleTimer / 4) % 2 === 0) {
      return;
    }

    const ctx = this.ctx;
    const x = player.x;
    const y = player.y;
    const w = player.width;
    const h = player.height;

    // Draw facing direction
    const facing = player.facingRight ? 1 : -1;
    const centerX = x + w / 2;

    ctx.save();
    if (!player.facingRight) {
      ctx.translate(centerX, 0);
      ctx.scale(-1, 1);
      ctx.translate(-centerX, 0);
    }

    // Glow effect
    ctx.shadowColor = player.glowColor;
    ctx.shadowBlur = 8;

    // Body (blue)
    ctx.fillStyle = player.bodyColor;
    ctx.fillRect(x + 4, y + 12, w - 8, h - 12);

    // Head (yellow)
    ctx.fillStyle = player.headColor;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 8, 8, 0, Math.PI * 2);
    ctx.fill();

    // Face details (eyes)
    ctx.fillStyle = '#000';
    ctx.fillRect(x + w / 2 + 2, y + 6, 2, 3);

    // Arms
    ctx.fillStyle = player.bodyColor;
    const armOffset = player.animFrame % 2 === 0 ? 0 : 2;
    ctx.fillRect(x, y + 14 + armOffset, 4, 10);
    ctx.fillRect(x + w - 4, y + 14 - armOffset, 4, 10);

    // Legs - animate when moving
    ctx.fillStyle = '#2980b9';
    if (player.velocityX !== 0) {
      const legOffset = player.animFrame % 2 === 0 ? 3 : -3;
      ctx.fillRect(x + 6, y + h - 8, 5, 8);
      ctx.fillRect(x + w - 11 + legOffset, y + h - 8, 5, 8);
    } else {
      ctx.fillRect(x + 6, y + h - 8, 5, 8);
      ctx.fillRect(x + w - 11, y + h - 8, 5, 8);
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  drawBoss(boss) {
    if (!boss || !boss.active) return;

    const ctx = this.ctx;
    const x = boss.x;
    const y = boss.y;
    const w = boss.width;
    const h = boss.height;

    // Glow effect
    ctx.shadowColor = boss.glowColor;
    ctx.shadowBlur = 10;

    // Body (white with spots)
    ctx.fillStyle = boss.bodyColor;
    ctx.fillRect(x + 10, y + 15, w - 20, h - 15);

    // Head
    ctx.beginPath();
    ctx.ellipse(x + 15, y + 25, 15, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Spots (black)
    ctx.fillStyle = boss.spotColor;
    ctx.beginPath();
    ctx.ellipse(x + 25, y + 25, 6, 4, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 40, y + 30, 5, 3, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 35, y + 40, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.fillStyle = boss.bodyColor;
    ctx.fillRect(x + 12, y + h - 8, 6, 8);
    ctx.fillRect(x + 22, y + h - 8, 6, 8);
    ctx.fillRect(x + w - 28, y + h - 8, 6, 8);
    ctx.fillRect(x + w - 18, y + h - 8, 6, 8);

    // Hooves (dark)
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(x + 12, y + h - 3, 6, 3);
    ctx.fillRect(x + 22, y + h - 3, 6, 3);
    ctx.fillRect(x + w - 28, y + h - 3, 6, 3);
    ctx.fillRect(x + w - 18, y + h - 3, 6, 3);

    // Face
    ctx.fillStyle = '#FFE4C4';
    ctx.beginPath();
    ctx.ellipse(x + 8, y + 28, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x + 10, y + 20, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 18, y + 20, 2, 0, Math.PI * 2);
    ctx.fill();

    // Nostrils
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.ellipse(x + 6, y + 28, 2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 12, y + 28, 2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Horns
    ctx.fillStyle = '#D2B48C';
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 12);
    ctx.lineTo(x + 3, y);
    ctx.lineTo(x + 12, y + 10);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 20, y + 12);
    ctx.lineTo(x + 25, y);
    ctx.lineTo(x + 16, y + 10);
    ctx.fill();

    // Tail (animated)
    ctx.strokeStyle = boss.bodyColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + w - 10, y + 20);
    ctx.quadraticCurveTo(
      x + w + 5 + Math.sin(Date.now() / 200) * 5,
      y + 25,
      x + w,
      y + 35
    );
    ctx.stroke();

    // Tail tuft
    ctx.fillStyle = boss.spotColor;
    ctx.beginPath();
    ctx.ellipse(x + w, y + 35, 4, 6, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Udder (it's a cow after all)
    ctx.fillStyle = '#FFB6C1';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h - 5, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();

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

  drawBarrel(barrel) {
    if (!barrel.active) return;

    const ctx = this.ctx;
    const x = barrel.x;
    const y = barrel.y;
    const w = barrel.width;
    const h = barrel.height;

    ctx.save();

    // Rotate barrel
    const centerX = x + w / 2;
    const centerY = y + h / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate(barrel.rotation);
    ctx.translate(-centerX, -centerY);

    // Barrel body
    ctx.fillStyle = barrel.color;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rim bands
    ctx.strokeStyle = barrel.rimColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY - 3, w / 2 - 2, h / 2 - 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 3, w / 2 - 2, h / 2 - 4, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Center hole pattern
    ctx.fillStyle = '#5D3A1A';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawGoal(goal) {
    if (!goal || !goal.active) return;

    const ctx = this.ctx;
    const x = goal.x;
    const y = goal.y + goal.bobOffset;
    const w = goal.width;
    const h = goal.height;

    // Glow
    ctx.shadowColor = goal.glowColor;
    ctx.shadowBlur = 15;

    // Flag pole
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x + w - 4, y, 4, h + 10);

    // Flag
    ctx.fillStyle = '#FF69B4';
    ctx.beginPath();
    ctx.moveTo(x + w - 4, y);
    ctx.lineTo(x, y + 8);
    ctx.lineTo(x + w - 4, y + 16);
    ctx.fill();

    // Star on flag
    ctx.fillStyle = '#FFD700';
    this.drawStar(x + w / 2 - 2, y + 8, 4, 5);

    ctx.shadowBlur = 0;
  }

  drawStar(cx, cy, radius, points) {
    const ctx = this.ctx;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? radius : radius / 2;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  drawCollectibles(collectibles) {
    const ctx = this.ctx;

    for (const c of collectibles) {
      if (!c.active) continue;

      const x = c.x;
      const y = c.y + c.bobOffset;

      ctx.shadowColor = c.glowColor;
      ctx.shadowBlur = 8;

      if (c.type === 'coin') {
        // Gold coin
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.ellipse(x + 8, y + 8, 7, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Shine
        ctx.fillStyle = '#FFF8DC';
        ctx.beginPath();
        ctx.ellipse(x + 6, y + 6, 2, 2, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Gem
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.moveTo(x + 8, y);
        ctx.lineTo(x + 16, y + 8);
        ctx.lineTo(x + 8, y + 16);
        ctx.lineTo(x, y + 8);
        ctx.closePath();
        ctx.fill();

        // Shine
        ctx.fillStyle = '#FFB6C1';
        ctx.beginPath();
        ctx.moveTo(x + 8, y + 3);
        ctx.lineTo(x + 12, y + 8);
        ctx.lineTo(x + 8, y + 10);
        ctx.lineTo(x + 5, y + 8);
        ctx.closePath();
        ctx.fill();
      }

      ctx.shadowBlur = 0;
    }
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

  drawHUD(score, lives, level, bestScore) {
    const ctx = this.ctx;
    ctx.font = 'bold 12px "Courier New", monospace';

    // Score (top left)
    ctx.fillStyle = this.textColor;
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 10, 20);

    // Best score
    ctx.fillStyle = '#8B7355';
    ctx.fillText(`BEST: ${bestScore}`, 10, 35);

    // Level (top center)
    ctx.fillStyle = '#e8a030';
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL ${level + 1}`, this.width / 2, 20);

    // Lives (top right) - draw small player icons
    ctx.textAlign = 'right';
    ctx.fillStyle = '#3498db';
    const livesX = this.width - 10;
    for (let i = 0; i < lives; i++) {
      const x = livesX - i * 18 - 12;
      // Mini player
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.arc(x + 6, 14, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3498db';
      ctx.fillRect(x + 3, 18, 6, 8);
    }
  }

  drawLevelTransition(levelName, progress) {
    const ctx = this.ctx;

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(26, 42, 26, 0.8)';
    ctx.fillRect(0, 0, this.width, this.height);

    // Level name
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.fillStyle = '#f1c40f';
    ctx.shadowColor = '#f1c40f';
    ctx.shadowBlur = 15;
    ctx.textAlign = 'center';
    ctx.fillText(levelName, this.width / 2, this.height / 2 - 20);

    // "GET READY"
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillStyle = '#e8a030';
    ctx.fillText('GET READY!', this.width / 2, this.height / 2 + 20);

    ctx.shadowBlur = 0;
  }

  drawLevelComplete(levelName, score) {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(26, 42, 26, 0.9)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 15;
    ctx.textAlign = 'center';
    ctx.fillText('LEVEL COMPLETE!', this.width / 2, this.height / 2 - 30);

    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillStyle = '#f1c40f';
    ctx.shadowColor = '#f1c40f';
    ctx.fillText(levelName, this.width / 2, this.height / 2 + 10);

    ctx.fillStyle = '#e8a030';
    ctx.shadowColor = '#e8a030';
    ctx.fillText(`Score: ${score}`, this.width / 2, this.height / 2 + 40);

    ctx.shadowBlur = 0;
  }

  drawGameOver(score, bestScore) {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(26, 42, 26, 0.95)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.fillStyle = '#ff6b6b';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 20;
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 60);

    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.fillStyle = '#f1c40f';
    ctx.shadowColor = '#f1c40f';
    ctx.shadowBlur = 10;
    ctx.fillText(`Score: ${score}`, this.width / 2, this.height / 2 - 10);

    ctx.fillStyle = '#e8a030';
    ctx.shadowColor = '#e8a030';
    ctx.fillText(`Best: ${bestScore}`, this.width / 2, this.height / 2 + 20);

    ctx.shadowBlur = 0;
  }

  drawVictory(score) {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(26, 42, 26, 0.95)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.fillStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 25;
    ctx.textAlign = 'center';
    ctx.fillText('VICTORY!', this.width / 2, this.height / 2 - 50);

    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillStyle = '#f1c40f';
    ctx.shadowColor = '#f1c40f';
    ctx.shadowBlur = 10;
    ctx.fillText('You defeated the Cow!', this.width / 2, this.height / 2);

    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.fillStyle = '#e8a030';
    ctx.shadowColor = '#e8a030';
    ctx.fillText(`Final Score: ${score}`, this.width / 2, this.height / 2 + 40);

    ctx.shadowBlur = 0;
  }
}

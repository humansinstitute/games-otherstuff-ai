/**
 * Micro Machines Style Racing - Top-Down Renderer
 * Camera follows player with smooth scrolling
 */

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;

    // Camera position (world coordinates of screen center)
    this.cameraX = 0;
    this.cameraY = 0;
    this.cameraSmoothing = 0.15; // How quickly camera follows player
    this.zoom = 1.0; // Zoom level (higher = closer view)

    // Cached track rendering
    this.trackCanvas = null;
    this.trackCtx = null;
  }

  // Update camera to follow target
  updateCamera(targetX, targetY, instant = false) {
    if (instant) {
      this.cameraX = targetX;
      this.cameraY = targetY;
    } else {
      this.cameraX += (targetX - this.cameraX) * this.cameraSmoothing;
      this.cameraY += (targetY - this.cameraY) * this.cameraSmoothing;
    }
  }

  // Convert world coordinates to screen coordinates
  worldToScreen(x, y) {
    return {
      x: (x - this.cameraX) * this.zoom + this.width / 2,
      y: (y - this.cameraY) * this.zoom + this.height / 2
    };
  }

  clear(color = '#1a1a2e') {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  // Pre-render track to offscreen canvas for performance
  prerenderTrack(track) {
    const bounds = track.bounds;
    const padding = 100;

    // Create offscreen canvas sized to track
    this.trackCanvas = document.createElement('canvas');
    this.trackCanvas.width = bounds.width + padding * 2;
    this.trackCanvas.height = bounds.height + padding * 2;
    this.trackCtx = this.trackCanvas.getContext('2d');
    this.trackOffsetX = bounds.minX - padding;
    this.trackOffsetY = bounds.minY - padding;

    const ctx = this.trackCtx;
    const offX = -this.trackOffsetX;
    const offY = -this.trackOffsetY;

    // Draw void/fall area (dark)
    ctx.fillStyle = track.edgeColor || '#0a0a0a';
    ctx.fillRect(0, 0, this.trackCanvas.width, this.trackCanvas.height);

    // Draw table surface with wood grain
    this.drawWoodTable(ctx, track, offX, offY);

    // Draw track surface
    this.drawTrackSurface(ctx, track, offX, offY);

    // Draw scenery (kitchen items)
    for (const item of track.scenery) {
      this.drawKitchenItem(ctx, item, offX, offY);
    }
  }

  // Draw wood table with grain texture
  drawWoodTable(ctx, track, offsetX, offsetY) {
    const edges = track.tableEdges;
    if (!edges) return;

    const x = edges.left + offsetX;
    const y = edges.top + offsetY;
    const w = edges.right - edges.left;
    const h = edges.bottom - edges.top;

    // Main table color
    ctx.fillStyle = track.groundColor;
    ctx.fillRect(x, y, w, h);

    // Wood grain lines
    ctx.strokeStyle = track.tableColor || '#6B4423';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.3;

    for (let i = 0; i < h; i += 15 + Math.random() * 10) {
      ctx.beginPath();
      ctx.moveTo(x, y + i);
      // Wavy grain line
      for (let j = 0; j < w; j += 20) {
        ctx.lineTo(x + j, y + i + Math.sin(j * 0.02) * 3);
      }
      ctx.stroke();
    }

    ctx.globalAlpha = 1;

    // Table edge highlight (beveled edge look)
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);

    // Table edge shadow
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 5;
    ctx.strokeRect(x, y, w, h);
  }

  drawTrackSurface(ctx, track, offsetX, offsetY) {
    const waypoints = track.waypoints;

    // Draw track as connected quads
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw border (slightly wider)
    ctx.strokeStyle = track.borderColor;
    ctx.lineWidth = 12;
    ctx.beginPath();
    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i];
      const x = wp.x + offsetX;
      const y = wp.y + offsetY;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.stroke();

    // Draw each segment as a filled quad
    for (let i = 0; i < waypoints.length; i++) {
      const wp1 = waypoints[i];
      const wp2 = waypoints[(i + 1) % waypoints.length];

      // Calculate perpendicular offset for track width
      const dx = wp2.x - wp1.x;
      const dy = wp2.y - wp1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = -dy / len;
      const ny = dx / len;

      const hw1 = wp1.width / 2;
      const hw2 = wp2.width / 2;

      // Four corners of this track segment
      const x1 = wp1.x + offsetX;
      const y1 = wp1.y + offsetY;
      const x2 = wp2.x + offsetX;
      const y2 = wp2.y + offsetY;

      ctx.fillStyle = track.trackColor;
      ctx.beginPath();
      ctx.moveTo(x1 + nx * hw1, y1 + ny * hw1);
      ctx.lineTo(x1 - nx * hw1, y1 - ny * hw1);
      ctx.lineTo(x2 - nx * hw2, y2 - ny * hw2);
      ctx.lineTo(x2 + nx * hw2, y2 + ny * hw2);
      ctx.closePath();
      ctx.fill();
    }

    // Draw center line (dashed)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 20]);
    ctx.beginPath();
    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i];
      const x = wp.x + offsetX;
      const y = wp.y + offsetY;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw finish line
    const finish = track.checkpoints.find(cp => cp.isFinish);
    if (finish) {
      this.drawFinishLine(ctx, finish, offsetX, offsetY);
    }
  }

  drawFinishLine(ctx, checkpoint, offsetX, offsetY) {
    const x = checkpoint.x + offsetX;
    const y = checkpoint.y + offsetY;
    const hw = checkpoint.width / 2;
    const cos = Math.cos(checkpoint.angle);
    const sin = Math.sin(checkpoint.angle);

    // Checkerboard pattern
    const squareSize = 8;
    const numSquares = Math.ceil(checkpoint.width / squareSize);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(checkpoint.angle + Math.PI / 2);

    for (let i = 0; i < numSquares; i++) {
      for (let j = 0; j < 2; j++) {
        const isWhite = (i + j) % 2 === 0;
        ctx.fillStyle = isWhite ? '#ffffff' : '#000000';
        ctx.fillRect(
          -hw + i * squareSize,
          -squareSize + j * squareSize,
          squareSize,
          squareSize
        );
      }
    }

    ctx.restore();
  }

  // Draw kitchen items
  drawKitchenItem(ctx, item, offsetX, offsetY) {
    const x = item.x + offsetX;
    const y = item.y + offsetY;
    const r = item.radius;

    // Shadow for all items
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(x + 3, y + 3, r * 1.1, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    switch (item.type) {
      case 'plate':
        // Plate rim
        ctx.fillStyle = item.rimColor || '#4a90d9';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        // Plate center
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(x, y, r * 0.8, 0, Math.PI * 2);
        ctx.fill();
        // Shine
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.ellipse(x - r * 0.3, y - r * 0.3, r * 0.3, r * 0.2, -0.5, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'cup':
        // Cup body
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        // Cup rim (darker)
        ctx.strokeStyle = item.rimColor || '#d0d0d0';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(x, y - r * 0.2, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
        // Handle
        ctx.strokeStyle = item.handleColor || '#c0c0c0';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x + r, y, r * 0.4, -0.5, 2, false);
        ctx.stroke();
        // Coffee inside
        ctx.fillStyle = '#3d2314';
        ctx.beginPath();
        ctx.ellipse(x, y - r * 0.2, r * 0.65, r * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'fork':
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(item.angle || 0.3);
        // Handle
        ctx.fillStyle = item.color;
        ctx.fillRect(-3, 0, 6, 35);
        // Tines
        for (let i = -2; i <= 2; i++) {
          ctx.fillRect(i * 3 - 1, -15, 2, 18);
        }
        ctx.restore();
        break;

      case 'knife':
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(item.angle || -0.2);
        // Handle
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(-3, 10, 6, 25);
        // Blade
        ctx.fillStyle = item.bladeColor || '#e0e0e0';
        ctx.beginPath();
        ctx.moveTo(-3, 10);
        ctx.lineTo(0, -25);
        ctx.lineTo(4, 10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        break;

      case 'spoon':
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(item.angle || 0.5);
        // Handle
        ctx.fillStyle = item.color;
        ctx.fillRect(-2, 5, 4, 30);
        // Bowl
        ctx.beginPath();
        ctx.ellipse(0, -5, 8, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;

      case 'saltshaker':
      case 'pepper':
        // Body
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.roundRect(x - r * 0.7, y - r, r * 1.4, r * 2, 4);
        ctx.fill();
        // Cap
        ctx.fillStyle = item.capColor;
        ctx.beginPath();
        ctx.roundRect(x - r * 0.6, y - r - 5, r * 1.2, 8, 2);
        ctx.fill();
        // Holes
        ctx.fillStyle = '#333';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(x - 4 + i * 4, y - r - 2, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;

      case 'bread':
        // Crust
        ctx.fillStyle = item.crustColor || '#8b6914';
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * 0.6, 0.2, 0, Math.PI * 2);
        ctx.fill();
        // Inner bread
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.ellipse(x, y, r * 0.85, r * 0.5, 0.2, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'apple':
        // Apple body
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        // Indent at top
        ctx.fillStyle = '#c0392b';
        ctx.beginPath();
        ctx.ellipse(x, y - r * 0.7, r * 0.3, r * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        // Stem
        ctx.strokeStyle = '#5d4037';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y - r * 0.8);
        ctx.lineTo(x + 2, y - r - 5);
        ctx.stroke();
        // Leaf
        ctx.fillStyle = item.leafColor;
        ctx.beginPath();
        ctx.ellipse(x + 5, y - r - 3, 5, 3, 0.5, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'cheese':
        // Cheese wedge
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.moveTo(x - r, y + r * 0.5);
        ctx.lineTo(x + r, y + r * 0.5);
        ctx.lineTo(x + r * 0.5, y - r);
        ctx.closePath();
        ctx.fill();
        // Holes
        ctx.fillStyle = item.holeColor || '#d4b130';
        ctx.beginPath();
        ctx.arc(x - 3, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 8, y + 5, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 2, y - 5, 2.5, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'napkin':
        ctx.fillStyle = item.color;
        ctx.fillRect(x - r, y - r * 0.6, r * 2, r * 1.2);
        // Fold lines
        ctx.strokeStyle = item.foldColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - r, y);
        ctx.lineTo(x + r, y);
        ctx.moveTo(x, y - r * 0.6);
        ctx.lineTo(x, y + r * 0.6);
        ctx.stroke();
        break;

      case 'crumb':
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        break;

      default:
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
  }

  // Draw the pre-rendered track
  drawTrack(track) {
    if (!this.trackCanvas) {
      this.prerenderTrack(track);
    }

    const ctx = this.ctx;

    // Calculate where to draw the cached track image
    const screenPos = this.worldToScreen(this.trackOffsetX, this.trackOffsetY);

    ctx.save();
    ctx.translate(screenPos.x, screenPos.y);
    ctx.scale(this.zoom, this.zoom);
    ctx.drawImage(this.trackCanvas, 0, 0);
    ctx.restore();
  }

  // Draw player car (called separately so it's always on top)
  drawCar(car) {
    const ctx = this.ctx;
    const pos = this.worldToScreen(car.x, car.y);

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(car.angle);
    ctx.scale(this.zoom, this.zoom);

    const w = car.width;
    const h = car.height;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(2, 2, w / 2 + 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wheels
    ctx.fillStyle = car.wheelColor;
    // Front wheels
    ctx.fillRect(w / 2 - 5, -h / 2 - 2, 6, 5);
    ctx.fillRect(w / 2 - 5, h / 2 - 3, 6, 5);
    // Rear wheels
    ctx.fillRect(-w / 2 - 1, -h / 2 - 2, 6, 5);
    ctx.fillRect(-w / 2 - 1, h / 2 - 3, 6, 5);

    // Car body
    ctx.fillStyle = car.color;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 3);
    ctx.fill();

    // Accent stripe
    ctx.fillStyle = car.accentColor;
    ctx.fillRect(-w / 4, -h / 2, w / 2, h);

    // Windshield
    ctx.fillStyle = car.windowColor;
    ctx.fillRect(w / 6, -h / 3, w / 4, h * 2 / 3);

    // Headlights
    ctx.fillStyle = '#ffff00';
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 4;
    ctx.fillRect(w / 2 - 2, -h / 3, 3, 4);
    ctx.fillRect(w / 2 - 2, h / 3 - 4, 3, 4);
    ctx.shadowBlur = 0;

    // Tail lights
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(-w / 2 - 1, -h / 3, 3, 3);
    ctx.fillRect(-w / 2 - 1, h / 3 - 3, 3, 3);

    ctx.restore();
  }

  // Draw speed/brake particles
  drawParticles(car, isBraking) {
    if (Math.abs(car.speed) < 50) return;

    const ctx = this.ctx;
    const numParticles = Math.floor(Math.abs(car.speed) / 50);

    for (let i = 0; i < numParticles; i++) {
      const offset = (Math.random() - 0.5) * car.height;
      const behind = car.width / 2 + Math.random() * 20;

      // Position behind car
      const px = car.x - Math.cos(car.angle) * behind - Math.sin(car.angle) * offset;
      const py = car.y - Math.sin(car.angle) * behind + Math.cos(car.angle) * offset;

      const pos = this.worldToScreen(px, py);
      const size = (2 + Math.random() * 3) * this.zoom;

      if (isBraking) {
        // Brake dust
        ctx.fillStyle = `rgba(150, 150, 150, ${0.3 + Math.random() * 0.3})`;
      } else {
        // Speed dust
        ctx.fillStyle = `rgba(200, 180, 150, ${0.2 + Math.random() * 0.2})`;
      }

      ctx.fillRect(pos.x - size / 2, pos.y - size / 2, size, size);
    }
  }

  // Draw HUD overlay
  drawHUD(speed, maxSpeed, lap, totalLaps, time, score) {
    const ctx = this.ctx;

    // Semi-transparent HUD background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(5, 5, 115, 85);
    ctx.fillRect(this.width - 85, 5, 80, 55);

    // Speed
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.fillStyle = '#00ff00';
    ctx.textAlign = 'left';
    ctx.fillText(Math.floor(Math.abs(speed)), 15, 35);
    ctx.font = '10px "Courier New", monospace';
    ctx.fillStyle = '#00aa00';
    ctx.fillText('KM/H', 80, 35);

    // Lap
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillStyle = '#ffff00';
    ctx.fillText(`LAP ${lap}/${totalLaps}`, 15, 55);

    // Time
    ctx.font = '14px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.formatTime(time), 15, 78);

    // Score (right side)
    ctx.textAlign = 'right';
    ctx.font = '10px "Courier New", monospace';
    ctx.fillStyle = '#4a9eff';
    ctx.fillText('SCORE', this.width - 12, 22);
    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(score.toString(), this.width - 12, 45);
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }

  drawCountdown(count) {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.font = 'bold 80px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = count === 0 ? '#00ff00' : '#ff0000';
    ctx.shadowBlur = 30;

    ctx.fillStyle = count === 0 ? '#00ff00' : '#ffffff';
    ctx.fillText(count === 0 ? 'GO!' : count.toString(), this.width / 2, this.height / 2);

    ctx.shadowBlur = 0;
    ctx.textBaseline = 'alphabetic';
  }

  drawLapComplete(lap, lapTime) {
    const ctx = this.ctx;

    // Small banner at top of screen
    ctx.fillStyle = 'rgba(0, 100, 0, 0.9)';
    ctx.fillRect(this.width / 2 - 90, 95, 180, 45);

    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`LAP ${lap} COMPLETE!`, this.width / 2, 112);

    ctx.font = '12px "Courier New", monospace';
    ctx.fillStyle = '#00ff00';
    ctx.fillText(`${this.formatTime(lapTime)}`, this.width / 2, 130);
  }

  drawWrongWay() {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff0000';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 15;
    ctx.fillText('WRONG WAY!', this.width / 2, 60);
    ctx.shadowBlur = 0;
  }

  drawFellOff() {
    const ctx = this.ctx;

    // Red flash
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, this.width, this.height);

    // Warning banner
    ctx.fillStyle = 'rgba(180, 0, 0, 0.9)';
    ctx.fillRect(this.width / 2 - 80, this.height / 2 - 20, 160, 40);

    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('FELL OFF! +2s', this.width / 2, this.height / 2 + 6);
  }

  drawOffTrack() {
    const ctx = this.ctx;

    // Subtle warning flash
    const flash = (Date.now() % 500) < 250;
    if (flash) {
      ctx.fillStyle = 'rgba(139, 69, 19, 0.2)';
      ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  // Reset cached track when changing levels
  resetTrackCache() {
    this.trackCanvas = null;
    this.trackCtx = null;
  }
}

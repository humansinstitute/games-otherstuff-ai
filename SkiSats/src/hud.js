const hudState = {
  elapsedTime: 0,
};

export function resetHUD() {
  hudState.elapsedTime = 0;
}

export function updateHUD(dt = 0) {
  hudState.elapsedTime += dt;
}

export function getElapsedTime() {
  return hudState.elapsedTime;
}

export function formatDistance(distance) {
  return `${Math.floor(distance)} m`;
}

export function formatTime(seconds) {
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function renderHUD(ctx, canvasWidth, canvasHeight, playerDistance, sats = 0) {
  const padding = 16;
  const panelWidth = 280;
  const panelHeight = 130;
  const x = padding;
  const y = 70; // Move down to avoid overlapping with header title

  ctx.save();

  // Draw background with border
  ctx.fillStyle = 'rgba(0, 20, 40, 0.85)';
  ctx.fillRect(x, y, panelWidth, panelHeight);

  // Add retro-style border
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, panelWidth, panelHeight);

  // Inner border for depth
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 4, y + 4, panelWidth - 8, panelHeight - 8);

  // Stats with retro font
  ctx.fillStyle = '#FFD700';
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const stats = [
    { label: 'DISTANCE', value: formatDistance(playerDistance), color: '#00FF00' },
    { label: 'TIME', value: formatTime(hudState.elapsedTime), color: '#00BFFF' },
    { label: 'SATS', value: sats.toString(), color: '#FFD700' },
  ];

  let lineY = y + 20;
  stats.forEach((stat) => {
    // Label
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(stat.label, x + 16, lineY);

    // Value with color
    ctx.fillStyle = stat.color;
    ctx.textAlign = 'right';
    ctx.fillText(stat.value, x + panelWidth - 16, lineY);
    ctx.textAlign = 'left';

    lineY += 32;
  });

  ctx.restore();
}

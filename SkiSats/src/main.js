import { CONFIG } from './config.js';
import { postInputUpdate } from './input.js';
import { GameStateManager } from './gameState.js';
import { Player } from './player.js';
import {
  init3DRenderer,
  resize3DRenderer,
  render3DFrame,
  updatePlayer3D,
  updateCamera3D,
  updateObstacles3D,
  updateCoins3D,
  updateShrubs3D,
  updateYeti3D,
  playerCrashAnimation,
  resetPlayerAnimation,
} from './renderer3d.js';
import { getWorldObstacles, getWorldCoins, getWorldShrubs, getYeti } from './world.js';

const canvas = document.getElementById(CONFIG.canvasId);
const ctx = canvas.getContext('2d');
const threeContainer = document.getElementById('three-container');

const player = new Player();
const stateManager = new GameStateManager({
  player,
  onCrash: playerCrashAnimation,
  onReset: resetPlayerAnimation
});

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  resize3DRenderer(canvas.width, canvas.height);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
init3DRenderer(threeContainer, CONFIG);
resize3DRenderer(canvas.width, canvas.height);

let lastTime = 0;

function getViewport() {
  return { width: canvas.width, height: canvas.height };
}

function gameLoop(timestamp) {
  if (!lastTime) {
    lastTime = timestamp;
  }

  const deltaTime = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  stateManager.update(deltaTime);

  updatePlayer3D(player, CONFIG);
  updateCamera3D(player, CONFIG);
  updateObstacles3D(getWorldObstacles(), player.distance);
  updateCoins3D(getWorldCoins(), player.distance);
  updateShrubs3D(getWorldShrubs(), player.distance);

  // Add yeti update
  const yeti = getYeti();
  const yetiDistance = updateYeti3D(yeti, player.distance);
  stateManager.yetiDistance = yetiDistance;  // For screen shake

  render3DFrame();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  stateManager.render(ctx, getViewport());

  postInputUpdate();
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

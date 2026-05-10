import { CONFIG } from './config.js';
import { soundManager } from './sound.js';

const worldState = {
  markers: [],
  obstacles: [],
  coins: [],
  shrubs: [],
  boundaryObstacles: [],
  initialized: false,
  nextSpawnY: 0,
  nextObstacleY: 0,
  nextCoinY: 0,
  nextShrubY: 0,
  nextBoundaryY: 0,
  yeti: null,
  yetiSpawned: false,
  yetiEnabledThisGame: false,
  lastYetiSpawnCheck: 0,
};

function randomX() {
  const halfWidth = CONFIG.slopeWidth / 2;
  return (Math.random() * 2 - 1) * halfWidth;
}

function nextSpacing() {
  const variance = 0.6 + Math.random() * 0.8;
  return CONFIG.markerSpacing * variance;
}

function createMarker(y) {
  return { x: randomX(), y };
}

function randomObstacleX() {
  const halfSlope = CONFIG.slopeWidth / 2;
  const { minX, maxX } = CONFIG.obstacles;
  const clampedMin = Math.max(minX, -halfSlope);
  const clampedMax = Math.min(maxX, halfSlope);
  return clampedMin + Math.random() * (clampedMax - clampedMin);
}

function randomCoinX() {
  const halfSlope = CONFIG.slopeWidth / 2;
  const { minX, maxX } = CONFIG.coins;
  const clampedMin = Math.max(minX, -halfSlope);
  const clampedMax = Math.min(maxX, halfSlope);
  return clampedMin + Math.random() * (clampedMax - clampedMin);
}

function randomShrubX() {
  const halfSlope = CONFIG.slopeWidth / 2;
  const { minX, maxX } = CONFIG.shrubs;
  const clampedMin = Math.max(minX, -halfSlope);
  const clampedMax = Math.min(maxX, halfSlope);
  return clampedMin + Math.random() * (clampedMax - clampedMin);
}

function randomTreeType() {
  const types = CONFIG.obstacles.treeTypes;
  const rand = Math.random();
  let cumulative = 0;

  for (const [type, probability] of Object.entries(types)) {
    cumulative += probability;
    if (rand <= cumulative) {
      return type;
    }
  }

  return 'normal';
}

function getBaseScale(canvasWidth) {
  const unitsToPixels = (canvasWidth / CONFIG.slopeWidth) * 0.5;
  return unitsToPixels * CONFIG.projection.horizontalScale;
}

export function initWorld() {
  worldState.markers = [];
  worldState.obstacles = [];
  worldState.coins = [];
  worldState.shrubs = [];
  worldState.boundaryObstacles = [];
  worldState.nextSpawnY = 0;
  worldState.nextObstacleY = 0;
  worldState.nextCoinY = 0;
  worldState.nextShrubY = 0;
  worldState.nextBoundaryY = 0;
  worldState.initialized = true;
}

export function resetWorld(playerDistance = 0) {
  if (!worldState.initialized) {
    initWorld();
  } else {
    worldState.markers.length = 0;
  }

  // Reset yeti and randomly decide if yeti will spawn this game
  worldState.yeti = null;
  worldState.yetiSpawned = false;
  worldState.yetiEnabledThisGame = Math.random() < CONFIG.yeti.gameSpawnProbability;
  worldState.lastYetiSpawnCheck = 0;

  let markerY = playerDistance;
  const limit = playerDistance + CONFIG.viewDistance;
  while (markerY < limit) {
    markerY += nextSpacing();
    worldState.markers.push(createMarker(markerY));
  }
  worldState.nextSpawnY = markerY;
  worldState.obstacles.length = 0;
  worldState.nextObstacleY = playerDistance;
  let obstacleY = playerDistance + CONFIG.obstacles.spawnInterval;
  while (obstacleY < limit) {
    if (Math.random() < CONFIG.obstacles.probability) {
      worldState.obstacles.push({ x: randomObstacleX(), y: obstacleY, treeType: randomTreeType() });
    }
    obstacleY += CONFIG.obstacles.spawnInterval;
  }
  worldState.nextObstacleY = obstacleY;

  worldState.coins.length = 0;
  worldState.nextCoinY = playerDistance;
  let coinY = playerDistance + CONFIG.coins.spawnInterval;
  while (coinY < limit) {
    if (Math.random() < CONFIG.coins.probability) {
      worldState.coins.push({ x: randomCoinX(), y: coinY });
    }
    coinY += CONFIG.coins.spawnInterval;
  }
  worldState.nextCoinY = coinY;

  worldState.shrubs.length = 0;
  worldState.nextShrubY = Math.max(playerDistance, CONFIG.shrubs.startDistance);
  let shrubY = Math.max(playerDistance + CONFIG.shrubs.spawnInterval, CONFIG.shrubs.startDistance + CONFIG.shrubs.spawnInterval);
  while (shrubY < limit) {
    if (shrubY >= CONFIG.shrubs.startDistance && Math.random() < CONFIG.shrubs.probability) {
      worldState.shrubs.push({ x: randomShrubX(), y: shrubY, isOnFire: false, processed: false });
    }
    shrubY += CONFIG.shrubs.spawnInterval;
  }
  worldState.nextShrubY = shrubY;

  worldState.boundaryObstacles.length = 0;
  worldState.nextBoundaryY = playerDistance;
  const boundaryInterval = 60;
  const halfWidth = CONFIG.slopeWidth / 2;
  let boundaryY = playerDistance + boundaryInterval;
  while (boundaryY < limit) {
    worldState.boundaryObstacles.push({ x: -halfWidth, y: boundaryY });
    worldState.boundaryObstacles.push({ x: halfWidth, y: boundaryY });
    boundaryY += boundaryInterval;
  }
  worldState.nextBoundaryY = boundaryY;
}

export function updateWorld(dt, playerDistance) {
  if (!worldState.initialized) {
    resetWorld(playerDistance);
  }

  worldState.markers = worldState.markers.filter((marker) => marker.y >= playerDistance);
  worldState.obstacles = worldState.obstacles.filter((obstacle) => obstacle.y >= playerDistance - CONFIG.render3d.behindDistance);
  worldState.coins = worldState.coins.filter((coin) => coin.y >= playerDistance - CONFIG.render3d.behindDistance);
  worldState.shrubs = worldState.shrubs.filter((shrub) => shrub.y >= playerDistance - CONFIG.render3d.behindDistance);
  worldState.boundaryObstacles = worldState.boundaryObstacles.filter((obstacle) => obstacle.y >= playerDistance - CONFIG.render3d.behindDistance);

  const visibleLimit = playerDistance + CONFIG.viewDistance;
  let spawnY = Math.max(worldState.nextSpawnY, worldState.markers.reduce((max, marker) => Math.max(max, marker.y), playerDistance));

  while (spawnY < visibleLimit) {
    spawnY += nextSpacing();
    worldState.markers.push(createMarker(spawnY));
  }

  worldState.nextSpawnY = spawnY;

  spawnObstacles(playerDistance);
  spawnCoins(playerDistance);
  spawnShrubs(playerDistance);
  spawnBoundaryObstacles(playerDistance);
}

function spawnObstacles(playerDistance) {
  const { spawnInterval, probability } = CONFIG.obstacles;
  if (!worldState.nextObstacleY) {
    worldState.nextObstacleY = playerDistance + spawnInterval;
  }

  while (playerDistance >= worldState.nextObstacleY) {
    worldState.nextObstacleY += spawnInterval;
    if (Math.random() < probability) {
      const obstacleY = playerDistance + CONFIG.viewDistance;
      worldState.obstacles.push({ x: randomObstacleX(), y: obstacleY, treeType: randomTreeType() });
    }
  }
}

function spawnCoins(playerDistance) {
  const { spawnInterval, probability } = CONFIG.coins;
  if (!worldState.nextCoinY) {
    worldState.nextCoinY = playerDistance + spawnInterval;
  }

  while (playerDistance >= worldState.nextCoinY) {
    worldState.nextCoinY += spawnInterval;
    if (Math.random() < probability) {
      const coinY = playerDistance + CONFIG.viewDistance;
      worldState.coins.push({ x: randomCoinX(), y: coinY });
    }
  }
}

function spawnShrubs(playerDistance) {
  const { spawnInterval, probability, startDistance } = CONFIG.shrubs;
  if (!worldState.nextShrubY) {
    worldState.nextShrubY = Math.max(playerDistance + spawnInterval, startDistance);
  }

  // Don't spawn shrubs until player has reached startDistance
  if (playerDistance < startDistance) {
    return;
  }

  while (playerDistance >= worldState.nextShrubY) {
    worldState.nextShrubY += spawnInterval;
    if (Math.random() < probability) {
      const shrubY = playerDistance + CONFIG.viewDistance;
      worldState.shrubs.push({ x: randomShrubX(), y: shrubY, isOnFire: false, processed: false });
    }
  }
}

function spawnBoundaryObstacles(playerDistance) {
  const boundaryInterval = 60;
  const halfWidth = CONFIG.slopeWidth / 2;

  if (!worldState.nextBoundaryY) {
    worldState.nextBoundaryY = playerDistance + boundaryInterval;
  }

  while (playerDistance >= worldState.nextBoundaryY) {
    worldState.nextBoundaryY += boundaryInterval;
    const boundaryY = playerDistance + CONFIG.viewDistance;
    worldState.boundaryObstacles.push({ x: -halfWidth, y: boundaryY });
    worldState.boundaryObstacles.push({ x: halfWidth, y: boundaryY });
  }
}

function projectPoint(entity, playerDistance, canvasWidth, canvasHeight) {
  const depth = entity.y - playerDistance;
  if (depth < 0 || depth > CONFIG.viewDistance) {
    return { visible: false };
  }

  const t = depth / CONFIG.viewDistance;
  const horizonY = canvasHeight * CONFIG.slopeScreen.horizonRatio;
  const bottomY = canvasHeight * CONFIG.slopeScreen.bottomRatio;
  const screenY = bottomY - t * (bottomY - horizonY);

  const widthFactor = 1 - 0.5 * t;
  const centerX = canvasWidth / 2;
  const baseScale = getBaseScale(canvasWidth);
  const screenX = centerX + entity.x * baseScale * widthFactor;

  const scale = 1 - 0.7 * t;

  return {
    visible: true,
    screenX,
    screenY,
    scale,
  };
}


export function collectCoinsForPlayer(player) {
  const playerY = player.distance;
  const playerRadius = CONFIG.collisions.playerRadius;
  const coinRadius = CONFIG.coins.collisionRadius;
  const radiusSum = playerRadius + coinRadius;
  const radiusSquared = radiusSum * radiusSum;

  let collected = 0;
  worldState.coins = worldState.coins.filter((coin) => {
    const dx = coin.x - player.x;
    const dy = coin.y - playerY;
    const hit = dx * dx + dy * dy <= radiusSquared;
    if (hit) {
      collected += 1;
      return false;
    }
    return true;
  });

  return collected;
}

export function getWorldObstacles() {
  return [...worldState.obstacles, ...worldState.boundaryObstacles];
}

export function getWorldCoins() {
  return worldState.coins;
}

export function getWorldShrubs() {
  return worldState.shrubs;
}

export function checkPlayerShrubCollision(player) {
  const playerY = player.distance;
  const playerRadius = CONFIG.collisions.playerRadius;
  const shrubRadius = CONFIG.shrubs.collisionRadius;
  const radiusSum = playerRadius + shrubRadius;
  const radiusSquared = radiusSum * radiusSum;

  const collidedShrubs = [];

  worldState.shrubs.forEach((shrub) => {
    const dx = shrub.x - player.x;
    const dy = shrub.y - playerY;
    if (dx * dx + dy * dy <= radiusSquared) {
      collidedShrubs.push(shrub);
    }
  });

  return collidedShrubs;
}

export function checkPlayerObstacleCollision(player) {
  const playerY = player.distance;
  const playerRadius = CONFIG.collisions.playerRadius;
  const obstacleRadius = CONFIG.collisions.obstacleRadius;
  const radiusSum = playerRadius + obstacleRadius;
  const radiusSquared = radiusSum * radiusSum;

  const checkCollision = (obstacle) => {
    const dx = obstacle.x - player.x;
    const dy = obstacle.y - playerY;
    return dx * dx + dy * dy <= radiusSquared;
  };

  return worldState.obstacles.some(checkCollision) || worldState.boundaryObstacles.some(checkCollision);
}

function initYeti(playerDistance) {
  if (worldState.yetiSpawned) {
    return;
  }

  const spawnX = (Math.random() > 0.5 ? 1 : -1) * CONFIG.yeti.spawnOffsetX;
  const spawnY = playerDistance - CONFIG.yeti.spawnDistanceBehind;

  worldState.yeti = {
    x: spawnX,
    y: spawnY,
    speed: CONFIG.yeti.baseSpeed,
    active: true,
  };

  worldState.yetiSpawned = true;

  // Play yeti appear sound
  soundManager.playYetiAppear();
}

export function updateYeti(dt, player, elapsedTime) {
  // Safety check for invalid dt values
  if (!dt || dt <= 0 || dt > 1 || !player) {
    return;
  }

  // Check if yeti should spawn (only if enabled for this game)
  if (!worldState.yetiSpawned && worldState.yetiEnabledThisGame) {
    // Only check after minimum spawn time
    if (elapsedTime >= CONFIG.yeti.minSpawnTime) {
      // Check at intervals to avoid checking every frame
      if (elapsedTime - worldState.lastYetiSpawnCheck >= CONFIG.yeti.spawnCheckInterval) {
        worldState.lastYetiSpawnCheck = elapsedTime;

        // Random chance to spawn
        if (Math.random() < CONFIG.yeti.spawnChancePerCheck) {
          initYeti(player.distance);
        }
      }
    }
  }

  if (!worldState.yeti || !worldState.yeti.active) {
    return;
  }

  // Accelerate yeti
  worldState.yeti.speed += CONFIG.yeti.acceleration * dt;
  worldState.yeti.speed = Math.min(worldState.yeti.speed, CONFIG.yeti.maxSpeed);

  // Move forward
  worldState.yeti.y += worldState.yeti.speed * dt;

  // Track player laterally
  const dx = player.x - worldState.yeti.x;
  const moveX = Math.sign(dx) * Math.min(Math.abs(dx), CONFIG.yeti.lateralSpeed * dt);
  worldState.yeti.x += moveX;
}

export function checkYetiCollision(player) {
  if (!worldState.yeti || !worldState.yeti.active) {
    return false;
  }

  const playerY = player.distance;
  const playerRadius = CONFIG.collisions.playerRadius;
  const yetiRadius = CONFIG.yeti.collisionRadius;
  const radiusSum = playerRadius + yetiRadius;
  const radiusSquared = radiusSum * radiusSum;

  const dx = worldState.yeti.x - player.x;
  const dy = worldState.yeti.y - playerY;

  return dx * dx + dy * dy <= radiusSquared;
}

export function getYeti() {
  return worldState.yeti;
}

initWorld();

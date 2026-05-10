export const CONFIG = {
  canvasId: 'game-canvas',
  backgroundColor: '#0f2a3d',
  slopeWidth: 240,
  playerBaseSpeed: 75,
  playerSpeedAcceleration: 4,
  playerMaxSpeed: 350,
  playerHorizontalSpeed: 50,
  viewDistance: 250,
  projection: {
    horizontalScale: 1.25,
    verticalScale: 1.1,
  },
  slope: {
    angleDeg: 14,
  },
  render3d: {
    xScale: 1.1,
    depthScale: 1.0,
    viewDistance: 320,
    behindDistance: 220,
    cameraHeight: 55,
    cameraOffsetZ: 95,
    cameraLookForward: 70,
  },
  slopeScreen: {
    horizonRatio: 0.25,
    bottomRatio: 0.92,
  },
  markerSpacing: 20,
  obstacles: {
    spawnInterval: 30,
    probability: 0.55,
    minX: -100,
    maxX: 100,
    size: 6,
    treeTypes: {
      normal: 0.75,   // 75% normal trees
      tall: 0.15,     // 15% tall pine trees
      short: 0.10,    // 10% short bushy trees
    },
  },
  coins: {
    spawnInterval: 40,
    probability: 0.5,
    minX: -90,
    maxX: 90,
    size: 5,
    color: '#f4b942',
    collisionRadius: 3.5,
    satsPerCoin: 1,
  },
  shrubs: {
    spawnInterval: 35,
    probability: 0.4,
    minX: -90,
    maxX: 90,
    collisionRadius: 4,
    speedSlowdown: 0.6,
    fireSpeedThreshold: 150,
    startDistance: 150,
  },
  collisions: {
    playerRadius: 4,
    obstacleRadius: 5,
  },
  yeti: {
    minSpawnTime: 45,            // Earliest possible spawn (45 seconds)
    spawnCheckInterval: 1.0,     // Check for spawn every 1 second
    spawnChancePerCheck: 0.04,   // 4% chance per check after minSpawnTime (avg spawn ~70-80s)
    gameSpawnProbability: 0.85,  // 85% chance yeti will spawn at all this game
    spawnDistanceBehind: 80,     // Start 80 units behind player
    spawnOffsetX: 60,            // Spawn from corner (±60 X offset)
    baseSpeed: 100,              // Initial speed (faster than player base)
    acceleration: 15,            // Speed increase per second (aggressive)
    maxSpeed: 500,               // Cap to prevent infinite acceleration
    lateralSpeed: 45,            // How fast yeti tracks player X position
    collisionRadius: 6,          // Catch radius
    catchTime: 17,               // Target catch time in seconds (middle of 15-20)
  },
  GAME_STATES: {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    GAME_OVER: 'GAME_OVER',
    YETI_CAUGHT: 'YETI_CAUGHT',
  },
};

/**
 * CowKey Kong - Level Configuration
 * Unique platform layouts for each level
 */

import { Platform, Ladder, CowBoss, Goal, Collectible } from './entities.js';

// Level configurations - each level has unique platform layouts
export const LEVELS = [
  {
    id: 1,
    name: 'THE BARN',
    // Easy intro level - straightforward climb
    platforms: [
      // Ground
      [0, 580, 320],
      // Simple zigzag up
      [0, 500, 150],
      [170, 420, 150],
      [0, 340, 150],
      [170, 260, 150],
      [0, 180, 150],
      // Top platform
      [60, 100, 200],
    ],
    ladders: [
      [120, 500, 80],
      [170, 420, 80],
      [120, 340, 80],
      [170, 260, 80],
      [120, 180, 80],
      [140, 100, 80],
    ],
    playerStart: { x: 30, y: 548 },
    bossPosition: { x: 80, y: 50 },
    goalPosition: { x: 220, y: 68 },
    collectibles: [
      { x: 200, y: 390, type: 'coin' },
      { x: 50, y: 310, type: 'coin' },
      { x: 200, y: 230, type: 'gem' },
    ],
    barrelInterval: 180,
    difficulty: 1,
  },
  {
    id: 2,
    name: 'THE FIELD',
    // Introduce gaps - barrels fall through
    platforms: [
      // Ground
      [0, 580, 320],
      // Two platforms with gap
      [0, 490, 120],
      [200, 490, 120],
      // Single platform other side
      [80, 400, 160],
      // Two platforms with gap
      [0, 310, 100],
      [180, 310, 140],
      // Narrow path
      [100, 220, 120],
      // Top
      [50, 130, 220],
    ],
    ladders: [
      [60, 490, 90],
      [250, 400, 90],
      [140, 310, 90],
      [60, 220, 90],
      [200, 130, 90],
    ],
    playerStart: { x: 30, y: 548 },
    bossPosition: { x: 80, y: 80 },
    goalPosition: { x: 220, y: 98 },
    collectibles: [
      { x: 240, y: 460, type: 'coin' },
      { x: 120, y: 370, type: 'coin' },
      { x: 50, y: 280, type: 'coin' },
      { x: 150, y: 190, type: 'gem' },
    ],
    barrelInterval: 150,
    difficulty: 1.3,
  },
  {
    id: 3,
    name: 'THE SILO',
    // More gaps, trickier jumps
    platforms: [
      // Ground
      [0, 580, 320],
      // Three small platforms
      [0, 500, 80],
      [120, 480, 80],
      [240, 500, 80],
      // Two platforms
      [40, 400, 100],
      [200, 380, 100],
      // Single narrow
      [100, 300, 100],
      // Two platforms
      [0, 220, 90],
      [200, 200, 120],
      // Approach to top
      [80, 130, 80],
      [180, 130, 80],
      // Top
      [80, 60, 160],
    ],
    ladders: [
      [40, 500, 80],
      [160, 400, 80],
      [260, 300, 80],
      [130, 220, 70],
      [40, 130, 70],
      [230, 60, 70],
    ],
    playerStart: { x: 30, y: 548 },
    bossPosition: { x: 110, y: 10 },
    goalPosition: { x: 200, y: 28 },
    collectibles: [
      { x: 150, y: 450, type: 'coin' },
      { x: 250, y: 350, type: 'coin' },
      { x: 130, y: 270, type: 'gem' },
      { x: 50, y: 190, type: 'coin' },
      { x: 250, y: 170, type: 'gem' },
    ],
    barrelInterval: 120,
    difficulty: 1.6,
  },
  {
    id: 4,
    name: 'THE WINDMILL',
    // Spiral pattern with many gaps
    platforms: [
      // Ground
      [0, 580, 320],
      // Spiral going up - alternating sides
      [0, 520, 100],
      [220, 520, 100],
      [110, 460, 100],
      [0, 400, 100],
      [220, 400, 100],
      [110, 340, 100],
      [0, 280, 100],
      [220, 280, 100],
      [80, 210, 160],
      // Top
      [60, 130, 200],
    ],
    ladders: [
      [70, 520, 60],
      [260, 460, 60],
      [150, 400, 60],
      [70, 340, 60],
      [260, 280, 60],
      [150, 210, 80],
      [140, 130, 80],
    ],
    playerStart: { x: 30, y: 548 },
    bossPosition: { x: 90, y: 80 },
    goalPosition: { x: 210, y: 98 },
    collectibles: [
      { x: 260, y: 490, type: 'coin' },
      { x: 50, y: 370, type: 'coin' },
      { x: 260, y: 370, type: 'coin' },
      { x: 50, y: 250, type: 'gem' },
      { x: 260, y: 250, type: 'gem' },
      { x: 150, y: 180, type: 'gem' },
    ],
    barrelInterval: 100,
    difficulty: 1.8,
  },
  {
    id: 5,
    name: 'COW KINGDOM',
    // Final level - most challenging
    platforms: [
      // Ground
      [0, 580, 320],
      // Scattered small platforms
      [0, 520, 70],
      [130, 500, 60],
      [250, 520, 70],
      // More scattered
      [60, 440, 70],
      [180, 420, 80],
      // Narrow crossing
      [0, 360, 60],
      [100, 340, 60],
      [200, 360, 60],
      [280, 340, 40],
      // Upper section
      [40, 270, 80],
      [180, 250, 100],
      // Near top
      [0, 180, 70],
      [120, 160, 80],
      [260, 180, 60],
      // Top - boss arena
      [50, 90, 220],
    ],
    ladders: [
      [30, 520, 80],
      [280, 440, 80],
      [60, 360, 70],
      [230, 270, 70],
      [80, 180, 70],
      [280, 90, 90],
      [100, 90, 70],
    ],
    playerStart: { x: 30, y: 548 },
    bossPosition: { x: 100, y: 40 },
    goalPosition: { x: 220, y: 58 },
    collectibles: [
      { x: 150, y: 470, type: 'coin' },
      { x: 100, y: 410, type: 'coin' },
      { x: 230, y: 390, type: 'coin' },
      { x: 40, y: 330, type: 'gem' },
      { x: 240, y: 310, type: 'coin' },
      { x: 80, y: 240, type: 'gem' },
      { x: 220, y: 220, type: 'gem' },
      { x: 150, y: 130, type: 'gem' },
    ],
    barrelInterval: 80,
    difficulty: 2.2,
  },
];

/**
 * Create game objects from level configuration
 * @param {number} levelIndex - Level index (0-based)
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @returns {Object} Level objects
 */
export function createLevel(levelIndex, canvasWidth, canvasHeight) {
  const levelConfig = LEVELS[levelIndex];
  if (!levelConfig) {
    console.error('Invalid level index:', levelIndex);
    return null;
  }

  // Create platforms
  const platforms = levelConfig.platforms.map(([x, y, width]) => {
    return new Platform(x, y, width);
  });

  // Create ladders
  const ladders = levelConfig.ladders.map(([x, y, height]) => {
    return new Ladder(x, y, height);
  });

  // Create boss
  const boss = new CowBoss(
    levelConfig.bossPosition.x,
    levelConfig.bossPosition.y
  );
  boss.throwInterval = levelConfig.barrelInterval;

  // Create goal
  const goal = new Goal(
    levelConfig.goalPosition.x,
    levelConfig.goalPosition.y
  );

  // Create collectibles
  const collectibles = levelConfig.collectibles.map(({ x, y, type }) => {
    return new Collectible(x, y, type);
  });

  return {
    platforms,
    ladders,
    boss,
    goal,
    collectibles,
    playerStart: levelConfig.playerStart,
    name: levelConfig.name,
    difficulty: levelConfig.difficulty,
    barrelInterval: levelConfig.barrelInterval,
  };
}

/**
 * Get level by index (0-based)
 */
export function getLevel(index) {
  return LEVELS[index] || null;
}

/**
 * Get total number of levels
 */
export function getTotalLevels() {
  return LEVELS.length;
}

/**
 * Get level name
 */
export function getLevelName(index) {
  const level = LEVELS[index];
  return level ? level.name : 'UNKNOWN';
}

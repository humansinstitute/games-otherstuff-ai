/**
 * Space Invaders - Level Configuration
 * Enemy types, boss configs, and stage/wave definitions
 */

import { Enemy, Boss } from './entities.js';

// Enemy type configurations
export const ENEMY_TYPES = {
  grunt: {
    width: 24,
    height: 18,
    health: 1,
    points: 10,
    color: '#9b59b6',
    glowColor: '#9b59b6',
    shootChance: 0.001
  },
  fast: {
    width: 20,
    height: 16,
    health: 1,
    points: 20,
    color: '#e74c3c',
    glowColor: '#e74c3c',
    shootChance: 0.002
  },
  tank: {
    width: 28,
    height: 22,
    health: 3,
    points: 50,
    color: '#3498db',
    glowColor: '#3498db',
    shootChance: 0.0015
  },
  elite: {
    width: 26,
    height: 20,
    health: 2,
    points: 30,
    color: '#f39c12',
    glowColor: '#f39c12',
    shootChance: 0.003
  }
};

// Boss configurations per stage
export const BOSS_CONFIGS = {
  stage1: {
    name: 'SENTINEL',
    health: 30,
    patterns: ['spread3', 'aimed', 'spread3']
  },
  stage2: {
    name: 'OVERLORD',
    health: 50,
    patterns: ['spread5', 'wave', 'aimed', 'spread3']
  },
  stage3: {
    name: 'DESTROYER',
    health: 75,
    patterns: ['spread5', 'barrage', 'aimed', 'wave']
  },
  stage4: {
    name: 'HARBINGER',
    health: 100,
    patterns: ['barrage', 'spread5', 'wave', 'spread5', 'aimed']
  },
  stage5: {
    name: 'NEXUS PRIME',
    health: 150,
    patterns: ['barrage', 'spread5', 'wave', 'barrage', 'spread5', 'aimed']
  }
};

// 5 stages with 3 waves each
export const STAGES = [
  {
    id: 1,
    name: 'SECTOR ALPHA',
    waves: [
      {
        enemies: [{ type: 'grunt', rows: 2, cols: 6 }],
        speed: 0.8,
        dropDistance: 15
      },
      {
        enemies: [
          { type: 'grunt', rows: 2, cols: 6 },
          { type: 'fast', rows: 1, cols: 4 }
        ],
        speed: 1.0,
        dropDistance: 18
      },
      {
        enemies: [
          { type: 'grunt', rows: 2, cols: 7 },
          { type: 'tank', rows: 1, cols: 3 }
        ],
        speed: 1.0,
        dropDistance: 20
      }
    ],
    boss: 'stage1',
    shieldCount: 3
  },
  {
    id: 2,
    name: 'NEBULA PRIME',
    waves: [
      {
        enemies: [
          { type: 'grunt', rows: 2, cols: 7 },
          { type: 'fast', rows: 1, cols: 5 }
        ],
        speed: 1.0,
        dropDistance: 18
      },
      {
        enemies: [
          { type: 'fast', rows: 2, cols: 6 },
          { type: 'tank', rows: 1, cols: 4 }
        ],
        speed: 1.2,
        dropDistance: 20
      },
      {
        enemies: [
          { type: 'grunt', rows: 2, cols: 8 },
          { type: 'elite', rows: 1, cols: 4 }
        ],
        speed: 1.2,
        dropDistance: 22
      }
    ],
    boss: 'stage2',
    shieldCount: 3
  },
  {
    id: 3,
    name: 'ASTEROID BELT',
    waves: [
      {
        enemies: [
          { type: 'fast', rows: 2, cols: 7 },
          { type: 'tank', rows: 1, cols: 4 }
        ],
        speed: 1.2,
        dropDistance: 20
      },
      {
        enemies: [
          { type: 'elite', rows: 2, cols: 6 },
          { type: 'fast', rows: 1, cols: 5 }
        ],
        speed: 1.3,
        dropDistance: 22
      },
      {
        enemies: [
          { type: 'tank', rows: 2, cols: 5 },
          { type: 'elite', rows: 2, cols: 5 }
        ],
        speed: 1.3,
        dropDistance: 24
      }
    ],
    boss: 'stage3',
    shieldCount: 3
  },
  {
    id: 4,
    name: 'DARK SECTOR',
    waves: [
      {
        enemies: [
          { type: 'elite', rows: 2, cols: 7 },
          { type: 'tank', rows: 1, cols: 5 }
        ],
        speed: 1.4,
        dropDistance: 22
      },
      {
        enemies: [
          { type: 'fast', rows: 2, cols: 8 },
          { type: 'elite', rows: 2, cols: 6 }
        ],
        speed: 1.5,
        dropDistance: 24
      },
      {
        enemies: [
          { type: 'tank', rows: 2, cols: 6 },
          { type: 'elite', rows: 2, cols: 6 }
        ],
        speed: 1.5,
        dropDistance: 26
      }
    ],
    boss: 'stage4',
    shieldCount: 3
  },
  {
    id: 5,
    name: 'CORE BREACH',
    waves: [
      {
        enemies: [
          { type: 'elite', rows: 3, cols: 7 },
          { type: 'tank', rows: 1, cols: 5 }
        ],
        speed: 1.5,
        dropDistance: 24
      },
      {
        enemies: [
          { type: 'tank', rows: 2, cols: 7 },
          { type: 'elite', rows: 2, cols: 7 }
        ],
        speed: 1.6,
        dropDistance: 26
      },
      {
        enemies: [
          { type: 'elite', rows: 3, cols: 8 },
          { type: 'tank', rows: 2, cols: 6 }
        ],
        speed: 1.7,
        dropDistance: 28
      }
    ],
    boss: 'stage5',
    shieldCount: 2
  }
];

/**
 * Generate enemy objects from wave configuration
 * @param {Object} waveConfig - Wave configuration object
 * @param {number} canvasWidth - Canvas width for centering
 * @returns {Enemy[]} Array of Enemy objects
 */
export function generateWaveEnemies(waveConfig, canvasWidth) {
  const enemies = [];
  let yOffset = 60;

  for (const group of waveConfig.enemies) {
    const typeConfig = ENEMY_TYPES[group.type];
    const spacing = 35;
    const totalWidth = group.cols * spacing;
    const startX = (canvasWidth - totalWidth) / 2 + spacing / 2 - typeConfig.width / 2;

    for (let row = 0; row < group.rows; row++) {
      for (let col = 0; col < group.cols; col++) {
        const enemy = new Enemy(
          startX + col * spacing,
          yOffset + row * 28,
          group.type,
          typeConfig
        );
        enemies.push(enemy);
      }
    }

    yOffset += group.rows * 28 + 10;
  }

  return enemies;
}

/**
 * Create a boss for the given stage
 * @param {string} stageKey - Key into BOSS_CONFIGS (e.g., 'stage1')
 * @param {number} canvasWidth - Canvas width for positioning
 * @returns {Boss} Boss object
 */
export function createBoss(stageKey, canvasWidth) {
  const config = BOSS_CONFIGS[stageKey];
  if (!config) {
    console.error('Unknown boss config:', stageKey);
    return null;
  }
  return new Boss(canvasWidth, config);
}

/**
 * Get total enemy count for a wave
 */
export function getWaveEnemyCount(waveConfig) {
  return waveConfig.enemies.reduce((sum, group) => {
    return sum + group.rows * group.cols;
  }, 0);
}

/**
 * Get stage by index (0-based)
 */
export function getStage(index) {
  return STAGES[index] || null;
}

/**
 * Get total number of stages
 */
export function getTotalStages() {
  return STAGES.length;
}

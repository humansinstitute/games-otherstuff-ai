/**
 * Pong - Level Configuration
 * 10 levels with increasing difficulty
 */

// Level configurations
export const LEVELS = [
  {
    id: 1,
    name: 'ROOKIE',
    ballSpeed: 4,
    aiSpeed: 3,
    aiError: 70,
    playerPaddleHeight: 80,
    aiPaddleHeight: 80,
    pointsToWin: 3,
    bonusPoints: 100
  },
  {
    id: 2,
    name: 'BEGINNER',
    ballSpeed: 4.5,
    aiSpeed: 3.5,
    aiError: 60,
    playerPaddleHeight: 80,
    aiPaddleHeight: 80,
    pointsToWin: 3,
    bonusPoints: 150
  },
  {
    id: 3,
    name: 'AMATEUR',
    ballSpeed: 5,
    aiSpeed: 4,
    aiError: 50,
    playerPaddleHeight: 75,
    aiPaddleHeight: 75,
    pointsToWin: 4,
    bonusPoints: 200
  },
  {
    id: 4,
    name: 'SKILLED',
    ballSpeed: 5.5,
    aiSpeed: 4.5,
    aiError: 40,
    playerPaddleHeight: 70,
    aiPaddleHeight: 70,
    pointsToWin: 4,
    bonusPoints: 300
  },
  {
    id: 5,
    name: 'ADVANCED',
    ballSpeed: 6,
    aiSpeed: 5,
    aiError: 35,
    playerPaddleHeight: 65,
    aiPaddleHeight: 65,
    pointsToWin: 5,
    bonusPoints: 400
  },
  {
    id: 6,
    name: 'EXPERT',
    ballSpeed: 6.5,
    aiSpeed: 5.5,
    aiError: 30,
    playerPaddleHeight: 60,
    aiPaddleHeight: 60,
    pointsToWin: 5,
    bonusPoints: 500
  },
  {
    id: 7,
    name: 'MASTER',
    ballSpeed: 7,
    aiSpeed: 6,
    aiError: 25,
    playerPaddleHeight: 55,
    aiPaddleHeight: 55,
    pointsToWin: 5,
    bonusPoints: 650
  },
  {
    id: 8,
    name: 'GRANDMASTER',
    ballSpeed: 7.5,
    aiSpeed: 6.5,
    aiError: 20,
    playerPaddleHeight: 50,
    aiPaddleHeight: 50,
    pointsToWin: 6,
    bonusPoints: 800
  },
  {
    id: 9,
    name: 'LEGEND',
    ballSpeed: 8,
    aiSpeed: 7,
    aiError: 15,
    playerPaddleHeight: 45,
    aiPaddleHeight: 45,
    pointsToWin: 6,
    bonusPoints: 1000
  },
  {
    id: 10,
    name: 'PONG GOD',
    ballSpeed: 9,
    aiSpeed: 8,
    aiError: 10,
    playerPaddleHeight: 40,
    aiPaddleHeight: 40,
    pointsToWin: 7,
    bonusPoints: 1500
  }
];

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
 * Calculate points for scoring
 * @param {number} levelIndex - Current level (0-based)
 * @param {boolean} isCleanWin - Whether player won without losing a point
 */
export function calculateScorePoints(levelIndex, isCleanWin = false) {
  const level = LEVELS[levelIndex];
  if (!level) return 10;

  let points = 10 + levelIndex * 5; // Base points increase with level
  if (isCleanWin) {
    points += level.bonusPoints;
  }
  return points;
}

/**
 * Calculate level completion bonus
 */
export function getLevelBonus(levelIndex) {
  const level = LEVELS[levelIndex];
  return level ? level.bonusPoints : 100;
}

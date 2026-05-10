import LEVELS from '../js/levels.js';
import ParticleSystem from '../js/ParticleSystem.js';

const level = LEVELS[0];

const entrancePortal = new ParticleSystem(level.entrance.x, level.entrance.y, { theme: 'entrance' });
const entranceRect = {
  x: entrancePortal.x - entrancePortal.width / 2,
  y: entrancePortal.y - entrancePortal.height,
  width: entrancePortal.width,
  height: entrancePortal.height
};

const EXIT_WIDTH = 40;
const EXIT_HEIGHT = 60;
const exitRect = {
  x: level.exit.x,
  y: level.exit.y,
  width: EXIT_WIDTH,
  height: EXIT_HEIGHT
};

const entranceClearance = {
  x: entranceRect.x - 50,
  y: entranceRect.y - 20,
  width: entranceRect.width + 100,
  height: entranceRect.height + 100
};

const entranceLandingBand = {
  x: entranceRect.x - 80,
  y: entranceRect.y + entranceRect.height + 60,
  width: entranceRect.width + 160,
  height: 20
};

const exitClearance = {
  x: exitRect.x - 60,
  y: exitRect.y - 40,
  width: exitRect.width + 120,
  height: exitRect.height + 40
};

const exitPorchBand = {
  x: exitRect.x - 60,
  y: exitRect.y + exitRect.height,
  width: exitRect.width + 120,
  height: 20
};

console.log(JSON.stringify({
  entranceRect,
  exitRect,
  entranceClearance,
  entranceLandingBand,
  exitClearance,
  exitPorchBand
}, null, 2));

import fs from 'fs';
import LEVELS from '../js/levels.js';
import TerrainManager from '../js/TerrainManager.js';
import Lemming from '../js/Lemming.js';
import { SPAWN_INTERVAL, STATES } from '../js/constants.js';

const level = { ...LEVELS[0] };

const entrancePortal = { x: level.entrance.x, y: level.entrance.y, width: 40, height: 50 };
const entranceRect = {
    x: entrancePortal.x - entrancePortal.width / 2,
    y: entrancePortal.y - entrancePortal.height,
    width: entrancePortal.width,
    height: entrancePortal.height
};
const exitRect = { x: level.exit.x, y: level.exit.y, width: 40, height: 60 };

const zones = {
    entranceClearance: {
        x: entranceRect.x - 50,
        y: entranceRect.y - 20,
        width: entranceRect.width + 100,
        height: entranceRect.height + 100
    },
    entranceLandingBand: {
        x: entranceRect.x - 80,
        y: entranceRect.y + entranceRect.height + 60,
        width: entranceRect.width + 160,
        height: 20
    },
    exitClearance: {
        x: exitRect.x - 60,
        y: exitRect.y - 40,
        width: exitRect.width + 120,
        height: exitRect.height + 40
    },
    exitPorchBand: {
        x: exitRect.x - 60,
        y: exitRect.y + exitRect.height,
        width: exitRect.width + 120,
        height: 20
    }
};

const terrainRectangles = [
    // placeholder, will print from existing level for now
    ...level.sections.flatMap(section => section.terrain || [])
];

function rectsOverlap(a, b) {
    return !(a.x + a.width <= b.x ||
             b.x + b.width <= a.x ||
             a.y + a.height <= b.y ||
             b.y + b.height <= a.y);
}

function hasTerrainUnderBand(band, terrain) {
    const sampleX = band.x + band.width / 2;
    const sampleY = band.y + band.height / 2;
    return terrain.some(rect => rect.x <= sampleX && sampleX <= rect.x + rect.width && rect.y <= sampleY && sampleY <= rect.y + rect.height);
}

function runValidation(rects) {
    const errors = [];

    rects.forEach((rect, idx) => {
        if (rectsOverlap(rect, zones.entranceClearance)) {
            errors.push(`Rect ${idx} overlaps entrance clearance`);
        }
        if (rectsOverlap(rect, zones.exitClearance)) {
            errors.push(`Rect ${idx} overlaps exit clearance`);
        }
    });

    if (!hasTerrainUnderBand(zones.entranceLandingBand, rects)) {
        errors.push('No terrain supporting entrance landing band');
    }

    if (!hasTerrainUnderBand(zones.exitPorchBand, rects)) {
        errors.push('No terrain supporting exit porch band');
    }

    return errors;
}

const validationErrors = runValidation(terrainRectangles);
console.log('Validation errors:', validationErrors);


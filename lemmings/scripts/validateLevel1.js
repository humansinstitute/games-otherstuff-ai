import LEVELS from '../js/levels.js';
import ParticleSystem from '../js/ParticleSystem.js';

const EXIT_WIDTH = 40;
const EXIT_HEIGHT = 60;
const FALL_SAFE = 160;

const level = LEVELS[0];
const entrancePortal = new ParticleSystem(level.entrance.x, level.entrance.y, { theme: 'entrance' });
const entranceRect = {
    x: entrancePortal.x - entrancePortal.width / 2,
    y: entrancePortal.y - entrancePortal.height,
    width: entrancePortal.width,
    height: entrancePortal.height
};
const exitRect = {
    x: level.exit.x,
    y: level.exit.y,
    width: EXIT_WIDTH,
    height: EXIT_HEIGHT
};

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

function flattenTerrain(levelData) {
    const rects = [];
    levelData.sections.forEach(section => {
        (section.terrain || []).forEach(rect => rects.push({ ...rect }));
    });
    if (levelData.ground) rects.push({ ...levelData.ground });
    return rects;
}

const terrain = flattenTerrain(level);

function rectsOverlap(a, b) {
    return !(a.x + a.width <= b.x ||
        b.x + b.width <= a.x ||
        a.y + a.height <= b.y ||
        b.y + b.height <= a.y);
}

function bandSupported(band, rects, tolerance = 40) {
    const samples = 9;
    for (let i = 0; i <= samples; i++) {
        const sampleX = band.x + (band.width * i) / samples;
        const targetTop = band.y + band.height;
        const supporting = rects.some(rect => {
            const rectTop = rect.y;
            const rectBottom = rect.y + rect.height;
            return sampleX >= rect.x && sampleX <= rect.x + rect.width &&
                rectTop <= targetTop + tolerance &&
                rectBottom >= targetTop;
        });
        if (!supporting) {
            return false;
        }
    }
    return true;
}

function buildAdjacency(rects) {
    const adj = Array(rects.length).fill(0).map(() => new Set());
    const overlapsRange = (aStart, aEnd, bStart, bEnd) => Math.max(aStart, bStart) < Math.min(aEnd, bEnd);

    for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
            const a = rects[i];
            const b = rects[j];
            let connected = false;

            // Direct overlap/touch
            if (!(a.x + a.width < b.x || b.x + b.width < a.x || a.y + a.height < b.y || b.y + b.height < a.y)) {
                connected = true;
            }

            // Falling connection (a above b with overlapping x)
            if (!connected) {
                if (overlapsRange(a.x, a.x + a.width, b.x, b.x + b.width)) {
                    if (a.y + a.height <= b.y) {
                        connected = true;
                    }
                    if (b.y + b.height <= a.y) {
                        connected = true;
                    }
                }
            }

            if (connected) {
                adj[i].add(j);
                adj[j].add(i);
            }
        }
    }
    return adj;
}

function findRectIndicesIntersecting(rects, zone) {
    const indices = [];
    rects.forEach((rect, idx) => {
        if (rectsOverlap(rect, zone)) {
            indices.push(idx);
        }
    });
    return indices;
}

function connectivityCheck(rects) {
    const adj = buildAdjacency(rects);
    const landingIndices = findRectIndicesIntersecting(rects, zones.entranceLandingBand);
    const porchIndices = findRectIndicesIntersecting(rects, zones.exitPorchBand);
    if (!landingIndices.length || !porchIndices.length) {
        return false;
    }

    const visited = new Set();
    const queue = [...landingIndices];
    landingIndices.forEach(idx => visited.add(idx));

    while (queue.length) {
        const current = queue.shift();
        if (porchIndices.includes(current)) {
            return true;
        }
        adj[current].forEach(next => {
            if (!visited.has(next)) {
                visited.add(next);
                queue.push(next);
            }
        });
    }
    return false;
}

function hazardReachable(rects) {
    // approximate hazard: point just before pit drop (x = 380, y = 210)
    const hazardZone = { x: 360, y: 210, width: 20, height: 40 };
    const adj = buildAdjacency(rects);
    const landing = findRectIndicesIntersecting(rects, zones.entranceLandingBand);
    const hazard = findRectIndicesIntersecting(rects, hazardZone);
    if (!hazard.length) return false;

    const visited = new Set();
    const queue = [...landing];
    landing.forEach(i => visited.add(i));

    while (queue.length) {
        const idx = queue.shift();
        if (hazard.includes(idx)) {
            return true;
        }
        adj[idx].forEach(next => {
            if (!visited.has(next)) {
                visited.add(next);
                queue.push(next);
            }
        });
    }
    return false;
}

const validation = {
    entranceRect,
    exitRect,
    zones,
    errors: [],
    checks: {}
};

terrain.forEach((rect, idx) => {
    if (rectsOverlap(rect, zones.entranceClearance)) {
        validation.errors.push(`Rect ${idx} overlaps entrance clearance`);
    }
    if (rectsOverlap(rect, zones.exitClearance)) {
        validation.errors.push(`Rect ${idx} overlaps exit clearance`);
    }
});

validation.checks.entranceLanding = bandSupported(zones.entranceLandingBand, terrain);
if (!validation.checks.entranceLanding) validation.errors.push('Entrance landing band unsupported');
validation.checks.exitPorch = bandSupported(zones.exitPorchBand, terrain);
if (!validation.checks.exitPorch) validation.errors.push('Exit porch band unsupported');
validation.checks.exitConnectivity = connectivityCheck(terrain);
if (!validation.checks.exitConnectivity) validation.errors.push('Exit porch not connected to main terrain graph');
validation.checks.hazardReachable = hazardReachable(terrain);
if (!validation.checks.hazardReachable) validation.errors.push('Hazard region unreachable from landing area');

console.log(JSON.stringify(validation, null, 2));

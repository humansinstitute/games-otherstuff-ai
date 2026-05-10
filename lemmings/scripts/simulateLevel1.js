import TerrainManager from '../js/TerrainManager.js';
import Lemming from '../js/Lemming.js';
import LEVELS from '../js/levels.js';
import { SPAWN_INTERVAL, STATES } from '../js/constants.js';

const level = LEVELS[0];
const terrain = new TerrainManager(level.width, level.height);
terrain.initializeFromLevel(level);

const exitBounds = level.exit ? { x: level.exit.x, y: level.exit.y, width: 40, height: 60 } : null;

const dt = 1 / 60;
const totalTime = 30; // seconds
let time = 0;
let lemmingsSpawned = 0;
let spawnTimer = 0;
const lemmings = [];

let firstDeathTime = null;
const fallEvents = [];
let deathsBy15s = 0;
let totalDeaths = 0;
const crowdSamples = [];
let nextSampleTime = 0;

const chamberThresholdX = 380; // rough region of holding chamber

while (time < totalTime) {
    if (lemmingsSpawned < level.totalLemmings) {
        spawnTimer += dt;
        if (spawnTimer >= SPAWN_INTERVAL) {
            spawnTimer = 0;
            const lem = new Lemming(level.entrance.x, level.entrance.y);
            lem.state = STATES.FALLING;
            lemmings.push(lem);
            lemmingsSpawned++;
        }
    }

    for (const lem of lemmings) {
        const prevState = lem.state;
        const prevFallStart = lem.fallStartY;
        const prevFallDistance = lem.fallDistance;

        lem.update(dt, terrain, lemmings, null);

        // Landing record
        if (prevState === STATES.FALLING && lem.state !== STATES.FALLING) {
            // fallDistance is only meaningful right after landing/impact
            const distance = lem.fallDistance || Math.max(0, lem.y - prevFallStart);
            fallEvents.push({ time: time.toFixed(2), distance, x: lem.x.toFixed(1) });
        }

        if (prevState !== STATES.DEAD && lem.state === STATES.DEAD) {
            if (firstDeathTime === null) {
                firstDeathTime = time;
            }
            if (time <= 15) {
                deathsBy15s++;
            }
            totalDeaths++;
        }
    }

    // Exit detection and cleanup
    for (let i = lemmings.length - 1; i >= 0; i--) {
        const lem = lemmings[i];
        if (lem.state === STATES.DEAD && lem.deathTimer >= lem.deathMaxTime) {
            lemmings.splice(i, 1);
            continue;
        }
        if (exitBounds && lem.state !== STATES.DEAD) {
            const within = lem.x >= exitBounds.x && lem.x <= exitBounds.x + exitBounds.width &&
                lem.y >= exitBounds.y && lem.y <= exitBounds.y + exitBounds.height;
            if (within) {
                lem.state = STATES.SAVED;
                lemmings.splice(i, 1);
            }
        }
    }

    if (time >= nextSampleTime) {
        const chamberCount = lemmings.filter(lem => lem.x < chamberThresholdX && lem.state !== STATES.DEAD).length;
        const front = lemmings.reduce((max, lem) => lem.x > max && lem.state !== STATES.DEAD ? lem.x : max, 0);
        crowdSamples.push({ time: time.toFixed(1), chamberCount, frontX: front.toFixed(1) });
        nextSampleTime += 1;
    }

    time += dt;
}

console.log(JSON.stringify({
    firstDeathTime: firstDeathTime ? Number(firstDeathTime.toFixed(2)) : null,
    totalDeaths,
    deathsBy15s,
    fallEvents,
    crowdSamples
}, null, 2));

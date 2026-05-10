/**
 * Micro Machines Style Racing - Kitchen Table Track
 * Race on a kitchen table with fall-off edges!
 */

import { Waypoint, TrackSegment, Checkpoint, Scenery } from './entities.js';

// Create a smooth curved track from control points using Catmull-Rom spline
function catmullRomSpline(points, segments = 10) {
  const result = [];

  for (let i = 0; i < points.length; i++) {
    const p0 = points[(i - 1 + points.length) % points.length];
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const p3 = points[(i + 2) % points.length];

    for (let t = 0; t < segments; t++) {
      const s = t / segments;
      const s2 = s * s;
      const s3 = s2 * s;

      const x = 0.5 * (
        2 * p1.x +
        (-p0.x + p2.x) * s +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * s2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * s3
      );

      const y = 0.5 * (
        2 * p1.y +
        (-p0.y + p2.y) * s +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * s2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * s3
      );

      const width = p1.width + (p2.width - p1.width) * s;
      result.push(new Waypoint(x, y, width));
    }
  }

  return result;
}

// Generate track segments from waypoints
function generateSegments(waypoints) {
  const segments = [];
  for (let i = 0; i < waypoints.length; i++) {
    const next = (i + 1) % waypoints.length;
    segments.push(new TrackSegment(waypoints[i], waypoints[next]));
  }
  return segments;
}

// Calculate starting position and angle from first waypoints
function calculateStart(waypoints) {
  const p1 = waypoints[0];
  const p2 = waypoints[1];
  return {
    x: p1.x,
    y: p1.y,
    angle: Math.atan2(p2.y - p1.y, p2.x - p1.x)
  };
}

// Create checkpoints along the track
function generateCheckpoints(waypoints, count = 4) {
  const checkpoints = [];
  const step = Math.floor(waypoints.length / count);

  for (let i = 0; i < count; i++) {
    const idx = (i * step) % waypoints.length;
    const nextIdx = (idx + 1) % waypoints.length;
    const wp = waypoints[idx];
    const nextWp = waypoints[nextIdx];

    const angle = Math.atan2(nextWp.y - wp.y, nextWp.x - wp.x);
    checkpoints.push(new Checkpoint(wp.x, wp.y, angle, wp.width, i === 0));
  }

  return checkpoints;
}

// Calculate track bounds
function calculateBounds(waypoints, padding = 100) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const wp of waypoints) {
    minX = Math.min(minX, wp.x - wp.width);
    minY = Math.min(minY, wp.y - wp.width);
    maxX = Math.max(maxX, wp.x + wp.width);
    maxY = Math.max(maxY, wp.y + wp.width);
  }

  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
    width: (maxX - minX) + padding * 2,
    height: (maxY - minY) + padding * 2
  };
}

// Kitchen item scenery
class KitchenItem extends Scenery {
  constructor(x, y, type) {
    super(x, y, type);

    switch (type) {
      case 'cup':
        this.radius = 20;
        this.color = '#ffffff';
        this.rimColor = '#e0e0e0';
        this.handleColor = '#d0d0d0';
        break;
      case 'plate':
        this.radius = 35;
        this.color = '#f5f5f5';
        this.rimColor = '#4a90d9';
        break;
      case 'fork':
        this.radius = 8;
        this.width = 8;
        this.height = 45;
        this.color = '#c0c0c0';
        break;
      case 'knife':
        this.radius = 6;
        this.width = 6;
        this.height = 50;
        this.color = '#d0d0d0';
        this.bladeColor = '#e8e8e8';
        break;
      case 'spoon':
        this.radius = 10;
        this.width = 10;
        this.height = 40;
        this.color = '#c0c0c0';
        break;
      case 'saltshaker':
        this.radius = 12;
        this.color = '#f0f0f0';
        this.capColor = '#888888';
        break;
      case 'pepper':
        this.radius = 12;
        this.color = '#2a2a2a';
        this.capColor = '#444444';
        break;
      case 'bread':
        this.radius = 25;
        this.color = '#d4a056';
        this.crustColor = '#8b6914';
        break;
      case 'apple':
        this.radius = 15;
        this.color = '#e74c3c';
        this.leafColor = '#27ae60';
        break;
      case 'cheese':
        this.radius = 20;
        this.color = '#f4d03f';
        this.holeColor = '#d4b130';
        break;
      case 'napkin':
        this.radius = 30;
        this.color = '#e8e8e8';
        this.foldColor = '#d0d0d0';
        break;
      case 'crumb':
        this.radius = 3 + Math.random() * 4;
        this.color = '#c9a66b';
        break;
      default:
        this.radius = 15;
        this.color = '#888888';
    }
  }
}

// Generate kitchen scenery
function generateKitchenScenery(waypoints, bounds) {
  const scenery = [];

  // Place items around the track
  const items = [
    // Large items at corners/edges
    { x: bounds.minX + 80, y: bounds.minY + 80, type: 'plate' },
    { x: bounds.maxX - 80, y: bounds.minY + 80, type: 'cup' },
    { x: bounds.maxX - 100, y: bounds.maxY - 100, type: 'plate' },
    { x: bounds.minX + 100, y: bounds.maxY - 80, type: 'napkin' },

    // Utensils
    { x: bounds.minX + 150, y: bounds.minY + 60, type: 'fork' },
    { x: bounds.minX + 170, y: bounds.minY + 55, type: 'knife' },
    { x: bounds.maxX - 150, y: bounds.maxY - 60, type: 'spoon' },

    // Salt and pepper
    { x: bounds.maxX - 60, y: (bounds.minY + bounds.maxY) / 2 - 20, type: 'saltshaker' },
    { x: bounds.maxX - 60, y: (bounds.minY + bounds.maxY) / 2 + 20, type: 'pepper' },

    // Food items
    { x: (bounds.minX + bounds.maxX) / 2 - 100, y: bounds.minY + 70, type: 'bread' },
    { x: (bounds.minX + bounds.maxX) / 2 + 80, y: bounds.maxY - 70, type: 'cheese' },
    { x: bounds.minX + 60, y: (bounds.minY + bounds.maxY) / 2, type: 'apple' },
  ];

  for (const item of items) {
    // Make sure not too close to track
    let tooClose = false;
    for (const wp of waypoints) {
      const dist = Math.sqrt((item.x - wp.x) ** 2 + (item.y - wp.y) ** 2);
      if (dist < wp.width + 30) {
        tooClose = true;
        break;
      }
    }
    if (!tooClose) {
      scenery.push(new KitchenItem(item.x, item.y, item.type));
    }
  }

  // Scatter some crumbs
  for (let i = 0; i < 20; i++) {
    const x = bounds.minX + 50 + Math.random() * (bounds.width - 100);
    const y = bounds.minY + 50 + Math.random() * (bounds.height - 100);

    let tooClose = false;
    for (const wp of waypoints) {
      const dist = Math.sqrt((x - wp.x) ** 2 + (y - wp.y) ** 2);
      if (dist < wp.width) {
        tooClose = true;
        break;
      }
    }
    if (!tooClose) {
      scenery.push(new KitchenItem(x, y, 'crumb'));
    }
  }

  return scenery;
}

// Track 1: Kitchen Table - "Breakfast Run"
function generateTrack1() {
  const controlPoints = [
    { x: 300, y: 250, width: 55 },
    { x: 500, y: 200, width: 55 },
    { x: 700, y: 250, width: 50 },
    { x: 750, y: 400, width: 50 },
    { x: 650, y: 550, width: 55 },
    { x: 450, y: 580, width: 55 },
    { x: 250, y: 500, width: 50 },
    { x: 200, y: 350, width: 50 },
  ];

  const waypoints = catmullRomSpline(controlPoints, 12);
  const segments = generateSegments(waypoints);
  const bounds = calculateBounds(waypoints, 80);
  const start = calculateStart(waypoints);
  const checkpoints = generateCheckpoints(waypoints, 4);
  const scenery = generateKitchenScenery(waypoints, bounds);

  // Define table edges (fall-off zones)
  const tableEdges = {
    left: bounds.minX + 30,
    right: bounds.maxX - 30,
    top: bounds.minY + 30,
    bottom: bounds.maxY - 30
  };

  return {
    name: 'Breakfast Run',
    waypoints,
    segments,
    checkpoints,
    scenery,
    bounds,
    start,
    tableEdges,
    // Kitchen table colors
    groundColor: '#8B5A2B', // Wood table
    trackColor: '#654321', // Darker wood grain for track
    borderColor: '#FFD700', // Yellow tape/marker
    tableColor: '#A0522D', // Sienna wood
    edgeColor: '#1a1a1a', // Dark edge (void/fall)
    skyColor: '#FFF8DC' // Cream colored wall behind
  };
}

// Track 2: "Dinner Dash" - Figure 8 around plates
function generateTrack2() {
  const controlPoints = [
    { x: 250, y: 300, width: 50 },
    { x: 400, y: 200, width: 50 },
    { x: 550, y: 300, width: 45 },
    { x: 480, y: 420, width: 45 },
    { x: 550, y: 550, width: 50 },
    { x: 400, y: 620, width: 50 },
    { x: 250, y: 550, width: 45 },
    { x: 320, y: 420, width: 45 },
  ];

  const waypoints = catmullRomSpline(controlPoints, 12);
  const segments = generateSegments(waypoints);
  const bounds = calculateBounds(waypoints, 80);
  const start = calculateStart(waypoints);
  const checkpoints = generateCheckpoints(waypoints, 4);
  const scenery = generateKitchenScenery(waypoints, bounds);

  const tableEdges = {
    left: bounds.minX + 30,
    right: bounds.maxX - 30,
    top: bounds.minY + 30,
    bottom: bounds.maxY - 30
  };

  return {
    name: 'Dinner Dash',
    waypoints,
    segments,
    checkpoints,
    scenery,
    bounds,
    start,
    tableEdges,
    groundColor: '#6B4423',
    trackColor: '#4a3219',
    borderColor: '#FF6B6B',
    tableColor: '#8B4513',
    edgeColor: '#0a0a0a',
    skyColor: '#FFE4C4'
  };
}

// Track 3: "Spill Zone" - Technical track near table edge
function generateTrack3() {
  const controlPoints = [
    { x: 200, y: 350, width: 45 },
    { x: 300, y: 200, width: 45 },
    { x: 500, y: 180, width: 40 },
    { x: 650, y: 280, width: 40 },
    { x: 700, y: 450, width: 45 },
    { x: 600, y: 580, width: 50 },
    { x: 400, y: 600, width: 50 },
    { x: 250, y: 520, width: 45 },
  ];

  const waypoints = catmullRomSpline(controlPoints, 10);
  const segments = generateSegments(waypoints);
  const bounds = calculateBounds(waypoints, 60); // Smaller padding = closer to edge!
  const start = calculateStart(waypoints);
  const checkpoints = generateCheckpoints(waypoints, 5);
  const scenery = generateKitchenScenery(waypoints, bounds);

  const tableEdges = {
    left: bounds.minX + 20,
    right: bounds.maxX - 20,
    top: bounds.minY + 20,
    bottom: bounds.maxY - 20
  };

  return {
    name: 'Spill Zone',
    waypoints,
    segments,
    checkpoints,
    scenery,
    bounds,
    start,
    tableEdges,
    groundColor: '#5D4037',
    trackColor: '#3E2723',
    borderColor: '#FFEB3B',
    tableColor: '#795548',
    edgeColor: '#000000',
    skyColor: '#ECEFF1'
  };
}

// Available tracks
export const TRACKS = [
  generateTrack1,
  generateTrack2,
  generateTrack3
];

/**
 * Get a track by index
 */
export function getTrack(index) {
  const trackGenerator = TRACKS[index % TRACKS.length];
  return trackGenerator();
}

/**
 * Get total number of available tracks
 */
export function getTotalTracks() {
  return TRACKS.length;
}

/**
 * Get track info without generating full data
 */
export function getTrackInfo(index) {
  const names = ['Breakfast Run', 'Dinner Dash', 'Spill Zone'];
  return {
    name: names[index % names.length],
    index: index
  };
}

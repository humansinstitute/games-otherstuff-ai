/**
 * Frogger 3D - Main Scene Setup
 * Based on Vision Document architecture
 * Stage 1: Core rendering (camera, grid, scene foundation)
 */

// Import Three.js
import * as THREE from 'three';

// ============================================
// CONSTANTS (from Vision Document specs)
// ============================================
const GRID_COLUMNS = 15;
const GRID_ROWS = 13;
const LANE_ENTRY_OFFSET = 0.5; // Cars spawn slightly off-screen but stay on visible road
const CELL_SIZE = 1;
const GRID_WIDTH = GRID_COLUMNS * CELL_SIZE;
const GRID_HEIGHT = GRID_ROWS * CELL_SIZE;

// Voxel configuration (from Vision Document: base voxel unit 0.5×0.5×0.5)
const VOXEL_SIZE = 0.35;

// Camera configuration for isometric view
const CAMERA_POSITION = { x: -20, y: 26, z: 18 };
const CAMERA_FRUSTUM = 20; // Orthographic camera frustum size
const GROUND_THICKNESS = 1.2;      // Adds depth to the play area base

// Colors
const COLOR_GRID = 0x5d7a4a;
const COLOR_GROUND = 0x4f8a3a;
const COLOR_SKY = 0xdfeec4;       // Light desaturated green, per reference
const COLOR_GROUND_LIGHT = 0x6fa046;
const COLOR_GROUND_EDGE = 0x1f2f16; // Darker tone for ground depth

// Frog colors
const COLOR_FROG_BODY = 0x44aa44;    // Bright green
const COLOR_FROG_DARK = 0x338833;     // Darker green for variation
const COLOR_FROG_SPOTS = 0x2a5b1f;    // Dark spots for shell
const COLOR_FROG_BELLY = 0x96d86b;    // Lighter belly
const FROG_SCALE = 0.65;              // Global scale for frog mesh
const COLOR_EYE_WHITE = 0xffffff;     // Eye whites
const COLOR_EYE_PUPIL = 0x000000;     // Eye pupils

// Movement configuration (from Vision Document - game feel)
const HOP_DURATION = 250;           // milliseconds for hop animation
const HOP_HEIGHT = 0.8;             // units to jump above grid
const INPUT_COOLDOWN = 100;         // milliseconds cooldown after landing
const SQUASH_AMOUNT = 0.8;          // scale factor for landing squash
const SQUASH_DURATION = 100;        // milliseconds for squash/stretch animation

// Lane and obstacle configuration (Stage 2 - Road obstacles)
const COLOR_ROAD = 0x2a2a2a;        // Dark gray for road surface
const COLOR_CAR_RED = 0xff3333;     // Bright red for cars
const COLOR_CAR_YELLOW = 0xffdd33;  // Bright yellow for variety
const COLOR_CAR_BLUE = 0x3366ff;    // Bright blue for cars
const COLOR_CAR_PURPLE = 0xaa33ff;  // Purple for cars
const COLOR_CAR_ORANGE = 0xff8800;  // Orange for trucks in late lanes
const COLOR_CAR_TEAL = 0x00c5c5;    // Teal cars for contrast
const COLOR_CAR_LIME = 0x66ff44;    // Lime cars for visibility
const COLOR_CAR_WHITE = 0xffffff;   // White cars for highest contrast
const COLOR_CAR_MAGENTA = 0xff00ff; // Neon magenta cars for late rush
const COLOR_CAR_SILVER = 0xb0b0b0;  // Silver sedans
const COLOR_CAR_NAVY = 0x1122aa;    // Deep navy racers
const COLOR_CAR_WHEEL = 0x1a1a1a;   // Dark wheels
const COLOR_LANE_MARKER = 0xffffff; // White dashed lane dividers
const COLOR_CAR_WINDOW = 0xd7f3ff;  // Light cyan windows
const COLOR_CAR_LIGHT_FRONT = 0xfff8c9;
const COLOR_CAR_LIGHT_REAR = 0xff5c5c;
const COLOR_CAR_TRIM = 0x1d1d1d;

const LANE_TEXTURE_REPEAT_SCALE = 1.2; // Controls how often dash pattern repeats across a lane
const OBJECTIVE_TOP_ROW = GRID_ROWS - 1;
const OBJECTIVE_BOTTOM_ROW = 0;
const OBJECTIVE_TIME_LIMIT = 15;    // seconds for best bonus
const LEVEL_SPEED_INCREMENT = 0.18; // 18% faster per level
const LEVEL_SPAWN_RATE_DECREMENT = 0.05; // 5% less spawn delay per level
const MIN_SPAWN_RATE_MULTIPLIER = 0.4;
const MAX_ACTIVE_COINS = 3;
const COIN_BOB_AMPLITUDE = 0.12;
const COIN_BOB_SPEED = 3;

const CAR_SPAWN_MIN = 2000;         // milliseconds minimum between spawns
const CAR_SPAWN_MAX = 6000;         // milliseconds maximum between spawns
const CAR_POOL_SIZE = 5;            // Number of car objects to pool per lane

// Collision and death configuration (Stage 2.2)
const GRACE_PERIOD = 150;           // milliseconds of invincibility after hop
const DEATH_ANIMATION_DURATION = 500;  // milliseconds for death animation
const RESPAWN_DELAY = 1000;         // milliseconds before respawn after death
const INVINCIBILITY_AFTER_RESPAWN = 500;  // milliseconds invincible after respawn
const COLLISION_HALF_WIDTH = 0.45;  // World units - half-width threshold for frog/car collision on X axis
const LANE_COLLISION_HALF_DEPTH = (CELL_SIZE / 2) + 0.05; // Allow slight tolerance while hopping between rows

// ============================================
// CORE THREE.JS SETUP
// ============================================
let scene, camera, renderer;
let gridGroup;
let objectiveLayer;
let frog; // Player character

// Frog grid position
let frogGridX = 7;  // Center column (15 columns, so middle is 7)
let frogGridY = 0;  // Bottom row

// Movement state
let isHopping = false;              // Is frog currently in hop animation
let canMove = true;                 // Can accept new movement input
let hopStartTime = 0;               // Animation start timestamp
let hopStartPos = { x: 0, y: 0, z: 0 };  // Starting world position
let hopEndPos = { x: 0, y: 0, z: 0 };    // Ending world position
let bufferedInput = null;           // Store one buffered input for responsiveness

// Lane system (Stage 2 - Road obstacles)
let lanes = [];                     // Array of lane objects

// Game state (Stage 2.2 - Collision and death)
let gameState = 'start';            // 'start' | 'playing' | 'dying' | 'dead' | 'gameover'
let isInvincible = false;           // Temporary invincibility flag
let invincibilityEndTime = 0;       // When invincibility expires
let deathStartTime = 0;             // When death animation started
let respawnScheduledTime = 0;       // When to trigger respawn

// Lives system (Stage 2.4)
let lives = 3;                      // Current lives remaining
const STARTING_LIVES = 3;           // Lives at game start
let gameOverDisplayTime = 0;        // When game over message was shown

// Score & progression
let score = 0;
let level = 1;
let objectiveTarget = null;         // { x, y, mesh, active }
let objectiveSide = 'top';          // 'top' or 'bottom'
let levelStartTime = 0;
const OBJECTIVE_SCORE_BASE = 500;
const OBJECTIVE_TIME_BONUS = 10;    // Points per second saved
const COIN_SCORE = 200;
const COIN_LIFETIME = 4000;         // ms before coin disappears
const COIN_SPAWN_INTERVAL = 6000;   // ms between coin spawns
let lastCoinSpawnTime = 0;
let activeCoins = [];
let isGameActive = false;

/**
 * Initialize the Three.js scene, camera, and renderer
 */
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(COLOR_SKY);

    // Setup camera - OrthographicCamera for isometric view (no perspective distortion)
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = CAMERA_FRUSTUM;
    camera = new THREE.OrthographicCamera(
        frustumSize * aspect / -2,  // left
        frustumSize * aspect / 2,   // right
        frustumSize / 2,             // top
        frustumSize / -2,            // bottom
        0.1,                         // near
        1000                         // far
    );

    // Position camera for isometric view
    camera.position.set(CAMERA_POSITION.x, CAMERA_POSITION.y, CAMERA_POSITION.z);
    camera.lookAt(0, 0, 0); // Look at center of play area

    // Setup renderer with antialiasing
    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('game-canvas'),
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Setup lighting
    setupLighting();

    // Create ground plane
    createGroundPlane();

    // Create grid visualization
    createGrid();

    // Create and position the frog
    frog = createFrog();
    const worldPos = gridToWorld(frogGridX, frogGridY);
    frog.position.set(worldPos.x, 0, worldPos.z);
    resetFrogScale();
    scene.add(frog);
    canMove = false;
    console.log(`Frog positioned at grid (${frogGridX}, ${frogGridY}) -> world (${worldPos.x.toFixed(1)}, ${worldPos.z.toFixed(1)})`);

    // Initialize lane system with obstacles
    initializeLanes();
    applyDifficultyScaling();

    initializeObjective();
    setupStartScreen();

    // Setup keyboard input
    setupInputListeners();

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    console.log('Frogger 3D - Scene initialized');
    console.log(`Grid: ${GRID_COLUMNS}x${GRID_ROWS}, Cell size: ${CELL_SIZE} unit`);
}

/**
 * Setup lighting system
 * - AmbientLight for base illumination
 * - DirectionalLight for definition
 * - HemisphereLight for sky/ground color variation
 */
function setupLighting() {
    // Ambient light - provides base illumination for all objects
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Directional light - provides definition and depth
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = false; // Shadows optional per Vision Doc
    scene.add(directionalLight);

    // Hemisphere light - sky/ground color variation for atmosphere
    const hemisphereLight = new THREE.HemisphereLight(
        COLOR_SKY,           // sky color
        COLOR_GROUND_LIGHT,  // ground color
        0.4                  // intensity
    );
    scene.add(hemisphereLight);

    console.log('Lighting setup complete');
}

/**
 * Create ground plane beneath the grid
 * Just for visual context
 */
function createGroundPlane() {
    // Base block adds perceived thickness to the play field
    const baseGeometry = new THREE.BoxGeometry(GRID_WIDTH + 6, GROUND_THICKNESS, GRID_HEIGHT + 6);
    const baseMaterial = new THREE.MeshLambertMaterial({ color: COLOR_GROUND_EDGE });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = -(GROUND_THICKNESS / 2);
    scene.add(base);

    // Top surface mimics the grassy play area
    const topGeometry = new THREE.PlaneGeometry(GRID_WIDTH + 2, GRID_HEIGHT + 2);
    const topMaterial = new THREE.MeshLambertMaterial({
        color: COLOR_GROUND,
        side: THREE.DoubleSide
    });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.rotation.x = -Math.PI / 2;
    top.position.y = 0.01;
    scene.add(top);

    // Keep objective/coin layers above the ground
    objectiveLayer = new THREE.Group();
    scene.add(objectiveLayer);

    console.log('Ground platform created with depth');
}

function createCoinMesh() {
    const geometry = new THREE.CylinderGeometry(0.25, 0.25, 0.15, 12);
    const material = new THREE.MeshLambertMaterial({ color: 0xffd700, emissive: 0xffc300, emissiveIntensity: 0.6 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = Math.PI / 2;
    return mesh;
}

/**
 * Create 15x13 grid visualization
 * Using thin boxes to show grid cells
 * Grid is centered at world origin
 */
function createGrid() {
    gridGroup = new THREE.Group();

    const lineThickness = 0.02;
    const lineMaterial = new THREE.MeshBasicMaterial({ color: COLOR_GRID });

    // Calculate grid offset to center it at origin
    const offsetX = -(GRID_WIDTH / 2);
    const offsetZ = -(GRID_HEIGHT / 2);

    // Create vertical lines (columns)
    for (let i = 0; i <= GRID_COLUMNS; i++) {
        const lineGeometry = new THREE.BoxGeometry(lineThickness, 0.1, GRID_HEIGHT);
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        line.position.set(
            offsetX + (i * CELL_SIZE),
            0,
            0
        );
        gridGroup.add(line);
    }

    // Create horizontal lines (rows)
    for (let i = 0; i <= GRID_ROWS; i++) {
        const lineGeometry = new THREE.BoxGeometry(GRID_WIDTH, 0.1, lineThickness);
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        line.position.set(
            0,
            0,
            offsetZ + (i * CELL_SIZE)
        );
        gridGroup.add(line);
    }

    scene.add(gridGroup);
    console.log(`Grid created: ${GRID_COLUMNS}x${GRID_ROWS} cells, centered at origin`);
}

function createObjectiveMesh() {
    const geometry = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16);
    const material = new THREE.MeshLambertMaterial({ color: 0xffe066, emissive: 0xffc107, emissiveIntensity: 0.5 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = Math.PI / 2;
    return mesh;
}

function initializeObjective() {
    objectiveSide = 'top';
    spawnObjectiveTarget();
    levelStartTime = performance.now();
    lastCoinSpawnTime = levelStartTime;
}

function spawnObjectiveTarget() {
    if (objectiveTarget && objectiveTarget.mesh) {
        objectiveLayer.remove(objectiveTarget.mesh);
    }

    const gridY = objectiveSide === 'top' ? OBJECTIVE_TOP_ROW : OBJECTIVE_BOTTOM_ROW;
    let gridX = Math.floor(Math.random() * GRID_COLUMNS);
    if (objectiveSide === 'bottom') {
        const spawnColumn = Math.floor(GRID_COLUMNS / 2);
        while (gridX === spawnColumn) {
            gridX = Math.floor(Math.random() * GRID_COLUMNS);
        }
    }

    const mesh = createObjectiveMesh();
    const worldPos = gridToWorld(gridX, gridY);
    mesh.position.set(worldPos.x, 0.15, worldPos.z);
    objectiveLayer.add(mesh);

    objectiveTarget = {
        gridX,
        gridY,
        mesh,
        active: true
    };
}

function checkObjectiveReached() {
    if (!objectiveTarget || !objectiveTarget.active) return;

    if (frogGridY === objectiveTarget.gridY && frogGridX === objectiveTarget.gridX) {
        handleObjectiveCompletion();
    }
}

function handleObjectiveCompletion() {
    if (!objectiveTarget) return;
    objectiveTarget.active = false;

    if (objectiveTarget.mesh) {
        objectiveLayer.remove(objectiveTarget.mesh);
    }

    const elapsedSeconds = (performance.now() - levelStartTime) / 1000;
    const timeBonus = Math.max(0, Math.round((OBJECTIVE_TIME_LIMIT - elapsedSeconds) * OBJECTIVE_TIME_BONUS));
    addScore(OBJECTIVE_SCORE_BASE + timeBonus);
    console.log(`🎯 Objective reached in ${elapsedSeconds.toFixed(2)}s (bonus ${timeBonus})`);

    level++;
    updateLevelDisplay();

    objectiveSide = objectiveSide === 'top' ? 'bottom' : 'top';
    spawnObjectiveTarget();
    levelStartTime = performance.now();
    updateTimerDisplay(0);

    applyDifficultyScaling();
    clearCoins();
    lastCoinSpawnTime = performance.now();
}

function applyDifficultyScaling() {
    const speedMultiplier = getSpeedMultiplier();
    for (const lane of lanes) {
        lane.speed = lane.baseSpeed * speedMultiplier;
    }
}

function getSpeedMultiplier() {
    return 1 + (level - 1) * LEVEL_SPEED_INCREMENT;
}

function getSpawnRateMultiplier() {
    return Math.max(MIN_SPAWN_RATE_MULTIPLIER, 1 - (level - 1) * LEVEL_SPAWN_RATE_DECREMENT);
}

function spawnCoin() {
    if (activeCoins.length >= MAX_ACTIVE_COINS || lanes.length === 0) return;

    const lane = lanes[Math.floor(Math.random() * lanes.length)];
    const gridY = lane.gridY;
    const gridX = Math.floor(Math.random() * GRID_COLUMNS);

    const mesh = createCoinMesh();
    const worldPos = gridToWorld(gridX, gridY);
    mesh.position.set(worldPos.x, 0.25, worldPos.z);
    objectiveLayer.add(mesh);

    const spawnTime = performance.now();
    activeCoins.push({ mesh, gridX, gridY, spawnTime, expireTime: spawnTime + COIN_LIFETIME });
    lastCoinSpawnTime = spawnTime;
}

function updateCoins(currentTime) {
    if (currentTime - lastCoinSpawnTime >= COIN_SPAWN_INTERVAL) {
        spawnCoin();
    }

    activeCoins = activeCoins.filter((coin) => {
        if (currentTime >= coin.expireTime) {
            objectiveLayer.remove(coin.mesh);
            return false;
        }

        const bob = Math.sin(((currentTime - coin.spawnTime) / 1000) * COIN_BOB_SPEED) * COIN_BOB_AMPLITUDE;
        coin.mesh.position.y = 0.25 + bob;

        if (coin.gridY === frogGridY && Math.abs(coin.gridX - frogGridX) < 0.5) {
            collectCoin(coin);
            return false;
        }

        return true;
    });
}

function collectCoin(coin) {
    objectiveLayer.remove(coin.mesh);
    addScore(COIN_SCORE);
    console.log('🪙 Coin collected!');
}

function clearCoins() {
    for (const coin of activeCoins) {
        objectiveLayer.remove(coin.mesh);
    }
    activeCoins = [];
}

/**
 * Convert numeric hex color to CSS string
 * @param {number} hexColor
 * @returns {string}
 */
function hexToCss(hexColor) {
    return `#${hexColor.toString(16).padStart(6, '0')}`;
}

let laneTextureBase = null;

/**
 * Lazily create and cache the dashed lane texture
 * @returns {THREE.CanvasTexture}
 */
function getLaneTexture() {
    if (laneTextureBase) {
        return laneTextureBase;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = hexToCss(COLOR_ROAD);
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = hexToCss(COLOR_LANE_MARKER);
    const stripeHeight = 10;
    const stripeY = canvas.height - stripeHeight - 2;
    const dashLength = 90;
    const gap = 40;
    for (let x = 0; x < canvas.width + dashLength; x += dashLength + gap) {
        ctx.fillRect(x, stripeY, dashLength, stripeHeight);
    }

    laneTextureBase = new THREE.CanvasTexture(canvas);
    laneTextureBase.wrapS = THREE.RepeatWrapping;
    laneTextureBase.wrapT = THREE.ClampToEdgeWrapping;
    laneTextureBase.magFilter = THREE.LinearFilter;
    laneTextureBase.minFilter = THREE.LinearMipmapLinearFilter;

    return laneTextureBase;
}

/**
 * Convert grid coordinates to world coordinates
 * Grid is centered at origin, so need to offset by half grid size
 * @param {number} gridX - Grid X position (0 to GRID_COLUMNS-1)
 * @param {number} gridY - Grid Y position (0 to GRID_ROWS-1)
 * @returns {Object} World position {x, z}
 */
function gridToWorld(gridX, gridY) {
    return {
        x: (gridX - Math.floor(GRID_COLUMNS / 2)) * CELL_SIZE,
        z: (gridY - Math.floor(GRID_ROWS / 2)) * CELL_SIZE
    };
}

/**
 * Create a voxel (single box unit)
 * @param {number} color - Hex color for the voxel
 * @param {number} x - Local X position
 * @param {number} y - Local Y position
 * @param {number} z - Local Z position
 * @returns {THREE.Mesh} Voxel mesh
 */
function createVoxel(color, x, y, z) {
    const geometry = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
    const material = new THREE.MeshLambertMaterial({ color: color });
    const voxel = new THREE.Mesh(geometry, material);
    voxel.position.set(x, y, z);
    return voxel;
}

/**
 * Create the player frog character from voxels
 * Frog is built from multiple 0.5×0.5×0.5 voxel cubes
 * Returns a Group containing all voxel pieces
 */
function createFrog() {
    const frogGroup = new THREE.Group();
    const add = (color, x, y, z) => frogGroup.add(createVoxel(color, x, y, z));

    // Layered torso shell
    const torsoLayers = [0.25, 0.75, 1.25];
    const torsoOffsets = [-0.25, 0, 0.25];
    torsoLayers.forEach((height, idx) => {
        const scale = torsoOffsets.length - Math.abs(idx - 1);
        for (let x = -scale * 0.15; x <= scale * 0.15; x += 0.3) {
            add(COLOR_FROG_BODY, x, height, 0);
        }
    });

    // Lighter belly stripe
    add(COLOR_FROG_BELLY, -0.15, 0.5, 0.05);
    add(COLOR_FROG_BELLY, 0.15, 0.5, 0.05);

    // Back spots/plates
    add(COLOR_FROG_SPOTS, 0, 0.95, -0.15);
    add(COLOR_FROG_SPOTS, -0.2, 0.75, -0.05);
    add(COLOR_FROG_SPOTS, 0.2, 0.75, -0.05);

    // Head & snout
    add(COLOR_FROG_BODY, 0, 1.45, 0.35);
    add(COLOR_FROG_BODY, -0.25, 1.2, 0.35);
    add(COLOR_FROG_BODY, 0.25, 1.2, 0.35);
    add(COLOR_FROG_DARK, 0, 1.05, 0.5); // nostril ridge

    // Eyes + pupils
    [-0.35, 0.35].forEach((x) => {
        add(COLOR_EYE_WHITE, x, 1.55, 0.5);
        add(COLOR_EYE_PUPIL, x, 1.55, 0.7);
    });

    // Front legs with toes
    [-0.45, 0.45].forEach((x) => {
        add(COLOR_FROG_DARK, x, 0.25, 0.6);
        add(COLOR_FROG_DARK, x, 0.25, 0.4);
        add(COLOR_FROG_DARK, x + (x < 0 ? -0.1 : 0.1), 0.2, 0.75);
    });

    // Back legs & thighs
    [-0.55, 0.55].forEach((x) => {
        add(COLOR_FROG_DARK, x, 0.25, -0.2);
        add(COLOR_FROG_DARK, x, 0.5, -0.1);
        add(COLOR_FROG_DARK, x + (x < 0 ? -0.15 : 0.15), 0.25, -0.45);
        add(COLOR_FROG_DARK, x + (x < 0 ? -0.25 : 0.25), 0.2, -0.65);
    });

    console.log('Voxel frog character created');
    return frogGroup;
}

function resetFrogScale() {
    if (frog) {
        frog.scale.set(FROG_SCALE, FROG_SCALE, FROG_SCALE);
    }
}

// ============================================
// LANE & OBSTACLE SYSTEM (Stage 2)
// ============================================

const CAR_VARIANTS = [
    {
        type: 'coupe',
        bodyLength: 1.6,
        bodyHeight: 0.35,
        roofLength: 0.7,
        roofHeight: 0.3,
        roofOffset: 0.1,
        wheelBase: 0.9,
        wheelWidth: 0.55,
        spoiler: true
    },
    {
        type: 'sedan',
        bodyLength: 1.7,
        bodyHeight: 0.45,
        roofLength: 0.9,
        roofHeight: 0.35,
        roofOffset: 0,
        wheelBase: 0.95,
        wheelWidth: 0.6,
        spoiler: false
    },
    {
        type: 'hatch',
        bodyLength: 1.4,
        bodyHeight: 0.4,
        roofLength: 0.85,
        roofHeight: 0.4,
        roofOffset: -0.1,
        wheelBase: 0.8,
        wheelWidth: 0.65,
        spoiler: false
    },
    {
        type: 'pickup',
        bodyLength: 1.9,
        bodyHeight: 0.45,
        roofLength: 0.8,
        roofHeight: 0.4,
        roofOffset: 0.4,
        wheelBase: 1.1,
        wheelWidth: 0.7,
        bedLength: 0.7,
        spoiler: false
    }
];

function createBox(width, height, depth, color) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshLambertMaterial({ color });
    return new THREE.Mesh(geometry, material);
}

function createWheel(radius = 0.22, thickness = 0.25) {
    const geometry = new THREE.CylinderGeometry(radius, radius, thickness, 12);
    const material = new THREE.MeshLambertMaterial({ color: COLOR_CAR_WHEEL });
    const wheel = new THREE.Mesh(geometry, material);
    wheel.rotation.z = Math.PI / 2;
    return wheel;
}

function createCar(color) {
    const variant = CAR_VARIANTS[Math.floor(Math.random() * CAR_VARIANTS.length)];
    const group = new THREE.Group();

    const body = createBox(variant.bodyLength, variant.bodyHeight, 0.75, color);
    body.position.y = variant.bodyHeight / 2;
    group.add(body);

    const hood = createBox(0.45, variant.bodyHeight * 0.6, 0.7, color);
    hood.position.set(-variant.bodyLength / 2 + 0.25, variant.bodyHeight * 0.85, 0);
    group.add(hood);

    const trunk = createBox(0.35, variant.bodyHeight * 0.5, 0.7, color);
    trunk.position.set(variant.bodyLength / 2 - 0.2, variant.bodyHeight * 0.8, 0);
    group.add(trunk);

    const roof = createBox(variant.roofLength, variant.roofHeight, 0.6, COLOR_CAR_SILVER);
    roof.position.set(variant.roofOffset, variant.bodyHeight + variant.roofHeight / 2, 0);
    group.add(roof);

    const windows = createBox(variant.roofLength * 0.9, variant.roofHeight * 0.75, 0.5, COLOR_CAR_WINDOW);
    windows.position.set(variant.roofOffset, variant.bodyHeight + variant.roofHeight, 0);
    group.add(windows);

    const headlightOffset = variant.bodyLength / 2 - 0.1;
    [-0.25, 0.25].forEach((z) => {
        const frontLight = createBox(0.08, 0.08, 0.12, COLOR_CAR_LIGHT_FRONT);
        frontLight.position.set(headlightOffset, variant.bodyHeight * 0.4, z);
        group.add(frontLight);

        const rearLight = createBox(0.08, 0.08, 0.12, COLOR_CAR_LIGHT_REAR);
        rearLight.position.set(-headlightOffset, variant.bodyHeight * 0.4, z);
        group.add(rearLight);
    });

    if (variant.bedLength) {
        const bed = createBox(variant.bedLength, variant.bodyHeight * 0.45, 0.7, COLOR_CAR_TRIM);
        bed.position.set(variant.bodyLength / 4, variant.bodyHeight * 0.6, 0);
        group.add(bed);
    }

    if (variant.spoiler) {
        const spoiler = createBox(0.4, 0.05, 0.8, COLOR_CAR_TRIM);
        spoiler.position.set(variant.bodyLength / 2 - 0.15, variant.bodyHeight + 0.25, 0);
        group.add(spoiler);
    }

    const wheelZ = variant.wheelWidth / 2;
    [-wheelZ, wheelZ].forEach((z) => {
        const frontWheel = createWheel();
        frontWheel.position.set(variant.wheelBase / 2, 0.15, z);
        group.add(frontWheel);

        const rearWheel = createWheel();
        rearWheel.position.set(-variant.wheelBase / 2, 0.15, z);
        group.add(rearWheel);
    });

    return group;
}

/**
 * Create a road lane visual (dark surface)
 * @param {number} gridY - Grid Y position for the lane
 * @returns {THREE.Mesh} Road surface mesh
 */
function createRoadLane(gridY) {
    const roadGeometry = new THREE.PlaneGeometry(GRID_WIDTH, CELL_SIZE);

    const texture = getLaneTexture().clone();
    texture.needsUpdate = true;
    texture.repeat.set(GRID_WIDTH / LANE_TEXTURE_REPEAT_SCALE, 1);

    const roadMaterial = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        map: texture,
        transparent: false,
        side: THREE.DoubleSide
    });

    const road = new THREE.Mesh(roadGeometry, roadMaterial);

    // Position at the specified grid row
    const worldPos = gridToWorld(Math.floor(GRID_COLUMNS / 2), gridY);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.051, worldPos.z);

    return road;
}

/**
 * Vehicle class - represents a moving car obstacle
 */
class Vehicle {
    constructor(carMesh, lane) {
        this.mesh = carMesh;
        this.lane = lane;
        this.active = false;
        this.gridX = -LANE_ENTRY_OFFSET; // Start near road edge
        this.speed = lane.speed;
    }

    /**
     * Reset vehicle to spawn position
     */
    spawn() {
        this.active = true;

        // Spawn position depends on lane direction
        if (this.lane.direction === 'right') {
            this.gridX = -LANE_ENTRY_OFFSET;
        } else {
            this.gridX = GRID_COLUMNS - 1 + LANE_ENTRY_OFFSET;
        }

        const worldPos = gridToWorld(this.gridX, this.lane.gridY);
        this.mesh.position.set(worldPos.x, 0.3, worldPos.z);
        this.mesh.visible = true;

        // Rotate car to face movement direction
        if (this.lane.direction === 'left') {
            this.mesh.rotation.y = Math.PI; // Face left (180 degrees)
        } else {
            this.mesh.rotation.y = 0; // Face right
        }

        console.log(`🚗 ${this.lane.direction.toUpperCase()} car spawned in lane ${this.lane.gridY}`);
    }

    /**
     * Update vehicle position
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        if (!this.active) return;

        // Move based on lane direction and speed
        const movement = this.speed * deltaTime * (this.lane.direction === 'right' ? 1 : -1);
        this.gridX += movement;

        // Update world position
        const worldPos = gridToWorld(this.gridX, this.lane.gridY);
        this.mesh.position.x = worldPos.x;

        // Check if car has exited screen (both directions)
        if (this.lane.direction === 'right' && this.gridX >= GRID_COLUMNS - 1 + LANE_ENTRY_OFFSET) {
            this.despawn();
        } else if (this.lane.direction === 'left' && this.gridX <= -LANE_ENTRY_OFFSET) {
            this.despawn();
        }
    }

    /**
     * Deactivate vehicle (ready for reuse)
     */
    despawn() {
        this.active = false;
        this.mesh.visible = false;
        console.log(`🚗 Car despawned from lane ${this.lane.gridY}`);
    }
}

/**
 * Lane class - manages a lane with obstacles
 */
class Lane {
    constructor(type, gridY, speed, direction, carColor = COLOR_CAR_RED) {
        this.type = type;           // 'road', 'river', 'safe', 'goal'
        this.gridY = gridY;         // Grid Y position
        this.baseSpeed = speed;
        this.speed = speed;         // Units per second
        this.direction = direction; // 'left' or 'right'
        this.carColor = carColor;   // Color for vehicles in this lane
        this.obstacles = [];        // Array of Vehicle objects
        this.vehiclePool = [];      // Pool of reusable car meshes
        this.nextSpawnTime = 0;     // Timestamp for next spawn
        this.roadMesh = null;       // Visual road surface

        // Create road visual
        if (type === 'road') {
            this.roadMesh = createRoadLane(gridY);
            scene.add(this.roadMesh);
        }

        // Create vehicle pool
        this.initializeVehiclePool();

        // Schedule first spawn
        this.scheduleNextSpawn();
    }

    /**
     * Create pool of reusable vehicle objects
     */
    initializeVehiclePool() {
        for (let i = 0; i < CAR_POOL_SIZE; i++) {
            const carMesh = createCar(this.carColor);
            carMesh.visible = false;
            scene.add(carMesh);

            const vehicle = new Vehicle(carMesh, this);
            this.vehiclePool.push(vehicle);
        }
        console.log(`Lane ${this.gridY}: Created pool of ${CAR_POOL_SIZE} ${this.direction} vehicles`);
    }

    /**
     * Get an inactive vehicle from the pool
     * @returns {Vehicle|null} Available vehicle or null if pool exhausted
     */
    getAvailableVehicle() {
        return this.vehiclePool.find(v => !v.active) || null;
    }

    /**
     * Schedule next vehicle spawn
     */
    scheduleNextSpawn() {
        const spawnMultiplier = getSpawnRateMultiplier();
        const minDelay = CAR_SPAWN_MIN * spawnMultiplier;
        const maxDelay = CAR_SPAWN_MAX * spawnMultiplier;
        const delay = minDelay + Math.random() * (maxDelay - minDelay);
        this.nextSpawnTime = performance.now() + delay;
    }

    /**
     * Spawn a new vehicle if it's time
     * @param {number} currentTime - Current timestamp
     */
    spawnVehicle(currentTime) {
        if (currentTime >= this.nextSpawnTime) {
            const vehicle = this.getAvailableVehicle();
            if (vehicle) {
                vehicle.spawn();
                this.obstacles.push(vehicle);
                this.scheduleNextSpawn();
            }
        }
    }

    /**
     * Update all obstacles in this lane
     * @param {number} deltaTime - Time since last frame in seconds
     * @param {number} currentTime - Current timestamp
     */
    update(deltaTime, currentTime) {
        // Spawn new vehicles
        this.spawnVehicle(currentTime);

        // Update existing vehicles
        for (const vehicle of this.obstacles) {
            if (vehicle.active) {
                vehicle.update(deltaTime);
            }
        }

        // Remove inactive vehicles from obstacles array
        this.obstacles = this.obstacles.filter(v => v.active);
    }
}

/**
 * Initialize the lane system
 * Creates 11 road lanes with varied speeds, directions, and colors (Stage 2.3)
 */
function initializeLanes() {
    console.log('Initializing multi-lane road system...');

    // Lane 1: Slow RIGHT lane with RED cars
    const lane1 = new Lane('road', 1, 1.5, 'right', COLOR_CAR_RED);
    lanes.push(lane1);
    spawnInitialCars(lane1, 3, 4); // 3 cars, spaced 4 units apart

    // Lane 2: Medium-fast LEFT lane with BLUE cars
    const lane2 = new Lane('road', 2, 2.0, 'left', COLOR_CAR_BLUE);
    lanes.push(lane2);
    spawnInitialCars(lane2, 2, 5); // 2 cars, spaced 5 units apart

    // Lane 3: Fast RIGHT lane with YELLOW cars
    const lane3 = new Lane('road', 3, 2.5, 'right', COLOR_CAR_YELLOW);
    lanes.push(lane3);
    spawnInitialCars(lane3, 2, 6); // 2 cars, spaced 6 units (more gaps for faster lane)

    // Lane 4: Medium LEFT lane with PURPLE cars
    const lane4 = new Lane('road', 4, 1.8, 'left', COLOR_CAR_PURPLE);
    lanes.push(lane4);
    spawnInitialCars(lane4, 3, 4); // 3 cars, spaced 4 units apart

    // Lane 5: Heavy RIGHT lane with ORANGE trucks
    const lane5 = new Lane('road', 5, 2.2, 'right', COLOR_CAR_ORANGE);
    lanes.push(lane5);
    spawnInitialCars(lane5, 2, 5); // Slightly larger spacing

    // Lane 6: Wide LEFT lane with TEAL vans
    const lane6 = new Lane('road', 6, 1.6, 'left', COLOR_CAR_TEAL);
    lanes.push(lane6);
    spawnInitialCars(lane6, 3, 4);

    // Lane 7: Fast RIGHT lane with LIME sports cars
    const lane7 = new Lane('road', 7, 3.0, 'right', COLOR_CAR_LIME);
    lanes.push(lane7);
    spawnInitialCars(lane7, 2, 7); // Long gaps for high-speed cars

    // Lane 8: Slow LEFT lane with WHITE cars for tight timing
    const lane8 = new Lane('road', 8, 1.3, 'left', COLOR_CAR_WHITE);
    lanes.push(lane8);
    spawnInitialCars(lane8, 3, 3); // Tight spacing keeps pressure up

    // Lane 9: High-pressure RIGHT lane with MAGENTA cars
    const lane9 = new Lane('road', 9, 2.4, 'right', COLOR_CAR_MAGENTA);
    lanes.push(lane9);
    spawnInitialCars(lane9, 3, 5);

    // Lane 10: Methodical LEFT lane with SILVER sedans
    const lane10 = new Lane('road', 10, 1.4, 'left', COLOR_CAR_SILVER);
    lanes.push(lane10);
    spawnInitialCars(lane10, 2, 4);

    // Lane 11: Long-haul RIGHT lane with NAVY racers
    const lane11 = new Lane('road', 11, 2.8, 'right', COLOR_CAR_NAVY);
    lanes.push(lane11);
    spawnInitialCars(lane11, 2, 8);

    console.log('✓ 11-lane road system initialized');
    console.log('  Lane 1: 1.5 u/s RIGHT (RED)');
    console.log('  Lane 2: 2.0 u/s LEFT (BLUE)');
    console.log('  Lane 3: 2.5 u/s RIGHT (YELLOW)');
    console.log('  Lane 4: 1.8 u/s LEFT (PURPLE)');
    console.log('  Lane 5: 2.2 u/s RIGHT (ORANGE)');
    console.log('  Lane 6: 1.6 u/s LEFT (TEAL)');
    console.log('  Lane 7: 3.0 u/s RIGHT (LIME)');
    console.log('  Lane 8: 1.3 u/s LEFT (WHITE)');
    console.log('  Lane 9: 2.4 u/s RIGHT (MAGENTA)');
    console.log('  Lane 10: 1.4 u/s LEFT (SILVER)');
    console.log('  Lane 11: 2.8 u/s RIGHT (NAVY)');
}

/**
 * Spawn initial cars in a lane with specified spacing
 * @param {Lane} lane - The lane to spawn cars in
 * @param {number} count - Number of cars to spawn
 * @param {number} spacing - Units of spacing between cars
 */
function spawnInitialCars(lane, count, spacing) {
    for (let i = 0; i < count; i++) {
        const vehicle = lane.getAvailableVehicle();
        if (vehicle) {
            // Position depends on lane direction
            if (lane.direction === 'right') {
                vehicle.gridX = -LANE_ENTRY_OFFSET - (i * spacing);
            } else {
                vehicle.gridX = GRID_COLUMNS - 1 + LANE_ENTRY_OFFSET + (i * spacing);
            }
            vehicle.spawn();
            lane.obstacles.push(vehicle);
        }
    }
}

// ============================================
// COLLISION & DEATH SYSTEM (Stage 2.2)
// ============================================

/**
 * Check for collisions between frog and obstacles
 * @returns {boolean} True if collision detected
 */
function checkCollision() {
    // Don't check if invincible or not playing
    if (isInvincible || gameState !== 'playing') {
        return false;
    }

    const frogPos = frog.position;

    for (const lane of lanes) {
        const laneWorldPos = gridToWorld(Math.floor(GRID_COLUMNS / 2), lane.gridY);
        const distanceToLane = Math.abs(frogPos.z - laneWorldPos.z);

        // Skip if frog is not within this lane's depth (covers mid-hop traversal)
        if (distanceToLane > LANE_COLLISION_HALF_DEPTH) {
            continue;
        }

        for (const vehicle of lane.obstacles) {
            if (!vehicle.active) continue;

            const carPos = vehicle.mesh.position;
            const distanceX = Math.abs(frogPos.x - carPos.x);
            const distanceZ = Math.abs(frogPos.z - carPos.z);

            if (distanceX < COLLISION_HALF_WIDTH && distanceZ < LANE_COLLISION_HALF_DEPTH) {
                console.log(`💥 COLLISION! Frog world (${frogPos.x.toFixed(2)}, ${frogPos.z.toFixed(2)}) hit car at (${carPos.x.toFixed(2)}, ${carPos.z.toFixed(2)}) in lane ${lane.gridY}`);
                return true;
            }
        }
    }

    return false;
}

/**
 * Trigger death sequence
 * Deducts life, plays death animation, schedules respawn or game over
 */
function death() {
    console.log('☠️  DEATH!');

    // Deduct a life BEFORE death animation
    lives--;
    updateLivesDisplay();

    gameState = 'dying';
    canMove = false;
    isHopping = false;
    bufferedInput = null;

    deathStartTime = performance.now();
    respawnScheduledTime = deathStartTime + DEATH_ANIMATION_DURATION + RESPAWN_DELAY;

    // Start death animation
    animateDeath();
}

/**
 * Death animation - frog shrinks and falls
 */
function animateDeath() {
    // This will be called each frame in the animate loop
    // The actual animation update is in updateDeathAnimation()
}

/**
 * Update death animation each frame
 * @param {number} currentTime - Current timestamp
 */
function updateDeathAnimation(currentTime) {
    if (gameState !== 'dying') return;

    const elapsed = currentTime - deathStartTime;
    const progress = Math.min(elapsed / DEATH_ANIMATION_DURATION, 1.0);

    // Shrink and sink animation
    const scale = (1 - progress) * FROG_SCALE;
    frog.scale.set(scale, scale, scale);

    // Rotate while falling
    frog.rotation.x = progress * Math.PI * 2;

    // Sink into ground
    frog.position.y = -progress * 2;

    // Check if animation complete and time to respawn or game over
    if (currentTime >= respawnScheduledTime) {
        if (lives <= 0) {
            gameOver();
        } else {
            respawn();
        }
    }
}

/**
 * Respawn the frog at starting position
 * Resets all state and grants brief invincibility
 */
function respawn() {
    console.log('♻️  RESPAWNED at starting position');

    // Reset position to start
    frogGridX = 7;
    frogGridY = 0;

    const worldPos = gridToWorld(frogGridX, frogGridY);
    frog.position.set(worldPos.x, 0, worldPos.z);

    // Reset visual state
    resetFrogScale();
    frog.rotation.set(0, 0, 0);

    // Enable movement and set invincibility
    gameState = 'playing';
    canMove = true;
    isInvincible = true;
    invincibilityEndTime = performance.now() + INVINCIBILITY_AFTER_RESPAWN;

    // Move objective to opposite side to avoid instant completion
    objectiveSide = 'top'; // respawn location is always bottom, so target moves to top
    spawnObjectiveTarget();
    levelStartTime = performance.now();
    updateTimerDisplay(0);

    console.log(`⭐ Invincible for ${INVINCIBILITY_AFTER_RESPAWN}ms`);
}

/**
 * Update invincibility state
 * @param {number} currentTime - Current timestamp
 */
function updateInvincibility(currentTime) {
    if (isInvincible && currentTime >= invincibilityEndTime) {
        isInvincible = false;
        console.log('✓ Invincibility ended');
    }

    // Optional: Flash effect during invincibility
    if (isInvincible && gameState === 'playing') {
        const flashSpeed = 10;
        const flash = Math.sin(currentTime / 50 * flashSpeed) > 0;
        frog.visible = flash;
    } else if (gameState !== 'gameover') {
        frog.visible = true;
    }
}

// ============================================
// UI & LIVES SYSTEM (Stage 2.4)
// ============================================

/**
 * Update the lives display in the UI
 */
function updateLivesDisplay() {
    const livesCountElement = document.getElementById('lives-count');
    if (livesCountElement) {
        // Display hearts based on remaining lives
        const hearts = '❤️'.repeat(lives);
        livesCountElement.textContent = hearts || '💀';
        console.log(`Lives remaining: ${lives}`);
    }
}

function addScore(points) {
    score += Math.max(0, Math.floor(points));
    updateScoreDisplay();
}

function updateScoreDisplay() {
    const scoreElement = document.getElementById('score-value');
    if (scoreElement) {
        scoreElement.textContent = score.toLocaleString();
    }
}

function updateLevelDisplay() {
    const levelElement = document.getElementById('level-value');
    if (levelElement) {
        levelElement.textContent = level.toString();
    }
}

function updateTimerDisplay(seconds) {
    const timerElement = document.getElementById('timer-value');
    if (timerElement) {
        timerElement.textContent = `${seconds.toFixed(1)}s`;
    }
}

function setupStartScreen() {
    const startButton = document.getElementById('start-button');
    if (startButton) {
        startButton.addEventListener('click', startGame);
    }

    const restartButton = document.getElementById('restart-button');
    if (restartButton) {
        restartButton.addEventListener('click', () => {
            const gameOverMessage = document.getElementById('game-over-message');
            if (gameOverMessage) {
                gameOverMessage.style.display = 'none';
            }
            resetGame();
            startGame();
        });
    }
}

function startGame() {
    if (isGameActive) return;
    const startScreen = document.getElementById('start-screen');
    if (startScreen) {
        startScreen.style.display = 'none';
    }

    isGameActive = true;
    gameState = 'playing';
    canMove = true;
    levelStartTime = performance.now();
    lastCoinSpawnTime = levelStartTime;
    updateTimerDisplay(0);
}

/**
 * Trigger game over sequence
 * Shows game over message and schedules game reset
 */
function gameOver() {
    console.log('');
    console.log('═══════════════════════════════');
    console.log('       GAME OVER!');
    console.log('═══════════════════════════════');
    console.log('');

    gameState = 'gameover';
    canMove = false;

    // Hide frog
    frog.visible = false;

    // Show game over message
    const gameOverMessage = document.getElementById('game-over-message');
    if (gameOverMessage) {
        const finalScore = document.getElementById('final-score');
        if (finalScore) finalScore.textContent = score.toLocaleString();
        const finalLevel = document.getElementById('final-level');
        if (finalLevel) finalLevel.textContent = level.toString();
        const finalObjectives = document.getElementById('final-objectives');
        if (finalObjectives) finalObjectives.textContent = Math.max(0, level - 1).toString();
        gameOverMessage.style.display = 'block';
    }

    gameOverDisplayTime = performance.now();

    isGameActive = false;
}

/**
 * Reset the game to initial state
 * Restores lives, repositions frog, clears lanes
 */
function resetGame() {
    console.log('♻️  Resetting game...');

    // Hide game over message
    const gameOverMessage = document.getElementById('game-over-message');
    if (gameOverMessage) {
        gameOverMessage.style.display = 'none';
    }

    // Reset lives
    lives = STARTING_LIVES;
    updateLivesDisplay();

    // Reset score and level
    score = 0;
    level = 1;
    updateScoreDisplay();
    updateLevelDisplay();

    // Reset frog position
    frogGridX = 7;
    frogGridY = 0;
    const worldPos = gridToWorld(frogGridX, frogGridY);
    frog.position.set(worldPos.x, 0, worldPos.z);
    resetFrogScale();
    frog.rotation.set(0, 0, 0);
    frog.visible = true;

    // Reset game state
    gameState = 'start';
    canMove = false;
    isHopping = false;
    bufferedInput = null;
    isInvincible = true;
    invincibilityEndTime = performance.now() + INVINCIBILITY_AFTER_RESPAWN;

    // Reset objectives/coins
    objectiveSide = 'top';
    spawnObjectiveTarget();
    levelStartTime = performance.now();
    updateTimerDisplay(0);
    clearCoins();
    lastCoinSpawnTime = levelStartTime;
    applyDifficultyScaling();

    isGameActive = false;

    console.log('✓ Game reset complete - Good luck!');
}

// ============================================
// MOVEMENT SYSTEM
// ============================================

/**
 * Check if a grid position is valid (within bounds)
 * @param {number} x - Grid X coordinate
 * @param {number} y - Grid Y coordinate
 * @returns {boolean} True if position is within grid bounds
 */
function isValidGridPosition(x, y) {
    return x >= 0 && x < GRID_COLUMNS && y >= 0 && y < GRID_ROWS;
}

/**
 * Attempt to move frog in a direction
 * @param {number} dx - Change in X (-1, 0, or 1)
 * @param {number} dy - Change in Y (-1, 0, or 1)
 * @returns {boolean} True if movement was initiated
 */
function updateGridPosition(dx, dy) {
    // Calculate new position
    const newX = frogGridX + dx;
    const newY = frogGridY + dy;

    // Check bounds
    if (!isValidGridPosition(newX, newY)) {
        console.log(`❌ Cannot move to (${newX}, ${newY}) - out of bounds`);
        return false;
    }

    // Can't move if already hopping
    if (!canMove) {
        return false;
    }

    // Update grid position
    frogGridX = newX;
    frogGridY = newY;

    // Calculate world positions
    const fromWorld = {
        x: frog.position.x,
        y: frog.position.y,
        z: frog.position.z
    };
    const toWorld = gridToWorld(frogGridX, frogGridY);
    toWorld.y = 0; // Ground level

    // Start hop animation
    startHop(fromWorld, toWorld, dx, dy);

    console.log(`🐸 Hopping to grid (${frogGridX}, ${frogGridY})`);
    return true;
}

/**
 * Start a hop animation from one position to another
 * @param {Object} from - Starting world position {x, y, z}
 * @param {Object} to - Ending world position {x, y, z}
 * @param {number} dx - Direction X for rotation
 * @param {number} dy - Direction Y for rotation
 */
function startHop(from, to, dx, dy) {
    isHopping = true;
    canMove = false;
    hopStartTime = performance.now();
    hopStartPos = { ...from };
    hopEndPos = { ...to };

    // Rotate frog to face movement direction
    if (dx !== 0 || dy !== 0) {
        const angle = Math.atan2(dx, dy);
        frog.rotation.y = angle;
    }
}

/**
 * Update hop animation
 * Called every frame to animate the frog's jump
 * @param {number} currentTime - Current timestamp from performance.now()
 */
function updateHopAnimation(currentTime) {
    if (!isHopping) return;

    const elapsed = currentTime - hopStartTime;
    const progress = Math.min(elapsed / HOP_DURATION, 1.0);

    // Parabolic arc for vertical movement (creates nice arc)
    // Formula: y = -4 * t * (t - 1) gives parabola from 0 to 1 back to 0
    const arcProgress = -4 * progress * (progress - 1);
    const hopY = arcProgress * HOP_HEIGHT;

    // Linear interpolation for horizontal movement
    frog.position.x = hopStartPos.x + (hopEndPos.x - hopStartPos.x) * progress;
    frog.position.z = hopStartPos.z + (hopEndPos.z - hopStartPos.z) * progress;
    frog.position.y = hopEndPos.y + hopY;

    // Squash and stretch on landing
    if (progress > 0.8) {
        // Landing phase - squash
        const squashProgress = (progress - 0.8) / 0.2; // 0 to 1 in last 20%
        const squashScale = 1 - (1 - SQUASH_AMOUNT) * Math.sin(squashProgress * Math.PI);
        frog.scale.y = FROG_SCALE * squashScale;
        const widen = 1 + (1 - squashScale) * 0.3;
        frog.scale.x = FROG_SCALE * widen;
        frog.scale.z = FROG_SCALE * widen;
    } else {
        // Slight stretch during hop
        resetFrogScale();
    }

    // Animation complete
    if (progress >= 1.0) {
        frog.position.set(hopEndPos.x, hopEndPos.y, hopEndPos.z);
        resetFrogScale();
        isHopping = false;

        // Grant brief grace period invincibility after landing
        // Prevents unfair "landed on car" deaths
        isInvincible = true;
        invincibilityEndTime = currentTime + GRACE_PERIOD;

        // Cooldown before next move
        setTimeout(() => {
            canMove = true;

            // Process buffered input if any
            if (bufferedInput) {
                const { dx, dy } = bufferedInput;
                bufferedInput = null;
                updateGridPosition(dx, dy);
            }
        }, INPUT_COOLDOWN);
    }
}

/**
 * Setup keyboard input listeners
 * Listens for arrow keys and WASD
 * Triggers movement via updateGridPosition
 */
function setupInputListeners() {
    document.addEventListener('keydown', (event) => {
        // Prevent default scrolling behavior for arrow keys
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
            event.preventDefault();
        }

        let dx = 0;
        let dy = 0;
        let validInput = false;

        // Map keys to movement directions
        switch(event.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                dy = 1;  // Move forward (toward top of grid)
                validInput = true;
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                dy = -1;  // Move backward (toward bottom of grid)
                validInput = true;
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                dx = -1;  // Move left
                validInput = true;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                dx = 1;  // Move right
                validInput = true;
                break;
        }

        // Attempt movement or buffer input
        // Only process input if game state is playing
        if (validInput && gameState === 'playing') {
            if (canMove) {
                updateGridPosition(dx, dy);
            } else if (!bufferedInput) {
                // Buffer one input for responsiveness
                bufferedInput = { dx, dy };
                console.log('⏸️  Input buffered (frog is hopping)');
            }
        }
    });

    console.log('Keyboard input listeners initialized');
    console.log('Controls: Arrow Keys or WASD to move');
}

/**
 * Handle window resize
 * Updates camera and renderer to maintain proper aspect ratio
 */
function onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = CAMERA_FRUSTUM;

    camera.left = frustumSize * aspect / -2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;

    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation timing
let lastFrameTime = performance.now();

/**
 * Animation loop
 * Uses requestAnimationFrame for smooth 60fps rendering
 * Updates hop animation, lanes, collision, death/respawn, and renders scene
 */
function animate() {
    requestAnimationFrame(animate);

    // Get current time and calculate delta
    const currentTime = performance.now();
    const deltaTime = (currentTime - lastFrameTime) / 1000; // Convert to seconds
    lastFrameTime = currentTime;

    // Update hop animation if active
    updateHopAnimation(currentTime);

    // Update all lanes and their obstacles when game is active
    if (isGameActive) {
        for (const lane of lanes) {
            lane.update(deltaTime, currentTime);
        }
    }

    // Update invincibility state (grace period and post-respawn)
    updateInvincibility(currentTime);

    // Update death animation if dying
    updateDeathAnimation(currentTime);

    if (isGameActive) {
        // Update timer HUD
        updateTimerDisplay((currentTime - levelStartTime) / 1000);

        // Update coin spawns/animation
        updateCoins(currentTime);
    }

    // Check for collisions against moving vehicles
    if (gameState === 'playing') {
        if (checkCollision()) {
            death();
        }
    }

    // Check if objective reached
    if (gameState === 'playing' && !isHopping) {
        checkObjectiveReached();
    }

    // Render the scene
    renderer.render(scene, camera);
}

// ============================================
// START THE GAME
// ============================================
init();
updateLivesDisplay(); // Initialize lives display
updateScoreDisplay();
updateLevelDisplay();
updateTimerDisplay(0);
animate();

console.log('');
console.log('🐸 Frogger 3D - Lives System Active!');
console.log('Stage 2.4 Complete: Lives system with game over mechanics');
console.log('');
console.log('Road Layout:');
console.log('  Row 11: ➡️  NAVY cars (2.8 u/s RIGHT) - long-haul sprint');
console.log('  Row 10: ⬅️  SILVER cars (1.4 u/s LEFT)');
console.log('  Row 9: ➡️  MAGENTA cars (2.4 u/s RIGHT)');
console.log('  Row 8: ⬅️  WHITE cars (1.3 u/s LEFT) - patience lane');
console.log('  Row 7: ➡️  LIME cars (3.0 u/s RIGHT) - hyper speed');
console.log('  Row 6: ⬅️  TEAL cars (1.6 u/s LEFT)');
console.log('  Row 5: ➡️  ORANGE cars (2.2 u/s RIGHT)');
console.log('  Row 4: ⬅️  PURPLE cars (1.8 u/s LEFT)');
console.log('  Row 3: ➡️  YELLOW cars (2.5 u/s RIGHT) - FAST!');
console.log('  Row 2: ⬅️  BLUE cars (2.0 u/s LEFT)');
console.log('  Row 1: ➡️  RED cars (1.5 u/s RIGHT)');
console.log('  Row 0: 🌿 Safe starting zone');
console.log('');
console.log('Features:');
console.log('  ❤️  Lives System: Start with 3 lives');
console.log('  💀 Lose 1 life per death');
console.log('  🎮 Game Over at 0 lives (auto-restart after 3s)');
console.log('  🚗 11 distinct road lanes with bidirectional traffic');
console.log('  💥 Collision detection on all lanes');
console.log('  ☠️  Death & respawn system');
console.log('');
console.log('Controls:');
console.log('  ⬆️  Arrow Up / W - Move forward');
console.log('  ⬇️  Arrow Down / S - Move backward');
console.log('  ⬅️  Arrow Left / A - Move left');
console.log('  ➡️  Arrow Right / D - Move right');
console.log('');
console.log('Challenge: Conquer all 11 lanes! 💪');
console.log('Tip: You have 3 lives - use them wisely!');
console.log('Lives are displayed in the top-left corner');
console.log('');

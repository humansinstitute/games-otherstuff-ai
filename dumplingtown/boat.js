// ============================================
// BOAT SYSTEM
// Handles boat rides between village and school island
// ============================================

// Note: Using string literals to avoid circular import with game.js
const GAME_STATE_BOAT_RIDE = 'boat_ride';
const GAME_STATE_PLAYING = 'playing';

// Boat ride duration in seconds
export const BOAT_RIDE_DURATION = 60;

// Boat ride phases
export const BoatPhase = {
    BOARDING: 'boarding',
    SAILING: 'sailing',
    ARRIVING: 'arriving'
};

// Boat destinations
export const BoatDestination = {
    VILLAGE: 'village',
    SCHOOL_ISLAND: 'school_island'
};

// Boat interior layout - walkable area
export const BoatInterior = {
    // Room dimensions (in screen pixels)
    width: 400,
    height: 280,

    // Walkable bounds (relative to room top-left)
    bounds: {
        minX: 60,
        maxX: 340,
        minY: 100,
        maxY: 230
    },

    // Bench positions for passengers
    passengerPositions: [
        { x: 100, y: 140 },
        { x: 160, y: 160 },
        { x: 240, y: 140 },
        { x: 300, y: 160 },
        { x: 130, y: 200 },
        { x: 270, y: 200 }
    ]
};

// Create initial boat ride state
export function createBoatRideState() {
    return {
        active: false,
        phase: BoatPhase.BOARDING,
        timer: 0,
        duration: BOAT_RIDE_DURATION,
        destination: null,
        passengers: [], // Kid NPCs on the boat
        waterOffset: 0  // For water animation
    };
}

// Start a boat ride
export function startBoatRide(game, destination) {
    game.boatRide = {
        active: true,
        phase: BoatPhase.BOARDING,
        timer: 0,
        duration: BOAT_RIDE_DURATION,
        destination: destination,
        passengers: [...game.kidNpcs], // All kids board the boat
        waterOffset: 0
    };

    // Position player in boat interior
    const interior = BoatInterior;
    const centerX = (interior.bounds.minX + interior.bounds.maxX) / 2;
    const centerY = interior.bounds.maxY - 30;

    game.boatPlayerPos = { x: centerX, y: centerY };

    // Position kid passengers
    positionPassengers(game.boatRide);

    // Set game state
    game.state = GAME_STATE_BOAT_RIDE;
}

// Position passengers on boat benches
function positionPassengers(boatRide) {
    const positions = BoatInterior.passengerPositions;
    boatRide.passengers.forEach((passenger, i) => {
        if (positions[i]) {
            passenger.boatX = positions[i].x;
            passenger.boatY = positions[i].y;
        }
    });
}

// Update boat ride state
export function updateBoatRide(game, deltaTime) {
    const boat = game.boatRide;
    if (!boat.active) return;

    boat.timer += deltaTime;

    // Animate water
    boat.waterOffset += deltaTime * 30;
    if (boat.waterOffset > 40) boat.waterOffset = 0;

    // Phase transitions
    if (boat.phase === BoatPhase.BOARDING && boat.timer > 2) {
        boat.phase = BoatPhase.SAILING;
    } else if (boat.phase === BoatPhase.SAILING && boat.timer >= boat.duration - 3) {
        boat.phase = BoatPhase.ARRIVING;
    } else if (boat.timer >= boat.duration) {
        // Arrive at destination
        arriveAtDestination(game);
    }

    // Allow player to move in boat interior
    updateBoatPlayerMovement(game, deltaTime);
}

// Handle player movement in boat
function updateBoatPlayerMovement(game, deltaTime) {
    let dx = 0, dy = 0;
    if (game.keys.up) dy = -1;
    if (game.keys.down) dy = 1;
    if (game.keys.left) dx = -1;
    if (game.keys.right) dx = 1;

    // Normalize diagonal
    if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
    }

    const speed = 2.0;
    const newX = game.boatPlayerPos.x + dx * speed * deltaTime * 60;
    const newY = game.boatPlayerPos.y + dy * speed * deltaTime * 60;

    // Clamp to boat bounds
    const bounds = BoatInterior.bounds;
    game.boatPlayerPos.x = Math.max(bounds.minX, Math.min(bounds.maxX, newX));
    game.boatPlayerPos.y = Math.max(bounds.minY, Math.min(bounds.maxY, newY));

    // Update player animation
    if (game.player) {
        game.player.update(deltaTime, dx, dy);
    }
}

// Arrive at destination
function arriveAtDestination(game) {
    const boat = game.boatRide;
    boat.active = false;

    if (boat.destination === BoatDestination.SCHOOL_ISLAND) {
        // Switch to school island map
        game.currentMap = 'school_island';
        // Spawn at school dock
        if (game.schoolWorld) {
            game.world = game.schoolWorld;
            const dock = game.schoolWorld.getDockSpawn?.() ||
                { x: game.schoolWorld.width / 2, y: game.schoolWorld.height - 100 };
            game.player.x = dock.x;
            game.player.y = dock.y;
        }
    } else {
        // Return to village
        game.currentMap = 'village';
        game.world = game.villageWorld || game.world;
        // Spawn at village dock
        const dock = game.villageDock || { x: 880, y: 380 };
        game.player.x = dock.x - 40;
        game.player.y = dock.y;
    }

    // Return to playing state
    game.state = GAME_STATE_PLAYING;

    // Update camera immediately
    if (game.updateCamera) game.updateCamera();
}

// Get remaining time display
export function getBoatTimeRemaining(boatRide) {
    const remaining = Math.max(0, boatRide.duration - boatRide.timer);
    const minutes = Math.floor(remaining / 60);
    const seconds = Math.floor(remaining % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Get progress (0-1)
export function getBoatProgress(boatRide) {
    return Math.min(1, boatRide.timer / boatRide.duration);
}

// Check if player is near a passenger for dialogue
export function getNearbyPassenger(game) {
    if (!game.boatRide?.active) return null;

    const playerX = game.boatPlayerPos.x;
    const playerY = game.boatPlayerPos.y;

    for (const passenger of game.boatRide.passengers) {
        const dx = playerX - passenger.boatX;
        const dy = playerY - passenger.boatY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 40) {
            return passenger;
        }
    }

    return null;
}

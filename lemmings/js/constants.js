// Physics constants
export const WALK_SPEED = 0.5;
export const GRAVITY = 0.4;
export const TERMINAL_VELOCITY = 8;
export const MAX_SAFE_FALL = 160;
export const DIG_SPEED = 0.33; // pixels per frame downward while digging (~10% faster)
export const CLIMB_SPEED = 1; // pixels per frame upward while climbing

// Game configuration
export const MAX_LEMMINGS = 20;
export const SPAWN_INTERVAL = 2.0; // seconds

// Lemming states
export const STATES = {
    WALKING: 'walking',
    FALLING: 'falling',
    BLOCKING: 'blocking',
    DIGGING: 'digging',
    BUILDING: 'building',
    CLIMBING: 'climbing',
    BASHING: 'bashing',
    BOMBER: 'bomber',
    EXPLODING: 'exploding',
    DEAD: 'dead',
    SAVED: 'saved'
};

// Visual constants
export const LEMMING_WIDTH = 10;
export const LEMMING_HEIGHT = 20;
export const LEMMING_BODY_HEIGHT = 14;
export const LEMMING_HEAD_RADIUS = 3;

// Colors
export const COLORS = {
    LEMMING_NORMAL: '#22d3ee',
    LEMMING_NORMAL_OUTLINE: '#0e7490',
    LEMMING_BLOCKER: '#fb923c',
    LEMMING_BLOCKER_OUTLINE: '#c2410c',
    LEMMING_DIGGER: '#d97706',
    LEMMING_DIGGER_OUTLINE: '#92400e',
    LEMMING_BUILDER: '#eab308',
    LEMMING_BUILDER_OUTLINE: '#a16207',
    LEMMING_CLIMBER: '#a855f7',
    LEMMING_CLIMBER_OUTLINE: '#7e22ce',
    LEMMING_BASHER: '#ef4444',
    LEMMING_BASHER_OUTLINE: '#b91c1c',
    TERRAIN_BASE_R: 139,
    TERRAIN_BASE_G: 69,
    TERRAIN_BASE_B: 19,
    STEEL_RAMP_R: 160,
    STEEL_RAMP_G: 170,
    STEEL_RAMP_B: 180
};

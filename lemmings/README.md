# Lemmings Game - Modular Structure

A browser-based Lemmings game built with vanilla JavaScript ES6 modules.

## Project Structure

```
/Lemmings
├── index.html              # Main HTML file (minimal - just canvas)
├── index-old.html          # Original single-file version (backup)
├── css/
│   └── style.css          # All styling and CSS variables
└── js/
    ├── game.js            # Main game loop, state, initialization
    ├── Lemming.js         # Lemming class (physics, rendering, states)
    ├── TerrainManager.js  # Terrain system (collision, rendering)
    ├── ParticleSystem.js  # Entrance portal with particle effects
    ├── UIManager.js       # UI rendering (counters, skills)
    ├── constants.js       # Game constants (speeds, gravity, colors)
    └── levels.js          # Level data (terrain layout, entrance/exit)
```

## Modules Overview

### constants.js
Exports all game constants:
- Physics: `WALK_SPEED`, `GRAVITY`, `TERMINAL_VELOCITY`, `MAX_SAFE_FALL`
- Config: `MAX_LEMMINGS`, `SPAWN_INTERVAL`
- States: `STATES` object
- Colors: `COLORS` object

### Lemming.js
Default export of the `Lemming` class:
- Constructor: `new Lemming(x, y)`
- Methods: `update(dt, terrain, allLemmings)`, `render(ctx, isHovered)`
- Handles: walking, falling, collision, death animation, blocker behavior

### TerrainManager.js
Default export of the `TerrainManager` class:
- Constructor: `new TerrainManager(width, height)`
- Methods: `initializeFromLevel(levelData)`, `isSolid(x, y)`, `render(ctx)`
- Handles: destructible terrain, collision detection, pixel-perfect rendering

### ParticleSystem.js
Default export of the `ParticleSystem` class (entrance portal):
- Constructor: `new ParticleSystem(x, y)`
- Methods: `update(dt)`, `render(ctx)`
- Handles: swirling particle effects, portal animation

### UIManager.js
Default export of the `UIManager` class:
- Constructor: `new UIManager(canvas)`
- Methods: `render(ctx, gameState)`
- Handles: lemming counters, skill buttons, FPS display

### levels.js
Exports level data:
- `LEVEL_1` (default export): entrance position, terrain rectangles
- Can be extended with more levels

### game.js
Main entry point (loaded as module in index.html):
- Initializes canvas, terrain, entrance
- Game loop with `requestAnimationFrame`
- Mouse interaction handlers
- Lemming spawning and management

## Running the Game

1. Open `index.html` in a modern web browser
2. **Important**: Due to ES6 modules, you may need to serve via HTTP:
   ```bash
   # Option 1: Python
   python -m http.server 8000

   # Option 2: Node.js (if you have http-server)
   npx http-server
   ```
3. Navigate to `http://localhost:8000`

## Features

- ✅ Lemming spawning from entrance portal
- ✅ Walking and falling physics
- ✅ Terrain collision detection
- ✅ Fall damage system (80px safe fall distance)
- ✅ Blocker skill (5 available)
- ✅ Mouse hover and click interaction
- ✅ Pixel-perfect destructible terrain
- ✅ Death animations
- ✅ Debug FPS counter

## Browser Compatibility

Requires a browser that supports:
- ES6 Modules
- Canvas API
- `roundRect` method

Tested on: Chrome 90+, Firefox 88+, Safari 14+

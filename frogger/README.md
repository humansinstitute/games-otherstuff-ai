# Frogger's Crossing - Getting Started

## Running the Game

Due to browser security restrictions with ES6 modules, you need to run this project through a local web server (not by opening the HTML file directly).

### Option 1: Python HTTP Server (Recommended)
```bash
cd frogger3d
python3 -m http.server 8000
```

Then open your browser to: **http://localhost:8000**

### Option 2: Node.js HTTP Server
```bash
cd frogger3d
npx http-server -p 8000
```

### Option 3: VS Code Live Server Extension
If you use VS Code, install the "Live Server" extension and right-click `index.html` > "Open with Live Server"

## What You Should See

- A pale green start screen titled **Froggers Crossing** with instructions and a Start button
- After pressing **Start Crossing**:
  - Light green sky with a chunky diorama base and deep road surface
  - A 15×13 grid centered in the view
  - An updated voxel frog with layered shell, belly stripe, and expressive eyes at the bottom row
  - Eight HUD elements in the top-left (Score, Level, Timer, Lives)
  - Eleven road lanes with textured dashed dividers and multiple vehicle styles
  - Golden coins and a glowing target pad that alternates between the top/bottom edges

## Controls & Objective

- **Start Crossing button** – begins play from the title overlay
- **Arrow Keys** or **WASD** – hop exactly one cell per input
  - ⬆️ / W – Move toward the top lanes
  - ⬇️ / S – Retreat toward the starting pad
  - ⬅️ / A and ➡️ / D – Strafe between lanes
- **Goal:** reach the glowing pad on the opposite side. Each success spawns a new target on the other edge and bumps the level.
- **Coins:** occasional gold tokens appear on lanes for a short time; grab them while dodging cars for bonus points.

### Movement Features
- Grid-locked movement with parabolic hops (250 ms, 0.8 u arc)
- Input buffering (1 queued move) and 100 ms cooldown for snappy feel
- Squash & stretch landing animation plus facing rotation
- Landing invincibility window (grace period) to avoid unfair collisions

## Game Loop / Scoring

- **Score HUD** shows current points; reaching objectives grants a base 500 plus a time bonus (10 pts/sec saved).
- **Level HUD** increments after every successful crossing. Each new level increases car speed by 18% and tightens spawn timing.
- **Timer HUD** tracks how long the current run has been active for bonus calculations.
- **Coins** grant 200 points each if collected before expiring; they bob visually above their lane.
- **Lives:** three hearts; hitting a car costs one life and respawns the frog at the bottom with the target moved to the top.
- **Game Over screen** displays score, level reached, and objectives cleared with a Play Again button.

Check the console (F12) for debug logs such as lane initialization, collisions, coin pickups, and objective bonuses.

## Troubleshooting

If you see a black screen:
1. Make sure you're accessing via HTTP (localhost), not file://
2. Check the browser console for errors
3. Verify Three.js is loading from the CDN
4. Try a different browser (Chrome or Firefox recommended)

## Development Status

✅ **Stage 1.1**: Core rendering (scene, camera, grid, lighting)
✅ **Stage 1.2**: Voxel frog character and input detection
✅ **Stage 1.3**: Grid-based movement with hop animation
✅ **Stage 2**: Road obstacles, collisions, death/respawn, scoring loop, start/game-over overlays

### Completed Features:
- Isometric orthographic camera view
- 15×13 grid visualization
- Detailed voxel frog character with custom scaling
- Grid-locked movement system
- Parabolic hop animation (250ms, 0.8 unit arc)
- Boundary checking and validation
- Input cooldown (100ms) and buffering
- Squash & stretch landing animation
- Direction-based rotation
- Alternating objective pads with escalating difficulty
- Car pooling with multiple vehicle variants and textured roads
- Coin collectibles with lifetimes
- Score/level/timer HUD + game over summary screen

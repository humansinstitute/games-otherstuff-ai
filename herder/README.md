# Yuletide Herding
A tiny voxel herding prototype built with TypeScript, Three.js, and Vite. You control a sheepdog from an isometric camera, guiding wandering sheep into a floating pen before time expires.

## Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Launch the dev server with hot reload:
   ```bash
   npm run dev
   ```
   Open the printed local URL (usually http://localhost:5173).
3. Build for production:
   ```bash
   npm run build
   ```

## Controls & Objective
- Desktop: `WASD` / arrow keys move the dog.
- Touch devices: drag anywhere on the screen to steer; release to stop.
- Herd every sheep into the fenced pen before the timer hits zero.
- HUD shows remaining time and sheep collected; the music toggle lets you mute the ambience.

## Project Structure
- `src/main.ts` – Three.js bootstrap, renderer/camera setup, main loop.
- `src/Game.ts` – Central state machine (playing/won/lost), timer, input, restart logic.
- `src/entities/` – Dog, Sheep, Pen, and manager classes scoped to gameplay systems.
- `src/ui/` – Lightweight DOM overlays: HUD, help tips, win/lose screen.
- `src/config.ts` – Tunable level parameters (terrain size, timer length, pen position, etc.).

## Tuning & Extension Ideas
- Adjust terrain size, timer, dog/sheep behavior by editing `GAME_CONFIG` in `src/config.ts`.
- Idle animation amplitudes live near the top of `Dog.ts` and `Sheep.ts`.
- Lighting/shadow tweaks live in `src/lighting.ts`.

## Notes
This repo intentionally keeps rendering/dev dependencies thin (Three.js + Vite). No external asset pipeline is required; voxel meshes are built procedurally via primitive geometry.

# Lemmings Reborn - Implementation Plan for Claude Code

## Game Vision

### Core Concept
A modern web-based remake of the classic Lemmings puzzle game. Players must guide small creatures (lemmings) from an entrance to an exit by assigning them skills to overcome obstacles. The game maintains the original's addictive puzzle mechanics while featuring polished 2025 aesthetics.

### Visual Style
- **Aesthetic Direction**: Playful retro-futuristic with smooth gradients and particle effects
- **Color Palette**: Deep purples and dark blues with vibrant accent colors (green, orange, cyan, pink)
- **Typography**: Bold display font (Fredoka or Poppins) for UI, monospace (Space Mono) for numbers/stats
- **Feel**: Polished, responsive, satisfying feedback on every interaction

### Ideal State (MVP - Single Level)

**Gameplay Elements:**
- Lemmings spawn continuously from entrance door at timed intervals
- Walk forward, turn around when hitting walls/edges
- Fall with gravity, die if fall is too high (>80px)
- Can be assigned skills by clicking on them
- Exit door that lemmings walk into to be saved
- Terrain that can be modified (digged through, built upon)

**Skills System (4 skills):**
1. **Blocker** - Stands still, acts as wall, redirects other lemmings
2. **Digger** - Digs straight down through terrain
3. **Builder** - Builds diagonal stair-steps upward-forward
4. **Bomber** - 5-second countdown, explodes creating crater in terrain

**Level Design:**
- Entrance platform (top-left area)
- Exit door (bottom-right area)
- Terrain barriers requiring digging through
- Gaps requiring bridges to be built
- Drop that's survivable with proper routing

**UI Components:**
- Skill selector bar (shows available count for each skill)
- Stats display: Saved/Total lemmings, Time elapsed
- Release rate control (lemmings per second)
- Pause/Play button
- Win/Lose screen overlay

**Game States:**
- Playing (lemmings spawning and moving)
- Paused (everything frozen)
- Won (80%+ saved)
- Lost (not enough lemmings remaining to win)

**Polish Features:**
- Smooth animations for all lemming actions
- Particle effects for digging, explosions, lemming spawning
- Hover highlight when mousing over lemmings
- Skill preview indicator before assignment
- Sound effect triggers (can be muted stubs initially)
- Responsive canvas that maintains aspect ratio

## Technical Architecture

### Stack
- Pure HTML5, CSS3, JavaScript (ES6+)
- Canvas API for game rendering
- No frameworks needed for MVP
- Single HTML file for portability

### Core Systems
1. **Game Loop**: RequestAnimationFrame-based update/render cycle
2. **Entity Management**: Lemming objects with state machines
3. **Terrain System**: 2D bitmap/array for destructible terrain
4. **Collision Detection**: Pixel-perfect for terrain interaction
5. **Input Handling**: Mouse events for skill assignment and UI
6. **State Management**: Game state object with transitions

### Code Structure
```
- GameState (spawning, paused, won, lost)
- Lemming class (position, velocity, state, skill)
- TerrainManager (bitmap, modification methods)
- SkillManager (available counts, assignment logic)
- ParticleSystem (visual effects)
- UIManager (HUD, overlays)
- LevelData (entrance, exit, terrain layout)
```

---

## Development Phases

### PHASE 1: Foundation & Canvas Setup

#### Prompt 1.1: Create basic HTML structure and canvas
**Objective**: Set up the HTML file with canvas element and basic CSS styling
**Details**:
- Create HTML5 boilerplate
- Add canvas element (1200x700px recommended)
- Import Google Fonts: Fredoka (400,600,700) and Space Mono (400,700)
- Set up CSS with color variables and full-screen centered canvas
- Add gradient background (dark purple to deep blue)
- Style canvas with subtle shadow and border

#### Prompt 1.2: Initialize game loop and rendering context
**Objective**: Create the core game loop using requestAnimationFrame
**Details**:
- Set up 2D canvas context
- Create game loop with update() and render() functions
- Implement delta time calculation for frame-rate independence
- Add FPS counter (debug, top-left corner)
- Clear canvas each frame with background color
- Test with simple shape that moves across screen

---

### PHASE 2: Lemming Entity System

#### Prompt 2.1: Create Lemming class with basic properties
**Objective**: Define the Lemming entity with position, velocity, and state
**Details**:
- Create Lemming class with constructor
- Properties: x, y, vx, vy, state (walking, falling, etc.), direction (1 or -1)
- Add constants: WALK_SPEED = 0.5, GRAVITY = 0.4, TERMINAL_VELOCITY = 8
- State machine states: 'walking', 'falling', 'blocking', 'digging', 'building', 'bomber', 'dead', 'saved'
- Add basic update method that applies gravity and horizontal movement

#### Prompt 2.2: Render lemmings as simple sprites
**Objective**: Draw lemmings on canvas with basic shapes and animation
**Details**:
- Draw lemming as rounded rectangle body (10px wide, 14px tall)
- Add circular head (6px diameter) on top
- Color: bright cyan (#22d3ee) with darker outline
- Add two small white circles for eyes
- Implement simple walking animation (slight bob every 10 frames)
- Direction indicates facing: flip sprite horizontally based on direction value

#### Prompt 2.3: Spawn lemmings from entrance
**Objective**: Create entrance door and spawn lemmings at intervals
**Details**:
- Define entrance position (x: 100, y: 100)
- Draw entrance as decorated doorway/portal with particles
- Spawn timer: create new lemming every 2 seconds (adjustable release rate)
- Maximum lemmings: 20 for the level
- Lemmings spawn at entrance position with initial 'falling' state
- Add counter display: "Out: X / 20"

---

### PHASE 3: Terrain System

#### Prompt 3.1: Create terrain bitmap and rendering
**Objective**: Implement destructible terrain using 2D array
**Details**:
- Create terrain as 2D boolean array (canvas width x height)
- Initialize with level design: platforms, barriers, ground
- Render terrain: iterate array, draw brown/earth colored pixels where true
- Add texture variation: slightly randomize pixel colors for organic look
- Level layout: entrance platform (top-left), exit platform (bottom-right), middle barriers

#### Prompt 3.2: Implement terrain collision detection
**Objective**: Make lemmings interact with terrain (stand, walk, turn)
**Details**:
- Check if lemming's feet (bottom pixels) touch terrain
- If no ground below, set state to 'falling'
- If ground exists while walking, stay in 'walking' state
- Check for walls: if terrain ahead, reverse direction
- Check for ledges: if steep drop ahead (no ground within 5px), continue walking off
- Track fall distance to implement fall damage later

#### Prompt 3.3: Implement fall damage system
**Objective**: Lemmings die if they fall too far
**Details**:
- Track fall distance: increment counter while in 'falling' state
- Reset counter when landing on terrain
- MAX_SAFE_FALL = 80 pixels
- If fall distance exceeds max when landing, set state to 'dead'
- Dead state: show splat animation (expanding red circle, fade out)
- Remove dead lemmings from active array after animation

---

### PHASE 4: Skills System - Blocker

#### Prompt 4.1: Implement Blocker skill assignment
**Objective**: Allow clicking lemmings to assign Blocker skill
**Details**:
- Add mouse click handler on canvas
- Detect if click position intersects with any lemming
- Highlight lemming on hover (glow effect)
- When clicked while Blocker skill is selected, change lemming state to 'blocking'
- Decrement blocker count in skill inventory
- Blocker lemmings stop moving and hold arms out

#### Prompt 4.2: Blockers redirect other lemmings
**Objective**: Walking lemmings turn around when hitting blockers
**Details**:
- Blockers act as solid obstacles for other lemmings
- Check collision between walking lemmings and blocking lemmings
- When walking lemming touches blocker, reverse walking direction
- Blocker visual: different color (orange), stationary, arms extended pose
- Blockers remain until level ends (can't be un-blocked in MVP)

---

### PHASE 5: Skills System - Digger

#### Prompt 5.1: Implement Digger skill basics
**Objective**: Lemmings in 'digging' state remove terrain below them
**Details**:
- When Digger assigned, lemming state changes to 'digging'
- Digger removes terrain pixels directly below (3px wide, 2px deep per frame)
- Digger moves downward slowly as it digs
- Visual: different animation (digging motion), particle effects
- Digger continues until: hits empty space, reaches bottom, or hits indestructible terrain

#### Prompt 5.2: Add particle effects for digging
**Objective**: Create satisfying visual feedback when digging
**Details**:
- Spawn small brown/tan particle objects when terrain is removed
- Particles have initial velocity (spread outward/upward slightly)
- Particles affected by gravity, fade out over 30 frames
- Create ParticleSystem class to manage all particles
- Render particles as small circles or squares

---

### PHASE 6: Skills System - Builder

#### Prompt 6.1: Implement Builder skill mechanics
**Objective**: Lemmings in 'building' state create diagonal stairs
**Details**:
- When Builder assigned, lemming state changes to 'building'
- Builder places terrain pixels in stair pattern (going up-forward)
- Each step: 6px wide, 4px tall, placed every 8 frames
- Builder builds 12 steps total, then reverts to walking
- Visual: different color, hammering animation
- Stairs integrate with terrain system (become solid ground)

#### Prompt 6.2: Builder step placement and limits
**Objective**: Handle edge cases and constraints for building
**Details**:
- Builder stops early if hits ceiling (terrain above)
- Builder stops if runs out of steps (max 12)
- After finishing or stopping, builder returns to 'walking' state
- Built terrain is permanent (can be walked on or dug through)
- Add particle effects when placing each step (small puffs)

---

### PHASE 7: Skills System - Bomber

#### Prompt 7.1: Implement Bomber countdown
**Objective**: Bombers explode after 5 seconds, creating crater
**Details**:
- When Bomber assigned, start 5-second countdown timer
- Visual indicator: number above lemming's head counting down (5...4...3...2...1)
- Lemming continues walking during countdown
- Can be assigned bomber while doing other actions
- On reaching 0, trigger explosion

#### Prompt 7.2: Bomber explosion and terrain destruction
**Objective**: Create explosion effect that removes terrain
**Details**:
- Explosion removes circular area of terrain (radius 25px)
- Explosion kills the bomber lemming
- Explosion does NOT kill other lemmings (for MVP simplicity)
- Visual: expanding orange/red circle animation
- Spawn lots of particles radiating outward
- Screen shake effect (subtle camera movement)

---

### PHASE 8: Exit System

#### Prompt 8.1: Create exit door and detection
**Objective**: Lemmings that reach exit are "saved"
**Details**:
- Place exit door at position (x: 1050, y: 600)
- Draw exit as distinct doorway/portal (green glow)
- Check collision: if walking lemming enters exit area, mark as 'saved'
- Remove saved lemmings from active array
- Increment saved counter
- Brief particle effect/flash when lemming enters

---

### PHASE 9: UI System

#### Prompt 9.1: Create skill selection bar
**Objective**: Display available skills with counts and selection
**Details**:
- Create horizontal bar at bottom of screen
- Four skill buttons: Blocker, Digger, Builder, Bomber
- Each button shows: icon, name, available count
- Selected skill has highlighted border/glow
- Starting counts: Blocker(3), Digger(5), Builder(10), Bomber(2)
- Click to select skill, click again to deselect

#### Prompt 9.2: Add stats display and controls
**Objective**: Show game information and control buttons
**Details**:
- Top bar with stats: "Saved: X/20", "Target: 16/20 (80%)", "Time: MM:SS"
- Release rate control: slider to adjust spawn rate
- Pause/Play button (spacebar also toggles)
- When paused, show "PAUSED" overlay
- Style UI elements with semi-transparent backgrounds and rounded corners

---

### PHASE 10: Win/Lose Conditions

#### Prompt 10.1: Implement win detection
**Objective**: Detect when player has won the level
**Details**:
- Calculate: saved count / total spawned
- Win threshold: 80% (16 out of 20)
- Check after all lemmings have been spawned and processed
- When won, change game state to 'won'
- Show victory overlay: "Level Complete!", saved percentage, time taken
- Add "Restart" button on overlay

#### Prompt 10.2: Implement lose detection
**Objective**: Detect when winning is no longer possible
**Details**:
- Track: lemmings remaining (not yet saved or dead)
- Calculate: saved + remaining lemmings
- If saved + remaining < target (16), change state to 'lost'
- Show failure overlay: "Level Failed", saved count, percentage
- Add "Restart" button
- Grey out skill buttons when lost

---

### PHASE 11: Level Design

#### Prompt 11.1: Create complete level layout
**Objective**: Design a level that requires using all skills
**Details**:
- Entrance platform at (80-150, 80-120)
- Initial drop (safe fall distance)
- Barrier requiring digging through (vertical wall)
- Gap requiring bridge (20-30px wide)
- Lower section requiring direction reversal (blocker)
- Path leading to exit at (1000-1100, 580-620)
- Add some decorative terrain elements

---

### PHASE 12: Polish & Particles

#### Prompt 12.1: Enhanced particle system
**Objective**: Add juice to all major actions
**Details**:
- Spawn entry: sparkles/stars appearing
- Walking: tiny dust puffs every few steps
- Falling: trailing particles
- Death: splat with particle burst
- Exit: green sparkles and trail effect
- Vary particle colors based on context

#### Prompt 12.2: Animation polish
**Objective**: Smooth out all animations and transitions
**Details**:
- Lemming walking: more pronounced bob and arm swing
- Direction changes: brief turn animation
- Skill assignments: flash/glow effect on lemming
- Button presses: scale animation on UI elements
- Hover states: smooth color transitions
- Add easing functions for natural movement

#### Prompt 12.3: Final visual touches
**Objective**: Add atmospheric effects and finishing details
**Details**:
- Background: animated gradient or subtle particles
- Terrain: add highlight/shadow edges for depth
- Canvas: add subtle vignette effect
- Entrance/Exit: animated glows/pulses
- Cursor: custom cursor that changes based on selected skill
- Add subtle screen shake for explosions

---

### PHASE 13: Testing & Refinement

#### Prompt 13.1: Gameplay balancing
**Objective**: Ensure level is solvable and fun
**Details**:
- Test multiple solution paths
- Adjust skill counts if too easy/hard
- Verify win condition is achievable
- Check edge cases (all bombers, all blockers, etc.)
- Ensure timing feels right (spawn rate, skill execution speed)

#### Prompt 13.2: Bug fixes and edge cases
**Objective**: Handle unusual scenarios gracefully
**Details**:
- Lemmings spawning inside terrain
- Multiple lemmings overlapping
- Skills assigned to dead/saved lemmings
- Clicking outside canvas area
- Very fast mouse clicks
- Pause/unpause during animations

---

## Success Criteria

The implementation is complete when:
1. ✓ Lemmings spawn continuously and walk/fall realistically
2. ✓ All 4 skills work correctly and modify terrain/behavior
3. ✓ Level can be completed using strategic skill assignment
4. ✓ Win condition (80% saved) triggers victory screen
5. ✓ UI is polished with smooth animations and clear feedback
6. ✓ Particle effects add satisfying visual juice
7. ✓ Game can be restarted without page refresh
8. ✓ No major bugs or edge cases cause crashes

## Extension Ideas (Post-MVP)

If time permits or for future iterations:
- Multiple levels with different challenges
- Additional skills (Climber, Floater)
- Speed control (fast forward)
- Rewind feature (last 5 seconds)
- Level editor
- Sound effects and music
- Achievements/challenges
- Difficulty modes

---

## Prompt Usage Guidelines

1. **Feed prompts sequentially**: Start with 1.1, then 1.2, etc.
2. **Verify before moving on**: Test that each feature works before proceeding
3. **Accumulate code**: Each prompt builds on previous work
4. **Request specific files**: Always work in the same HTML file
5. **Test frequently**: Run in browser after every 2-3 prompts
6. **Debug in isolation**: If something breaks, fix it before adding more features
7. **Save progress**: Keep working versions as you go

Each prompt is designed to be self-contained with a clear, achievable objective. Claude Code should be able to complete each one without being overwhelmed by scope.

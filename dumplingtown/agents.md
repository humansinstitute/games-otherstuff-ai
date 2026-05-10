# Dumpling Town

A cute Japanese-themed life simulation game built with vanilla JavaScript and HTML5 Canvas.

## Development Guidelines

### Commit Practices
- Always commit changes as you go to create well-described rollback points
- Never push to remote - the user controls when to push
- Write clear, descriptive commit messages without self-attribution

### Code Quality
- Always reflect on and check your work before considering a task complete
- Test changes mentally or by tracing logic to catch issues early

### File Size & Structure
- Keep files under 500-850 lines of code
- Create utilities and helper functions for common/repeated code
- Extract shared logic into separate modules when files grow large

### Code Organization
- Maintain best practice code structure for easy readability
- Group related functions together
- Use clear, descriptive naming for functions and variables
- Add comments for complex logic, but prefer self-documenting code

### DRY Principles
- Don't write the same interface or function multiple times
- Create common reusable components for repeated patterns
- If you find yourself copying code, extract it into a shared utility

## Running the Game

Open `index.html` in a browser, or use a local server:
```bash
python -m http.server 8080
# or
npx serve .
```

### Running the Server (optional)
```bash
cd server
bun install
bun run db:push    # Create/update SQLite tables
bun run dev        # Start with hot reload on port 3001
```

## Architecture

### Client
| File | Purpose |
|------|---------|
| `game.js` | Main game controller, state machine, input handling, quest system |
| `renderer.js` | Canvas 2D rendering, draws dumplings/buildings/UI |
| `entities.js` | Entity classes (Player, NPC, House, Decoration) |
| `world.js` | Town layout, tile map, house definitions, collision detection |
| `nostr.js` | Nostr authentication (NIP-07 extension or ephemeral keypairs) |
| `api.js` | Server API client with NIP-98 auth, dual-write save pattern |
| `index.html` | Entry point, fullscreen canvas, CSS styling |

### Server (`server/`)
| File | Purpose |
|------|---------|
| `src/index.ts` | Bun.serve() entry, routing, CORS |
| `src/db/schema.ts` | Drizzle ORM table definitions (5 tables) |
| `src/db/connection.ts` | bun:sqlite + WAL mode + Drizzle instance |
| `src/auth/nip98.ts` | NIP-98 event verification middleware |
| `src/lib/write-queue.ts` | Serial async write queue for SQLite safety |
| `src/routes/*.ts` | REST endpoints (player, save, inventory, decorations, quests, coins, time) |

### Save Pattern
- localStorage is primary (instant, works offline)
- Server is async backup (fire-and-forget on save, timestamp comparison on load)
- Game works fully offline if server is unreachable

## Game States

The game uses a state machine (`GameState` enum in game.js):

- `START` - Title screen with Nostr login
- `CHARACTER_SELECT` - Choose dumpling filling type
- `PLAYING` - Main overworld exploration
- `DIALOGUE` - NPC conversation with branching choices
- `INSIDE_BUILDING` - Interior exploration (homes, shops)
- `SHOPPING` - Shop UI for purchasing items
- `INVENTORY` - View/equip owned items
- `SLEEPING` - Sleep transition animation

## Key Systems

### Dialogue Trees
NPCs have branching dialogue defined in `world.js`. Each node has:
- `text` - What the NPC says
- `choices` - Array of player responses with `next` pointing to next node
- `questCheck` - Optional quest state to check
- `questProgress` - Advances quest state when reached
- `reward` - Optional coin reward

### Quest System
Tracked in `game.activeQuests` object. Example quest flow:
```
ebiDelivery: 'none' -> 'active' -> 'delivered' -> 'complete'
```

### Equipment Slots
Players can equip items to three slots:
- `hat` - Worn on head
- `accessory` - Side decoration
- `held` - Carried item

### NPC Behavior
NPCs have wandering behavior with:
- `wanderArea` - Bounds they patrol within
- `homeHouse` - House they may be inside
- `isIndoors` - Toggle between indoor/outdoor state

### Player Home
The player's home supports:
- Free movement inside
- Bed for sleeping (restores energy, time passes)
- Decoration placement (P to place, X to pick up)

## Controls

| Key | Action |
|-----|--------|
| WASD/Arrows | Move |
| E/Space | Interact/Confirm |
| Escape | Back/Cancel |
| I | Open inventory |
| P | Place decoration (in home) |
| X | Pick up decoration (in home) |
| 1-4 | Select dialogue choices |

## Rendering

Uses 2x pixel art scaling on canvas. Camera follows player with smooth scrolling in overworld. Buildings cast shadows and have kawaii-style designs matching owner's filling type.

## Nostr Integration

- Uses NIP-07 browser extension if available
- Falls back to ephemeral keypair generation
- Player npub displayed on character select screen
- NIP-98 (kind 27235) used for server API authentication

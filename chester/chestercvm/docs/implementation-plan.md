# Chester CVM Implementation Plan

## Overview

This document outlines the implementation plan for Chester, a Nostr-native chess platform built as a Context VM (CVM) server. The server exposes an MCP API over Nostr relays and assumes hex pubkeys end-to-end (clients may render npubs, but that is out of scope here).

**Reference Spec:** [chester-spec.md](./chester-spec.md)

**Reference Implementation:** `/Users/mini/code/cvm-alytics/server.ts`

---

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Runtime | Bun | Fast, native SQLite support |
| Database | SQLite (bun:sqlite) | Simple, embedded, sufficient for single-server |
| Chess Logic | chess.js | Battle-tested, handles FEN/SAN/UCI |
| Ratings | glicko2 package | Avoid custom implementation bugs |
| MCP SDK | @modelcontextprotocol/sdk | Standard MCP server |
| Nostr Transport | @contextvm/sdk | ApplesauceRelayPool + NostrServerTransport |
| ID Format | Hex pubkeys only | CVM SDK returns hex; no boundary conversion required |

---

## Work Packages

### WP1: Project Setup & Database Schema

**Objective:** Initialize project structure, dependencies, and SQLite database with all tables.

#### Checklist

- [ ] 1.1 Initialize Bun project with TypeScript
  - [ ] Create package.json with dependencies:
    - @modelcontextprotocol/sdk
    - @contextvm/sdk
    - chess.js
    - glicko2
    - zod
  - [ ] Configure tsconfig.json
  - [ ] Create .env.example with SERVER_PRIVATE_KEY, RELAYS

- [ ] 1.2 Create database initialization module (`src/db.ts`)
  - [ ] SQLite connection setup with bun:sqlite
  - [ ] `initializeDatabase()` function with CREATE TABLE IF NOT EXISTS

- [ ] 1.3 Create players table
  ```sql
  CREATE TABLE players (
    pubkey TEXT PRIMARY KEY,           -- hex format
    display_name TEXT,
    is_ai INTEGER DEFAULT 0,
    ai_personality TEXT,               -- JSON
    rating REAL DEFAULT 1500,
    rating_deviation REAL DEFAULT 350,
    rating_volatility REAL DEFAULT 0.06,
    games_played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    last_seen_at TEXT DEFAULT (datetime('now'))
  );
  ```

- [ ] 1.4 Create games table
  ```sql
  CREATE TABLE games (
    id TEXT PRIMARY KEY,               -- UUID
    type TEXT NOT NULL,                -- public, private, ai
    status TEXT DEFAULT 'open',        -- open, active, completed, abandoned, cancelled
    host_pubkey TEXT NOT NULL,
    host_color_preference TEXT DEFAULT 'random',
    white_pubkey TEXT,
    black_pubkey TEXT,
    current_fen TEXT DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    result TEXT,                       -- white, black, draw, NULL
    termination_type TEXT,
    opening_eco TEXT,
    draw_offer_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    started_at TEXT,
    ended_at TEXT,
    last_move_at TEXT,
    FOREIGN KEY (host_pubkey) REFERENCES players(pubkey),
    FOREIGN KEY (white_pubkey) REFERENCES players(pubkey),
    FOREIGN KEY (black_pubkey) REFERENCES players(pubkey)
  );
  ```

- [ ] 1.5 Create game_requests table
  ```sql
  CREATE TABLE game_requests (
    id TEXT PRIMARY KEY,               -- UUID
    game_id TEXT NOT NULL,
    requester_pubkey TEXT NOT NULL,
    status TEXT DEFAULT 'pending',     -- pending, accepted, declined, withdrawn
    created_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT,
    FOREIGN KEY (game_id) REFERENCES games(id),
    FOREIGN KEY (requester_pubkey) REFERENCES players(pubkey)
  );

  CREATE UNIQUE INDEX idx_requests_pending_unique
    ON game_requests(game_id, requester_pubkey)
    WHERE status = 'pending';
  ```

- [ ] 1.6 Create moves table
  ```sql
  CREATE TABLE moves (
    id TEXT PRIMARY KEY,               -- UUID
    game_id TEXT NOT NULL,
    move_number INTEGER NOT NULL,
    ply_number INTEGER NOT NULL,       -- 1,2,3...
    color TEXT NOT NULL,               -- white | black
    player_pubkey TEXT NOT NULL,
    san TEXT NOT NULL,
    uci TEXT NOT NULL,
    fen_after TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (game_id) REFERENCES games(id),
    FOREIGN KEY (player_pubkey) REFERENCES players(pubkey)
  );
  ```

- [ ] 1.7 Create indexes for common queries
  ```sql
  CREATE INDEX idx_games_status ON games(status);
  CREATE INDEX idx_games_white ON games(white_pubkey);
  CREATE INDEX idx_games_black ON games(black_pubkey);
  CREATE INDEX idx_moves_game ON moves(game_id);
  CREATE INDEX idx_requests_game ON game_requests(game_id);
  CREATE INDEX idx_requests_status ON game_requests(status);
  ```

- [ ] 1.8 Create server entry point (`server.ts`)
  - [ ] Private key management (generate/persist like reference)
  - [ ] Initialize database
  - [ ] Create McpServer instance
  - [ ] Create NostrServerTransport
  - [ ] Connect and log server pubkey

---

### WP2: Utility Functions & Pubkey Handling

**Objective:** Create shared utilities for pubkey validation, JSON responses, and UUID generation.

#### Checklist

- [ ] 2.1 Create utilities module (`src/utils.ts`)
  - [ ] `jsonContent(payload)` - wrap response for MCP
  - [ ] `generateUUID()` - UUID v4 generation
  - [ ] `nowISO()` - current timestamp in ISO8601 UTC

- [ ] 2.2 Create pubkey utility (`src/pubkey.ts`)
  - [ ] `normalizeHex(pubkey: string): string` - validate/normalize hex pubkeys
  - [ ] `isValidPubkey(input: string): boolean` - validate hex format

- [ ] 2.3 Create error types module (`src/errors.ts`)
  - [ ] Define error codes as constants:
    ```typescript
    export const PLAYER_EXISTS = "PLAYER_EXISTS";
    export const PLAYER_NOT_FOUND = "PLAYER_NOT_FOUND";
    export const GAME_NOT_FOUND = "GAME_NOT_FOUND";
    export const GAME_NOT_OPEN = "GAME_NOT_OPEN";
    export const GAME_NOT_ACTIVE = "GAME_NOT_ACTIVE";
    // ... etc
    ```
  - [ ] Create `ChesterError` class with code and message

---

### Authorization Note

All mutating tools bind caller identity to `extra.authInfo.pubkey` from the signed Nostr event; supplied pubkey parameters must match or are rejected.

---

### WP3: Player Management

**Objective:** Implement player registration, lookup, and leaderboard tools.

#### Checklist

- [ ] 3.1 Create player service (`src/services/player-service.ts`)
  - [ ] `registerPlayer({ pubkey, displayName?, isAi?, aiPersonality? })`
  - [ ] `getPlayer(pubkey)` - returns player with recent games
  - [ ] `getLeaderboard({ limit?, includeAi? })`
  - [ ] `updateLastSeen(pubkey)` - touch last_seen_at
  - [ ] `ensurePlayer(pubkey)` - auto-register if not exists (for convenience)

- [ ] 3.2 Register `register_player` tool
  - [ ] Input: pubkey (hex), display_name?, is_ai?, ai_personality?
  - [ ] Validate ai_personality JSON schema if is_ai
  - [ ] Return player object using hex pubkey

- [ ] 3.3 Register `get_player` tool
  - [ ] Input: pubkey (hex)
  - [ ] Include recent_games (last 10 completed)
  - [ ] Calculate win_rate
  - [ ] Return full player profile

- [ ] 3.4 Register `get_leaderboard` tool
  - [ ] Input: limit (default 20, max 100), include_ai (default true)
  - [ ] Order by rating DESC
  - [ ] Include rank, win_rate

- [ ] 3.5 Register `get_my_games` tool (addition to spec)
  - [ ] Input: player_pubkey, status_filter?, limit?
  - [ ] Return games where player is white or black
  - [ ] Include opponent info and current state

---

### WP4: Game Creation & Lobby

**Objective:** Implement game creation and open game listing.

State transitions:
- games: open → active → completed
- games: open → cancelled (host) or abandoned (admin/system)
- requests: pending → accepted | declined | withdrawn
- accepting a challenger auto-declines other pending requests for that game

#### Checklist

- [ ] 4.1 Create game service (`src/services/game-service.ts`)
  - [ ] `createGame({ hostPubkey, type, colorPreference })`
  - [ ] `getGame(gameId)` - full game state with player info
  - [ ] `listOpenGames({ limit?, excludeAiHosts? })`
  - [ ] `updateGameStatus(gameId, status)`

- [ ] 4.2 Register `create_game` tool
  - [ ] Input: host_pubkey, type, host_color_preference
  - [ ] Validate host exists (or auto-register)
  - [ ] Validate host_color_preference in {white, black, random}
  - [ ] Generate UUID for game
  - [ ] Return game object with share_url

- [ ] 4.3 Register `list_open_games` tool
  - [ ] Input: limit?, exclude_ai_hosts?
  - [ ] Filter by status = 'open'
  - [ ] Include challenger_count from game_requests
  - [ ] Join with players for host info

- [ ] 4.4 Register `get_game` tool
  - [ ] Input: game_id
  - [ ] Return full game state
  - [ ] Include white/black player objects
  - [ ] Derive turn from FEN

- [ ] 4.5 Register `get_moves` tool
  - [ ] Input: game_id
  - [ ] Return moves grouped by move_number
  - [ ] Generate PGN string from move history

---

### WP5: Challenger Flow

**Objective:** Implement join request, withdrawal, listing, accept, and decline.

#### Checklist

- [ ] 5.1 Create challenger service (`src/services/challenger-service.ts`)
  - [ ] `requestJoin({ gameId, requesterPubkey })`
  - [ ] `withdrawRequest({ gameId, requesterPubkey })`
  - [ ] `listChallengers(gameId)`
  - [ ] `acceptChallenger({ gameId, hostPubkey, challengerPubkey })`
  - [ ] `declineChallenger({ gameId, hostPubkey, challengerPubkey })`
  - [ ] `declineAllPending(gameId)` - helper for accept flow

- [ ] 5.2 Register `request_join` tool
  - [ ] Input: game_id, requester_pubkey
  - [ ] Validate game is open
  - [ ] Prevent duplicate requests
  - [ ] Prevent host from joining own game
  - [ ] Return request_id and status

- [ ] 5.3 Register `withdraw_request` tool
  - [ ] Input: game_id, requester_pubkey
  - [ ] Auth: verify caller === requester (via extra.authInfo)
  - [ ] Update status to 'withdrawn'

- [ ] 5.4 Register `list_challengers` tool
  - [ ] Input: game_id, host_pubkey
  - [ ] Auth: verify caller === host
  - [ ] Return challengers with player info and ratings

- [ ] 5.5 Register `accept_challenger` tool
  - [ ] Input: game_id, host_pubkey, challenger_pubkey
  - [ ] Auth: verify caller === host
  - [ ] Assign colors based on preference (random if needed)
  - [ ] Set initial FEN
  - [ ] Update game status to 'active'
  - [ ] Decline all other pending requests
  - [ ] Return started game state

- [ ] 5.6 Register `decline_challenger` tool
  - [ ] Input: game_id, host_pubkey, challenger_pubkey
  - [ ] Auth: verify caller === host
  - [ ] Update request status to 'declined'

---

### WP6: Core Gameplay - Move Validation

**Objective:** Implement make_move with chess.js validation and game state updates.

#### Checklist

- [ ] 6.1 Create chess engine wrapper (`src/services/chess-engine.ts`)
  - [ ] `validateMove(fen, move)` - returns { valid, san, uci, fenAfter } or error
  - [ ] `isGameOver(fen)` - returns { over, result?, termination? }
  - [ ] `getTurn(fen)` - returns 'white' | 'black'
  - [ ] `isCheck(fen)` - returns boolean
  - [ ] Support both SAN and UCI input

- [ ] 6.2 Create move service (`src/services/move-service.ts`)
  - [ ] `makeMove({ gameId, playerPubkey, move })`
    - [ ] Load game and validate active status
    - [ ] Verify it's player's turn
    - [ ] Validate move with chess engine
    - [ ] Insert move record
      - [ ] Store both `move_number` (full move) and `ply_number` with `color` to avoid grouping ambiguity
    - [ ] Update game FEN and last_move_at
    - [ ] Check for game over conditions
    - [ ] Return new game state

- [ ] 6.3 Register `make_move` tool
  - [ ] Input: game_id, player_pubkey, move
  - [ ] Auth: verify caller === player_pubkey
  - [ ] Return game state with last_move, check status, game_over flag
  - [ ] If game ended, include result and termination_type

- [ ] 6.4 Handle all termination conditions
  - [ ] Checkmate
  - [ ] Stalemate
  - [ ] Threefold repetition
  - [ ] Fifty move rule
  - [ ] Insufficient material

---

### WP7: Game End Actions

**Objective:** Implement resign, draw offer/response, and game finalization.

#### Checklist

- [ ] 7.1 Add to move service
  - [ ] `resign({ gameId, playerPubkey })`
  - [ ] `offerDraw({ gameId, playerPubkey })`
  - [ ] `respondDraw({ gameId, playerPubkey, accept })`

- [ ] 7.2 Create game finalization helper
  - [ ] `finalizeGame({ gameId, result, terminationType })`
    - [ ] Update game status to 'completed'
    - [ ] Set ended_at timestamp
    - [ ] Trigger rating update
    - [ ] Trigger ECO classification

- [ ] 7.3 Register `resign` tool
  - [ ] Input: game_id, player_pubkey
  - [ ] Auth: verify caller === player_pubkey
  - [ ] Set result to opponent, termination to 'resignation'
  - [ ] Return final game state with rating changes

- [ ] 7.4 Register `offer_draw` tool
  - [ ] Input: game_id, player_pubkey
  - [ ] Auth: verify caller === player_pubkey
  - [ ] Set draw_offer_by (any participant may offer)
  - [ ] Reject if draw already offered

- [ ] 7.5 Register `respond_draw` tool
  - [ ] Input: game_id, player_pubkey, accept
  - [ ] Auth: verify caller === player_pubkey
  - [ ] Verify caller is NOT the one who offered
  - [ ] If accept: finalize as draw
  - [ ] If decline: clear draw_offer_by

---

### WP8: Glicko-2 Rating System

**Objective:** Implement rating updates after game completion.

#### Checklist

- [ ] 8.1 Create rating service (`src/services/rating-service.ts`)
  - [ ] Initialize Glicko2 with constants:
    - TAU = 0.5
    - DEFAULT_RATING = 1500
    - DEFAULT_RD = 350
    - DEFAULT_VOLATILITY = 0.06
  - [ ] `updateRatings({ whitePubkey, blackPubkey, result })`
    - [ ] Load both players' current ratings
    - [ ] Create Glicko2 player objects
    - [ ] Record match result (1 for white, 0 for black, 0.5 for draw)
    - [ ] Calculate new ratings
    - [ ] Update database
    - [ ] Return old/new ratings for both

- [ ] 8.2 Integrate with game finalization
  - [ ] Call rating service when game ends
  - [ ] Include rating_changes in game end response

- [ ] 8.3 Implement RD decay for inactive players
  - [ ] Calculate at query time in get_player
  - [ ] Apply formula from spec
  - [ ] Cap at 350

- [ ] 8.4 Update player statistics
  - [ ] Increment games_played for both
  - [ ] Increment wins/losses/draws appropriately

---

### WP9: ECO Opening Classification

**Objective:** Classify completed games by opening.

#### Checklist

- [ ] 9.1 Obtain ECO database
  - [ ] Source open-source ECO JSON (e.g., from lichess) and pin version in repo
  - [ ] Format: `{ eco: "B20", name: "Sicilian", moves: "1.e4 c5" }`
  - [ ] Store as `src/data/eco.json` (single source of truth)

- [ ] 9.2 Create ECO service (`src/services/eco-service.ts`)
  - [ ] Load ECO database at startup
  - [ ] Build trie or lookup structure keyed by move sequence
  - [ ] `classifyOpening(moves: string[])` - returns ECO code
  - [ ] Match longest prefix

- [ ] 9.3 Integrate with game finalization
  - [ ] Load move history for game
  - [ ] Extract SAN sequence
  - [ ] Classify and store opening_eco

---

### WP10: AI Player Support

**Objective:** Enable AI players to participate in games.

#### Checklist

- [ ] 10.1 Create AI service (`src/services/ai-service.ts`)
  - [ ] `isAiPlayer(pubkey)` - check is_ai flag
  - [ ] `getAiPersonality(pubkey)` - return parsed personality
  - [ ] `generateAiMove({ gameId, aiPubkey })` - compute best move

- [ ] 10.2 Integrate chess engine for AI
  - [ ] Use chess.js for move generation
  - [ ] Implement skill-based move selection:
    - Levels 1-3: Random legal move with occasional good move
    - Levels 4-6: Minimax with shallow depth
    - Levels 7-10: Could integrate Stockfish WASM (future)

- [ ] 10.3 Register `trigger_ai_move` tool (internal/testing)
  - [ ] Input: game_id
  - [ ] Check if current turn is AI player
  - [ ] Generate and execute move
  - [ ] Return new game state

- [ ] 10.4 Consider automatic AI response
  - [ ] Option A: After human moves, check if opponent is AI and trigger
  - [ ] Option B: Leave manual for now, implement background worker later

---

### WP11: Admin & Utilities

**Objective:** Implement health check, abandonment, and admin tools.

#### Checklist

- [ ] 11.1 Register `health` tool
  - [ ] Return `{ ok: true, version: "1.0.0" }`

- [ ] 11.2 Register `abandon_game` tool (admin)
  - [ ] Input: game_id, admin_pubkey
  - [ ] Validate admin authorization (configurable admin list)
  - [ ] Set status to 'abandoned'
  - [ ] No rating changes for abandoned games

- [ ] 11.3 Register `cancel_game` tool
  - [ ] Input: game_id, host_pubkey
  - [ ] Auth: verify caller === host
  - [ ] Only works if game is still 'open'
  - [ ] Decline all pending requests
  - [ ] Delete or mark game cancelled

---

### WP12: Integration Testing

**Objective:** End-to-end testing of complete game flows.

#### Checklist

- [ ] 12.1 Create test harness
  - [ ] In-memory SQLite for tests
  - [ ] Mock Nostr transport or direct MCP calls

- [ ] 12.2 Test player flows
  - [ ] Registration (new, duplicate)
  - [ ] Profile retrieval
  - [ ] Leaderboard

- [ ] 12.3 Test game lifecycle
  - [ ] Create game
  - [ ] Join requests
  - [ ] Accept/decline
  - [ ] Full game to checkmate
  - [ ] Full game to resignation
  - [ ] Draw negotiation

- [ ] 12.4 Test edge cases
  - [ ] Invalid moves
  - [ ] Out of turn moves
  - [ ] Stalemate
  - [ ] Threefold repetition
  - [ ] Fifty move rule

- [ ] 12.5 Test rating system
  - [ ] Verify Glicko-2 calculations
  - [ ] Check win/loss/draw updates

---

## File Structure

```
chestercvm/
├── docs/
│   ├── chester-spec.md
│   └── implementation-plan.md
├── src/
│   ├── db.ts                    # Database initialization
│   ├── utils.ts                 # Helper functions
│   ├── pubkey.ts                # hex pubkey validation/normalization
│   ├── errors.ts                # Error codes and ChesterError
│   ├── data/
│   │   └── eco.json             # ECO opening database
│   └── services/
│       ├── player-service.ts
│       ├── game-service.ts
│       ├── challenger-service.ts
│       ├── move-service.ts
│       ├── chess-engine.ts
│       ├── rating-service.ts
│       ├── eco-service.ts
│       └── ai-service.ts
├── server.ts                    # Entry point
├── package.json
├── tsconfig.json
├── .env.example
└── .gitignore
```

---

## Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^latest",
    "@contextvm/sdk": "^latest",
    "chess.js": "^1.0.0",
    "glicko2": "^1.1.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.0.0"
  }
}
```

---

## Execution Order

1. **WP1** → WP2 (foundation)
2. **WP3** (players - needed for everything)
3. **WP4** → WP5 (game creation and joining)
4. **WP6** → WP7 (gameplay)
5. **WP8** (ratings - after gameplay works)
6. **WP9** (ECO - after games can complete)
7. **WP10** (AI - optional enhancement)
8. **WP11** (admin tools)
9. **WP12** (testing throughout, but comprehensive pass at end)

---

## Notes

- All timestamps stored and returned in ISO8601 UTC (server clock)
- All pubkeys are hex end-to-end; clients may render npub separately
- Authorization binds to `extra.authInfo.pubkey` from signed Nostr events
- Game abandonment is manual admin action only
- Players can have multiple concurrent games

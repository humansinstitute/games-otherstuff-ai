# Chester: Nostr-Native Chess Platform

## Technical Specification v1.0

### Overview

Chester is a multiplayer chess platform built on Bun + SQLite with an MCP API interface. Players are identified by Nostr public keys (stored as hex; clients may display npubs), enabling seamless integration with the Nostr social layer for matchmaking, notifications, and viral distribution.

### Design Principles

1. **Nostr-native identity** - No accounts, no passwords. Your Nostr pubkey is your identity.
2. **Social matchmaking** - Players find opponents through their existing social graph by posting game links to Nostr.
3. **Async-first** - Supports both real-time and postal-style chess over extended periods.
4. **AI as first-class citizens** - AI opponents are real pubkeys with personalities, ratings, and social presence.
5. **Stats for free** - Capture comprehensive game data passively to enable future matchmaking features.

---

## Data Model

### players

Primary identity and statistics table. All stored keys are hex; client-facing displays can convert to npub (out of scope here).

| Column | Type | Description |
|--------|------|-------------|
| `pubkey` | TEXT PRIMARY KEY | Nostr public key (hex) |
| `display_name` | TEXT | Optional human-readable name |
| `is_ai` | INTEGER | 0 = human, 1 = AI player |
| `ai_personality` | TEXT (JSON) | AI config: skill_level, play_style, bio, trash_talk. NULL for humans |
| `rating` | REAL | Glicko-2 rating (default: 1500) |
| `rating_deviation` | REAL | Glicko-2 RD (default: 350) |
| `rating_volatility` | REAL | Glicko-2 volatility (default: 0.06) |
| `games_played` | INTEGER | Total completed games |
| `wins` | INTEGER | Total wins |
| `losses` | INTEGER | Total losses |
| `draws` | INTEGER | Total draws |
| `created_at` | TEXT | ISO8601 UTC timestamp |
| `last_seen_at` | TEXT | ISO8601 UTC timestamp of last activity (server clock) |

#### AI Personality Schema

```json
{
  "skill_level": 5,          // 1-10, maps to engine depth/randomness
  "play_style": "aggressive", // aggressive | positional | chaotic | defensive
  "bio": "I learned chess from a pigeon in the park.",
  "trash_talk": true
}
```

### games

Core game state and metadata.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PRIMARY KEY | UUID v4 |
| `type` | TEXT | "public", "private", or "ai" |
| `status` | TEXT | "open", "active", "completed", "abandoned", "cancelled" |
| `host_pubkey` | TEXT | FK → players.pubkey |
| `host_color_preference` | TEXT | "white", "black", or "random" |
| `white_pubkey` | TEXT | FK → players.pubkey (set when game starts) |
| `black_pubkey` | TEXT | FK → players.pubkey (set when game starts) |
| `current_fen` | TEXT | Current board state in FEN notation (default: starting FEN when created) |
| `result` | TEXT | "white", "black", "draw", or NULL |
| `termination_type` | TEXT | How game ended (see below) |
| `opening_eco` | TEXT | ECO code derived from moves (e.g., "B20") |
| `draw_offer_by` | TEXT | pubkey of player offering draw, or NULL |
| `created_at` | TEXT | ISO8601 UTC timestamp |
| `started_at` | TEXT | ISO8601 UTC timestamp (when opponent accepted) |
| `ended_at` | TEXT | ISO8601 UTC timestamp |
| `last_move_at` | TEXT | ISO8601 UTC timestamp (for postal chess nudges; server clock) |

#### Termination Types

- `checkmate` - Standard win
- `resignation` - Player resigned
- `timeout` - Clock ran out (future)
- `draw_agreement` - Both players agreed
- `stalemate` - No legal moves, not in check
- `threefold_repetition` - Position repeated 3 times
- `fifty_move_rule` - 50 moves without pawn move or capture
- `insufficient_material` - Cannot checkmate (e.g., K vs K)
- `abandonment` - Player stopped responding (admin/system action)

### game_requests

Challenger queue for open games.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PRIMARY KEY | UUID v4 |
| `game_id` | TEXT | FK → games.id |
| `requester_pubkey` | TEXT | FK → players.pubkey |
| `status` | TEXT | "pending", "accepted", "declined", "withdrawn" |
| `created_at` | TEXT | ISO8601 timestamp |
| `resolved_at` | TEXT | ISO8601 timestamp (when accepted/declined/withdrawn) |

Uniqueness: only one pending request per `(game_id, requester_pubkey)` at a time; duplicates are rejected.
### moves

Complete move history for all games.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PRIMARY KEY | UUID v4 |
| `game_id` | TEXT | FK → games.id |
| `move_number` | INTEGER | Full move number (1, 2, 3...) |
| `ply_number` | INTEGER | Ply number (1, 2, 3...) |
| `player_pubkey` | TEXT | FK → players.pubkey |
| `color` | TEXT | "white" or "black" |
| `san` | TEXT | Standard Algebraic Notation (e.g., "Nxf7+") |
| `uci` | TEXT | Universal Chess Interface format (e.g., "g1f3") |
| `fen_after` | TEXT | Board state after this move |
| `created_at` | TEXT | ISO8601 timestamp |

---

## Game Flow

### Allowed Status Transitions

- games: `open` → `active` → `completed`
- games: `open` → `cancelled` (host) or `abandoned` (admin/system)
- game_requests: `pending` → `accepted` | `declined` | `withdrawn`
- auto-decline: accepting a challenger moves all other pending requests for that game to `declined`

### Creating and Starting a Game

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  1. Alice calls create_game(type: "public", color: "white")     │
│                         │                                       │
│                         ▼                                       │
│  2. System returns game_id: "abc123"                            │
│     Game status: "open"                                         │
│                         │                                       │
│                         ▼                                       │
│  3. Alice posts to Nostr (kind 1):                              │
│     "Anyone fancy a game? chester.otherstuff.ai/game/abc123"    │
│                         │                                       │
│                         ▼                                       │
│  4. Bob, Carol, ChessBot_AI see the post                        │
│     Each calls request_join(game_id: "abc123")                  │
│                         │                                       │
│                         ▼                                       │
│  5. Alice calls list_challengers(game_id: "abc123")             │
│     Sees: [Bob, Carol, ChessBot_AI] with their ratings          │
│                         │                                       │
│                         ▼                                       │
│  6. Alice calls accept_challenger(game_id: "abc123",            │
│                                   challenger: Bob.pubkey)       │
│                         │                                       │
│                         ▼                                       │
│  7. Game status → "active"                                      │
│     Carol and ChessBot_AI requests → "declined"                 │
│     Colors assigned per host preference                         │
│     Board initialized to starting position                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Playing Moves

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  1. Player calls make_move(game_id, move: "e4")                 │
│                         │                                       │
│                         ▼                                       │
│  2. Server validates:                                           │
│     - Is it this player's turn?                                 │
│     - Is the move legal? (chess.js)                             │
│     - Is the game active?                                       │
│                         │                                       │
│                         ▼                                       │
│  3. If valid:                                                   │
│     - Store move in moves table                                 │
│     - Update current_fen in games                               │
│     - Update last_move_at                                       │
│     - Check for game end conditions                             │
│     - Return success + new game state                           │
│                         │                                       │
│                         ▼                                       │
│  4. If game ended:                                              │
│     - Set result and termination_type                           │
│     - Update both players' Glicko-2 ratings                     │
│     - Increment games_played/wins/losses/draws                  │
│     - Derive and store opening_eco from move history            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Draw Negotiation

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  1. Alice calls offer_draw(game_id)                             │
│     - draw_offer_by set to Alice's pubkey                       │
│                         │                                       │
│                         ▼                                       │
│  2. Bob sees draw offer in get_game response                    │
│     - Calls respond_draw(game_id, accept: true/false)           │
│                         │                                       │
│              ┌──────────┴──────────┐                            │
│              ▼                     ▼                            │
│         accept: true          accept: false                     │
│              │                     │                            │
│              ▼                     ▼                            │
│     Game ends as draw      draw_offer_by → NULL                 │
│     result: "draw"         Game continues                       │
│     termination: "draw_agreement"                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## MCP API Tools

### Player Management

#### register_player

Register a new player by their Nostr public key (hex).

**Input:**
```json
{
  "pubkey": "abcdef...",
  "display_name": "Alice",        // optional
  "is_ai": false,                 // optional, default false
  "ai_personality": null          // required if is_ai: true
}
```

**Output:**
```json
{
  "success": true,
  "player": {
    "pubkey": "abcdef...",
    "display_name": "Alice",
    "rating": 1500,
    "games_played": 0
  }
}
```

**Errors:**
- `PLAYER_EXISTS` - pubkey already registered

#### get_player

Retrieve player profile and statistics.

**Input:**
```json
{
  "pubkey": "abcdef..."
}
```

**Output:**
```json
{
  "pubkey": "abcdef...",
  "display_name": "Alice",
  "is_ai": false,
  "rating": 1547,
  "rating_deviation": 45.2,
  "games_played": 23,
  "wins": 12,
  "losses": 8,
  "draws": 3,
  "created_at": "2024-01-15T10:30:00Z",
  "last_seen_at": "2024-01-20T14:22:00Z",
  "recent_games": [
    {
      "game_id": "abc123",
      "opponent_pubkey": "1234abcd...",
      "result": "win",
      "played_as": "white",
      "ended_at": "2024-01-20T14:22:00Z"
    }
  ]
}
```

**Errors:**
- `PLAYER_NOT_FOUND` - pubkey not registered

#### get_leaderboard

Retrieve top players by rating.

**Input:**
```json
{
  "limit": 20,                    // optional, default 20, max 100
  "include_ai": true              // optional, default true
}
```

**Output:**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "pubkey": "abcdef...",
      "display_name": "GrandMaster_Greg",
      "is_ai": false,
      "rating": 1823,
      "games_played": 156,
      "win_rate": 0.72
    }
  ]
}
```

### Game Management

#### create_game

Create a new game lobby.

**Input:**
```json
{
  "host_pubkey": "abcdef...",
  "type": "public",               // "public", "private", "ai"
  "host_color_preference": "white" // "white", "black", "random"
}
```

**Output:**
```json
{
  "success": true,
  "game": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "open",
    "type": "public",
    "host_pubkey": "abcdef...",
    "host_color_preference": "white",
    "created_at": "2024-01-20T15:00:00Z",
    "share_url": "https://chester.otherstuff.ai/game/550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Errors:**
- `PLAYER_NOT_FOUND` - host pubkey not registered

#### list_open_games

Find public games seeking opponents.

**Input:**
```json
{
  "limit": 20,                    // optional, default 20
  "exclude_ai_hosts": false       // optional, default false
}
```

**Output:**
```json
{
  "games": [
    {
      "id": "abc123",
      "host_pubkey": "abcdef...",
      "host_display_name": "Alice",
      "host_rating": 1547,
      "type": "public",
      "host_color_preference": "random",
      "created_at": "2024-01-20T15:00:00Z",
      "challenger_count": 3
    }
  ]
}
```

#### request_join

Request to join an open game.

**Input:**
```json
{
  "game_id": "abc123",
  "requester_pubkey": "1234abcd..."
}
```

**Output:**
```json
{
  "success": true,
  "request_id": "req_456",
  "status": "pending"
}
```

**Errors:**
- `GAME_NOT_FOUND` - game doesn't exist
- `GAME_NOT_OPEN` - game already started or completed
- `ALREADY_REQUESTED` - player already has pending request
- `CANNOT_JOIN_OWN_GAME` - host can't request to join their own game
- `PLAYER_NOT_FOUND` - requester pubkey not registered

#### withdraw_request

Cancel a pending join request.

**Input:**
```json
{
  "game_id": "abc123",
  "requester_pubkey": "1234abcd..."
}
```

**Output:**
```json
{
  "success": true
}
```

**Errors:**
- `REQUEST_NOT_FOUND` - no pending request for this player/game

#### list_challengers

View all players requesting to join your game.

**Input:**
```json
{
  "game_id": "abc123",
  "host_pubkey": "abcdef..."       // for authorization
}
```

**Output:**
```json
{
  "challengers": [
    {
      "request_id": "req_456",
      "pubkey": "1234abcd...",
      "display_name": "Bob",
      "is_ai": false,
      "rating": 1489,
      "games_played": 45,
      "win_rate": 0.58,
      "requested_at": "2024-01-20T15:05:00Z"
    }
  ]
}
```

**Errors:**
- `GAME_NOT_FOUND` - game doesn't exist
- `NOT_HOST` - caller is not the game host

#### accept_challenger

Accept a challenger and start the game.

**Input:**
```json
{
  "game_id": "abc123",
  "host_pubkey": "abcdef...",
  "challenger_pubkey": "1234abcd..."
}
```

**Output:**
```json
{
  "success": true,
  "game": {
    "id": "abc123",
    "status": "active",
    "white_pubkey": "abcdef...",
    "black_pubkey": "1234abcd...",
    "current_fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "turn": "white",
    "started_at": "2024-01-20T15:10:00Z"
  }
}
```

**Behavior:**
- Sets white/black pubkeys based on host_color_preference (random if specified)
- Changes game status to "active"
- Initializes board to starting position
- Auto-declines all other pending requests for this game

**Errors:**
- `GAME_NOT_FOUND` - game doesn't exist
- `GAME_NOT_OPEN` - game already started
- `NOT_HOST` - caller is not the game host
- `REQUEST_NOT_FOUND` - challenger hasn't requested to join

#### decline_challenger

Reject a challenger's request.

**Input:**
```json
{
  "game_id": "abc123",
  "host_pubkey": "abcdef...",
  "challenger_pubkey": "1234abcd..."
}
```

**Output:**
```json
{
  "success": true
}
```

**Errors:**
- `GAME_NOT_FOUND` - game doesn't exist
- `NOT_HOST` - caller is not the game host (verified via authenticated pubkey)
- `REQUEST_NOT_FOUND` - challenger hasn't requested to join

#### get_game

Retrieve full game state.

**Input:**
```json
{
  "game_id": "abc123"
}
```

**Output:**
```json
{
  "id": "abc123",
  "type": "public",
  "status": "active",
  "white": {
    "pubkey": "abcdef...",
    "display_name": "Alice",
    "rating": 1547
  },
  "black": {
    "pubkey": "1234abcd...",
    "display_name": "Bob",
    "rating": 1489
  },
  "current_fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
  "turn": "black",
  "move_count": 1,
  "result": null,
  "draw_offer_by": null,
  "created_at": "2024-01-20T15:00:00Z",
  "started_at": "2024-01-20T15:10:00Z",
  "last_move_at": "2024-01-20T15:10:30Z"
}
```

#### get_moves

Retrieve move history for a game.

**Input:**
```json
{
  "game_id": "abc123"
}
```

**Output:**
```json
{
  "game_id": "abc123",
  "moves": [
    {
      "move_number": 1,
      "white": { "san": "e4", "uci": "e2e4", "timestamp": "2024-01-20T15:10:30Z" },
      "black": { "san": "e5", "uci": "e7e5", "timestamp": "2024-01-20T15:11:45Z" }
    },
    {
      "move_number": 2,
      "white": { "san": "Nf3", "uci": "g1f3", "timestamp": "2024-01-20T15:12:00Z" },
      "black": null
    }
  ],
  "pgn": "1. e4 e5 2. Nf3"
}
```

Moves are stored per ply with `color` and `ply_number` to disambiguate turns; `move_number` remains the full-move index used for grouped responses.

### Gameplay

#### make_move

Submit a chess move.

**Input:**
```json
{
  "game_id": "abc123",
  "player_pubkey": "1234abcd...",
  "move": "Nf6"                   // SAN or UCI format accepted
}
```

**Output:**
```json
{
  "success": true,
  "game": {
    "current_fen": "rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2",
    "turn": "white",
    "move_count": 2,
    "last_move": {
      "san": "Nf6",
      "uci": "g8f6"
    },
    "status": "active",
    "check": false,
    "game_over": false
  }
}
```

**On game end:**
```json
{
  "success": true,
  "game": {
    "current_fen": "...",
    "status": "completed",
    "result": "white",
    "termination_type": "checkmate",
    "game_over": true,
    "rating_changes": {
      "white": { "old": 1547, "new": 1562 },
      "black": { "old": 1489, "new": 1474 }
    }
  }
}
```

**Errors:**
- `GAME_NOT_FOUND` - game doesn't exist
- `GAME_NOT_ACTIVE` - game is not in progress
- `NOT_YOUR_TURN` - it's the other player's turn
- `INVALID_MOVE` - move is illegal (with reason)
- `NOT_IN_GAME` - player is not a participant

#### resign

Forfeit the game.

**Input:**
```json
{
  "game_id": "abc123",
  "player_pubkey": "1234abcd..."
}
```

**Output:**
```json
{
  "success": true,
  "game": {
    "status": "completed",
    "result": "white",            // the OTHER player wins
    "termination_type": "resignation",
    "rating_changes": { ... }
  }
}
```

**Errors:**
- `GAME_NOT_FOUND` - game doesn't exist
- `GAME_NOT_ACTIVE` - game is not in progress
- `NOT_IN_GAME` - player is not a participant

#### offer_draw

Propose a draw to your opponent.

Either participant may offer a draw; only one pending offer may exist at a time.

**Input:**
```json
{
  "game_id": "abc123",
  "player_pubkey": "1234abcd..."
}
```

**Output:**
```json
{
  "success": true,
  "draw_offer_by": "1234abcd..."
}
```

**Errors:**
- `GAME_NOT_FOUND` - game doesn't exist
- `GAME_NOT_ACTIVE` - game is not in progress
- `NOT_IN_GAME` - player is not a participant
- `DRAW_ALREADY_OFFERED` - there's already a pending draw offer

#### respond_draw

Accept or decline a draw offer.

**Input:**
```json
{
  "game_id": "abc123",
  "player_pubkey": "abcdef...",
  "accept": true
}
```

**Output (accepted):**
```json
{
  "success": true,
  "game": {
    "status": "completed",
    "result": "draw",
    "termination_type": "draw_agreement",
    "rating_changes": { ... }
  }
}
```

**Output (declined):**
```json
{
  "success": true,
  "draw_offer_by": null
}
```

**Errors:**
- `GAME_NOT_FOUND` - game doesn't exist
- `GAME_NOT_ACTIVE` - game is not in progress
- `NOT_IN_GAME` - player is not a participant
- `NO_DRAW_OFFER` - no pending draw offer
- `CANNOT_RESPOND_OWN_OFFER` - you made the offer, you can't respond to it

---

## Rating System

Chester uses Glicko-2 for rating calculations.

### Constants

```
DEFAULT_RATING = 1500
DEFAULT_RD = 350
DEFAULT_VOLATILITY = 0.06
TAU = 0.5                         // System constant, constrains volatility changes
```

### Rating Updates

Ratings are recalculated at the end of each game:

1. Convert ratings to Glicko-2 scale
2. Compute expected outcome based on ratings and RDs
3. Update rating, RD, and volatility for both players
4. Convert back to Glicko scale

Draws count as 0.5 for both players.

### Rating Deviation Decay

If a player hasn't played in a while, their RD increases (uncertainty grows). This happens passively and is calculated at query time:

```
time_since_last_game = now - last_played_at
periods_inactive = time_since_last_game / RATING_PERIOD  // e.g., 1 week
new_rd = sqrt(old_rd^2 + (volatility^2 * periods_inactive))
new_rd = min(new_rd, 350)  // cap at initial uncertainty
```

---

## Opening Classification

After each game ends, the move sequence is analyzed to derive an ECO (Encyclopaedia of Chess Openings) code.

### Process

ECO data source: bundled JSON dataset (e.g., lichess ECO list, pinned version in `src/data/eco.json`); refresh by updating the pinned file.

1. Replay moves from starting position
2. Match against ECO database (500+ patterns)
3. Store the most specific matching code; if no match is found, store `NULL`

### Example ECO Codes

| Code | Opening |
|------|---------|
| A00 | Irregular openings |
| B20 | Sicilian Defence |
| C50 | Italian Game |
| D30 | Queen's Gambit Declined |
| E60 | King's Indian Defence |

This data is stored for future use in style-based matchmaking ("practice against Sicilian players").

---

## AI Players

AI players are real Nostr identities with their own pubkeys. They participate in the rating system honestly and can post to Nostr about their games.

### Creating an AI Player

```json
{
  "pubkey": "abcdef_ai_stockfish_5...",
  "display_name": "Chester",
  "is_ai": true,
  "ai_personality": {
    "skill_level": 5,
    "play_style": "positional",
    "bio": "I play slowly and squeeze you like a python.",
    "trash_talk": true
  }
}
```

### Skill Levels

| Level | Description | Implementation |
|-------|-------------|----------------|
| 1-3 | Beginner | Shallow search, frequent random moves |
| 4-6 | Intermediate | Moderate depth, occasional blunders |
| 7-8 | Advanced | Deep search, solid play |
| 9-10 | Master | Maximum depth, near-optimal play |

### AI Nostr Integration (Future)

AI players can sign Nostr events because they have real keypairs:

- Post when they win/lose
- Challenge players who beat them to rematches
- Comment on interesting games
- Build rivalries and personality

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Bun |
| Database | SQLite (bun:sqlite) |
| Chess Logic | chess.js |
| API Layer | MCP (Model Context Protocol) |
| Rating | Glicko-2 (custom implementation) |
| IDs | UUID v4 |
| Timestamps | ISO8601 UTC |

---

## Operational Notes

- All timestamps are generated by the server clock in UTC.
- All pubkeys are stored in hex; clients may render npub externally.
- Authorization binds to the authenticated event pubkey (`extra.authInfo.pubkey`), not caller-supplied identity strings.
- Host color preference accepts only `white`, `black`, or `random`.

## Future Considerations

### v1.1 - Time Controls
- Add `time_control` to games (bullet/blitz/rapid/classical/correspondence)
- Track time remaining per player
- Timeout as termination type

### v1.2 - Matchmaking Queue
- Rating-based auto-matching
- Style preferences ("I want to practice against d4")
- Revenge matching

### v1.3 - Tournaments
- Swiss and round-robin formats
- Brackets and elimination

### v1.4 - Analysis
- Engine evaluation integration
- Blunder detection
- Game annotations

---

## Appendix: FEN Notation

FEN (Forsyth–Edwards Notation) encodes complete board state in a single string:

```
rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
│                                            │ │    │ │ │
│                                            │ │    │ │ └─ Fullmove number
│                                            │ │    │ └─── Halfmove clock
│                                            │ │    └───── En passant square
│                                            │ └────────── Castling rights
│                                            └──────────── Active color
└───────────────────────────────────────────────────────── Piece placement
```

This is the source of truth for board state, stored in `games.current_fen` and `moves.fen_after`.

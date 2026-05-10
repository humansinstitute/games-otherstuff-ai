# Chess CVM Server

A minimal Model Context Protocol backend (Bun + TypeScript + SQLite) that exposes chess tools over Nostr/Context VM. Board state is persisted as FEN, moves are validated with `chess.js`, and games can be created, joined, played, resigned, drawn, or undone with optional confirmation.

## Quick start

1) Install deps: `bun install`  
2) Configure env (or let the server do it):  
   - If `SERVER_PRIVATE_KEY` is **unset**, the server will generate one on first run and write it to `.env` (idempotent).  
   - `RELAYS=wss://relay.contextvm.org,wss://cvm.otherstuff.ai` (optional override)  
3) Run: `bun run server.ts`  
4) DB lives at `data/chess.db` (auto-created).

## Development tips

- Type-check: `bun run type-check`  
- Hot dev: `bun run --watch server.ts`  
- The MCP server uses Nostr transport via `@contextvm/sdk`; make sure relays are reachable.  
- Schema is created on boot. If you drop the DB, it will be recreated on next start.

## Security model (per-game secrets)

- Each color stores a **hashed secret** (`white_secret`, `black_secret`) per game (SHA-256).  
- Clients should derive a **stable, non-public secret per side** (e.g., hash of an ephemeral npub) and keep it client-side.  
- The server never returns stored secrets; game responses redact them.  
- All mutating actions require the caller’s secret; mismatches are rejected.  
- Secrets can be provided at `setup_game` time (if you already know the players), or must be provided in `register_game`. Once set, a color’s secret cannot be changed without matching the stored hash.

## Tool catalog

### Player management
- `setup_player(handle, displayName)` — create a unique player.  
- `get_player(handle)` — fetch player details.

### Game lifecycle
- `setup_game(whiteHandle?, blackHandle?, whiteSecret?, blackSecret?)` — create a game; becomes `active` when both colors are set, otherwise `pending`. Secrets are hashed and stored; if a color is missing you can set its secret later when registering.  
- `register_game(gameId, whiteHandle, blackHandle, whiteSecret, blackSecret)` — assign both colors to an existing game (activates if not completed). Secrets are required here and must match if already set.  
- `list_open_games()` — games with status `pending`.  
- `list_active_games()` — games with status `active`.  
- `get_games_for_player(playerHandle)` — games where the player is white or black.

### Playing and state
- `submit_move(gameId, playerHandle, move, secret)` — accepts SAN or coordinate moves; enforces turn order, updates FEN, ends games on checkmate/draw/stalemate/insufficient material/threefold. Requires the player's secret.  
- `get_game_state(gameId)` — returns game row, assigned players, and ordered moves with FENs.

### Results and corrections
- `resign_game(gameId, playerHandle, secret)` — marks opponent as winner (`*_wins_by_resign` result).  
- `offer_draw(gameId, playerHandle, secret)` — records a draw offer from that player.  
- `accept_draw(gameId, playerHandle, secret)` — accepts a pending offer from the opponent and completes the game as `draw`.  
- `undo_last_move(gameId, requesterHandle, secret, confirmByOpponent?, opponentConfirmed?, opponentHandle?)` — deletes the latest move, rewinds FEN, clears draw offers. If `confirmByOpponent` is true and `opponentConfirmed` is not yet true, the call returns a pending message; invoke again with `opponentConfirmed=true` (and optionally `opponentHandle` for extra safety). If the game was completed, undo reopens it to `active`.

### Health
- `health()` — simple connectivity probe.

## Typical flows

### Create players
```
setup_player { "handle": "alice", "displayName": "Alice" }
setup_player { "handle": "bob", "displayName": "Bob" }
```

### Create a game and register players with secrets
```
setup_game {
  "whiteHandle": "alice",
  "blackHandle": "bob",
  "whiteSecret": "<alice-secret>",
  "blackSecret": "<bob-secret>"
}
```
Or create pending, then register later:
```
setup_game {}
register_game {
  "gameId": 1,
  "whiteHandle": "alice",
  "blackHandle": "bob",
  "whiteSecret": "<alice-secret>",
  "blackSecret": "<bob-secret>"
}
```

### Play moves (secret required)
```
submit_move { "gameId": 1, "playerHandle": "alice", "move": "e4", "secret": "<alice-secret>" }
submit_move { "gameId": 1, "playerHandle": "bob",   "move": "c5", "secret": "<bob-secret>" }
```

### Draws and resignations
```
offer_draw  { "gameId": 1, "playerHandle": "alice", "secret": "<alice-secret>" }
accept_draw { "gameId": 1, "playerHandle": "bob",   "secret": "<bob-secret>" }
resign_game { "gameId": 1, "playerHandle": "alice", "secret": "<alice-secret>" }
```

### Undo last move (with optional opponent confirmation)
```
undo_last_move {
  "gameId": 1,
  "requesterHandle": "alice",
  "secret": "<alice-secret>",
  "confirmByOpponent": true
}
```
If the response has `pendingConfirmation: true`, call again with `opponentConfirmed: true` (and optionally `opponentHandle`).

## Notes on game rules

- The server trusts `chess.js` for legality and game-over detection.  
- When resigning, the non-resigning player is set as `winner_player_id` and the result reflects which color resigned.  
- Draw offers are stored on the game record (`draw_offer_by`). Only the opponent can accept; offers clear on undo.  
- Undo rewinds to `fen_before` of the last move. There is no multi-move rollback; call repeatedly to walk back further.
- Secrets are per game and hashed server-side (SHA-256). Clients should derive a stable, non-public secret per side (e.g., hash of an ephemeral npub) and must supply it on all mutating actions. The server never returns stored secrets.

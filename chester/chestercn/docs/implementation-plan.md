# Chester Frontend Implementation Plan

## Overview

This document outlines the implementation plan for Chester Frontend, a Nostr-native chess client. The frontend connects to the Chester CVM backend via MCP over Nostr relays.

**Reference Spec:** [frontend-spec.md](./frontend-spec.md)

**Backend Spec:** [chestercvm/docs/chester-spec.md](../../chestercvm/docs/chester-spec.md)

---

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Runtime | Bun | Already configured, fast HMR |
| Framework | React 19 | Already installed |
| UI | ShadCN/ui | Already installed, accessible |
| Styling | Tailwind CSS 4 | Already configured |
| Chess Logic | chess.js | Same as backend, familiar API |
| Key Management | @noble/secp256k1 | Lightweight, audited |
| State | React Context | Simple, no deps |
| Routing | Hash-based | Works with Bun.serve |

---

## Work Packages

### WP1: Level 1 - Welcome & Identity

**Objective:** Implement the welcome screen with Nostr identity management.

#### Checklist

- [ ] 1.1 Set up project structure
  - [ ] Create `src/contexts/` directory
  - [ ] Create `src/hooks/` directory
  - [ ] Create `src/pages/` directory
  - [ ] Create `src/utils/` directory
  - [ ] Install chess.js: `bun add chess.js`
  - [ ] Install noble crypto: `bun add @noble/secp256k1 @noble/hashes`

- [ ] 1.2 Create identity utilities (`src/utils/keys.ts`)
  - [ ] `generateKeyPair()` - generate new secp256k1 keypair
  - [ ] `pubkeyToNpub(hex)` - convert hex pubkey to npub (display only)
  - [ ] `nsecToHex(nsec)` - convert nsec to hex private key
  - [ ] `hexToNsec(hex)` - convert hex to nsec (for export)
  - [ ] `isValidHexKey(key)` - validate 64-char hex

- [ ] 1.3 Create NIP-07 integration (`src/utils/nip07.ts`)
  - [ ] `hasNostrExtension()` - check if window.nostr exists
  - [ ] `getPublicKeyFromExtension()` - get pubkey via NIP-07
  - [ ] `signWithExtension(event)` - sign event via NIP-07

- [ ] 1.4 Create IdentityContext (`src/contexts/IdentityContext.tsx`)
  - [ ] Interface for stored identity
  - [ ] Load identity from localStorage on mount
  - [ ] `login(privateKey)` - login with hex key
  - [ ] `loginWithExtension()` - login via NIP-07
  - [ ] `generateAndLogin()` - create new keys and login
  - [ ] `logout()` - clear identity
  - [ ] Persist to localStorage

- [ ] 1.5 Create ChesterContext (`src/contexts/ChesterContext.tsx`)
  - [ ] Create ChestervmClient when identity changes
  - [ ] Expose client via context
  - [ ] Handle connection errors

- [ ] 1.6 Create Welcome page (`src/pages/Welcome.tsx`)
  - [ ] Logo and title
  - [ ] "Connect with Nostr Extension" button
  - [ ] "Generate New Keys" button
  - [ ] "Import Key" expand section
  - [ ] Show generated keys for backup (when applicable)

- [ ] 1.7 Create hash router (`src/router.tsx`)
  - [ ] Simple hash-based routing
  - [ ] Routes: `/`, `/lobby`, `/game/:id`, `/profile`
  - [ ] Redirect to `/` if not authenticated

- [ ] 1.8 Update App.tsx
  - [ ] Wrap in context providers
  - [ ] Add router
  - [ ] Conditional render Welcome vs main app

---

### WP2: Level 2 - Player Registration & Profile

**Objective:** Register players on backend and display profile.

#### Checklist

- [ ] 2.1 Create useChester hook (`src/hooks/useChester.ts`)
  - [ ] Access ChesterContext
  - [ ] Throw if not in provider or no client

- [ ] 2.2 Create useProfile hook (`src/hooks/useProfile.ts`)
  - [ ] Fetch player profile on mount
  - [ ] Auto-register if player not found
  - [ ] Expose profile data and loading state
  - [ ] `refreshProfile()` method

- [ ] 2.3 Create ProfileCard component (`src/components/ProfileCard.tsx`)
  - [ ] Display name / npub (shortened)
  - [ ] Rating with RD uncertainty indicator
  - [ ] Win/Loss/Draw stats
  - [ ] Games played count
  - [ ] Copy pubkey button

- [ ] 2.4 Create ProfilePage (`src/pages/Profile.tsx`)
  - [ ] Full profile card
  - [ ] Recent games list
  - [ ] Edit display name option
  - [ ] Export keys section (with warnings)

- [ ] 2.5 Update Welcome flow
  - [ ] After login, call RegisterPlayer
  - [ ] Handle PLAYER_EXISTS gracefully (already registered)
  - [ ] Navigate to lobby on success

---

### WP3: Level 3 - Game Lobby

**Objective:** Display open games and allow game creation.

#### Checklist

- [ ] 3.1 Create useOpenGames hook (`src/hooks/useOpenGames.ts`)
  - [ ] Fetch open games with ListOpenGames
  - [ ] Poll every 10 seconds
  - [ ] Pause polling when tab hidden
  - [ ] Return games, loading, error

- [ ] 3.2 Create useMyGames hook (`src/hooks/useMyGames.ts`)
  - [ ] Fetch user's games with GetMyGames
  - [ ] Filter by status (active, open)
  - [ ] Poll every 5 seconds for active games
  - [ ] Return games grouped by status

- [ ] 3.3 Create GameCard component (`src/components/GameCard.tsx`)
  - [ ] Host name and rating
  - [ ] Game type badge (public/private/ai)
  - [ ] Color preference indicator
  - [ ] Challenger count
  - [ ] "Join" button

- [ ] 3.4 Create ActiveGameCard component (`src/components/ActiveGameCard.tsx`)
  - [ ] Mini board preview (optional)
  - [ ] Opponent info
  - [ ] Whose turn indicator
  - [ ] "Continue" button

- [ ] 3.5 Create Lobby page (`src/pages/Lobby.tsx`)
  - [ ] Header with profile summary
  - [ ] "Create Game" button
  - [ ] Open games section
  - [ ] My active games section
  - [ ] Empty states

- [ ] 3.6 Create CreateGameModal (`src/components/CreateGameModal.tsx`)
  - [ ] Game type selector (Public/Private/AI)
  - [ ] Color preference selector
  - [ ] Create button
  - [ ] Loading state
  - [ ] Error handling

---

### WP4: Level 4 - Game Creation Flow

**Objective:** Create games and manage challengers.

#### Checklist

- [ ] 4.1 Create useGame hook (`src/hooks/useGame.ts`)
  - [ ] Fetch game state with GetGame
  - [ ] Poll at configurable interval
  - [ ] Track game status changes
  - [ ] Return game, loading, error

- [ ] 4.2 Create useChallengers hook (`src/hooks/useChallengers.ts`)
  - [ ] Fetch challengers with ListChallengers
  - [ ] Poll every 3 seconds when game is open
  - [ ] Stop polling when game starts

- [ ] 4.3 Create WaitingRoom page (`src/pages/WaitingRoom.tsx`)
  - [ ] Game ID display
  - [ ] Shareable link (copy button)
  - [ ] Challenger list
  - [ ] Accept/Decline buttons
  - [ ] Cancel game button
  - [ ] Auto-navigate when game starts

- [ ] 4.4 Create ChallengerCard component (`src/components/ChallengerCard.tsx`)
  - [ ] Player name and rating
  - [ ] Win rate
  - [ ] Request time
  - [ ] Accept/Decline buttons

- [ ] 4.5 Implement game creation flow
  - [ ] CreateGame API call
  - [ ] Navigate to WaitingRoom
  - [ ] Handle errors

- [ ] 4.6 Create ShareableLink component (`src/components/ShareableLink.tsx`)
  - [ ] HTTPS URL
  - [ ] Copy button with feedback
  - [ ] Optional: Nostr share (kind 1 post)

---

### WP5: Level 5 - Joining Games

**Objective:** Request to join games and handle responses.

#### Checklist

- [ ] 5.1 Create useJoinRequest hook (`src/hooks/useJoinRequest.ts`)
  - [ ] Track pending join request
  - [ ] Poll game status for acceptance
  - [ ] Detect declined status
  - [ ] Withdraw request method

- [ ] 5.2 Create PendingJoin page (`src/pages/PendingJoin.tsx`)
  - [ ] "Waiting for host" message
  - [ ] Host info
  - [ ] Withdraw request button
  - [ ] Auto-navigate on accept/decline

- [ ] 5.3 Update GameCard
  - [ ] "Join" button calls RequestJoin
  - [ ] Navigate to PendingJoin

- [ ] 5.4 Handle join request states
  - [ ] Pending → PendingJoin page
  - [ ] Accepted → Navigate to game
  - [ ] Declined → Toast, return to lobby

---

### WP6: Level 6 - Chess Board

**Objective:** Render interactive chess board.

#### Checklist

- [ ] 6.1 Create chess utilities (`src/utils/chess.ts`)
  - [ ] `fenToBoard(fen)` - parse FEN to 2D array
  - [ ] `getSquareColor(file, rank)` - returns light/dark
  - [ ] `squareToCoords(square)` - e.g., "e4" → [4, 3]
  - [ ] `coordsToSquare(file, rank)` - e.g., [4, 3] → "e4"
  - [ ] `getLegalMoves(fen, square)` - using chess.js

- [ ] 6.2 Create Square component (`src/components/chess/Square.tsx`)
  - [ ] Light/dark styling
  - [ ] Selected state highlight
  - [ ] Legal move indicator
  - [ ] Last move highlight
  - [ ] Check indicator (if king in check)
  - [ ] Click handler

- [ ] 6.3 Create Piece component (`src/components/chess/Piece.tsx`)
  - [ ] Unicode symbols or SVG
  - [ ] White/black variants
  - [ ] Drag support (optional)

- [ ] 6.4 Create ChessBoard component (`src/components/chess/ChessBoard.tsx`)
  - [ ] 8x8 grid layout
  - [ ] Perspective prop (white/black)
  - [ ] FEN prop for position
  - [ ] Interactive prop
  - [ ] Selected square state
  - [ ] Legal moves display
  - [ ] onMove callback

- [ ] 6.5 Create move selection logic
  - [ ] Click piece to select
  - [ ] Click again to deselect
  - [ ] Click legal square to move
  - [ ] Handle pawn promotion (modal)

---

### WP7: Level 7 - Game View

**Objective:** Full game view with board, controls, and history.

#### Checklist

- [ ] 7.1 Create useMoves hook (`src/hooks/useMoves.ts`)
  - [ ] Fetch moves with GetMoves
  - [ ] Update after each move
  - [ ] Return moves and PGN

- [ ] 7.2 Create useGamePlay hook (`src/hooks/useGamePlay.ts`)
  - [ ] Combine useGame and useMoves
  - [ ] `makeMove(san)` method
  - [ ] Optimistic update with rollback
  - [ ] Track whose turn
  - [ ] Detect game over

- [ ] 7.3 Create MoveHistory component (`src/components/MoveHistory.tsx`)
  - [ ] List moves in pairs (1. e4 e5)
  - [ ] Highlight last move
  - [ ] Scrollable
  - [ ] PGN export button

- [ ] 7.4 Create PlayerCard (game view) (`src/components/GamePlayerCard.tsx`)
  - [ ] Player name and rating
  - [ ] Color indicator (white/black)
  - [ ] Turn indicator
  - [ ] Timer placeholder (future)

- [ ] 7.5 Create GameControls component (`src/components/GameControls.tsx`)
  - [ ] Resign button (with confirmation)
  - [ ] Offer draw button
  - [ ] Draw response banner

- [ ] 7.6 Create GameView page (`src/pages/GameView.tsx`)
  - [ ] Chess board
  - [ ] Player cards (top/bottom)
  - [ ] Move history sidebar
  - [ ] Game controls
  - [ ] Game over overlay

- [ ] 7.7 Create GameOverModal (`src/components/GameOverModal.tsx`)
  - [ ] Result display (win/loss/draw)
  - [ ] Termination type
  - [ ] Rating changes
  - [ ] "New Game" button
  - [ ] "Review Game" button

---

### WP8: Level 8 - Draw & Resign

**Objective:** Implement end-game actions.

#### Checklist

- [ ] 8.1 Create useDrawOffer hook (`src/hooks/useDrawOffer.ts`)
  - [ ] Track draw_offer_by from game state
  - [ ] `offerDraw()` method
  - [ ] `respondDraw(accept)` method
  - [ ] Clear offer on response

- [ ] 8.2 Create DrawBanner component (`src/components/DrawBanner.tsx`)
  - [ ] "Draw offered by opponent"
  - [ ] Accept/Decline buttons
  - [ ] Auto-dismiss on response

- [ ] 8.3 Implement resign flow
  - [ ] Confirmation dialog
  - [ ] Call Resign API
  - [ ] Show game over modal
  - [ ] Navigate to lobby

- [ ] 8.4 Implement draw flow
  - [ ] Offer draw button
  - [ ] Show pending offer state
  - [ ] Handle opponent response
  - [ ] Game over on acceptance

---

### WP9: Level 9 - Leaderboard

**Objective:** Display top players.

#### Checklist

- [ ] 9.1 Create useLeaderboard hook (`src/hooks/useLeaderboard.ts`)
  - [ ] Fetch with GetLeaderboard
  - [ ] Filter AI option
  - [ ] Pagination (optional)

- [ ] 9.2 Create LeaderboardRow component (`src/components/LeaderboardRow.tsx`)
  - [ ] Rank number
  - [ ] Player name
  - [ ] Rating
  - [ ] Games played
  - [ ] Win rate
  - [ ] AI badge

- [ ] 9.3 Create Leaderboard page (`src/pages/Leaderboard.tsx`)
  - [ ] Table of top players
  - [ ] Toggle AI filter
  - [ ] Click to view profile
  - [ ] Challenge button (optional)

- [ ] 9.4 Create LeaderboardPreview component (`src/components/LeaderboardPreview.tsx`)
  - [ ] Top 5 for lobby sidebar
  - [ ] "See all" link

---

### WP10: Polish & Error Handling

**Objective:** Production-ready polish.

#### Checklist

- [ ] 10.1 Create Toast system
  - [ ] Success/error/info variants
  - [ ] Auto-dismiss
  - [ ] Stack multiple toasts

- [ ] 10.2 Create error boundary
  - [ ] Catch React errors
  - [ ] Display fallback UI
  - [ ] Retry button

- [ ] 10.3 Create loading states
  - [ ] Skeleton components
  - [ ] Loading spinners
  - [ ] Progressive loading

- [ ] 10.4 Create empty states
  - [ ] No open games
  - [ ] No active games
  - [ ] No challengers

- [ ] 10.5 Handle network errors
  - [ ] Retry logic
  - [ ] Offline detection
  - [ ] Error messages

- [ ] 10.6 Responsive design pass
  - [ ] Mobile layout
  - [ ] Tablet layout
  - [ ] Touch targets

---

## File Structure

```
chestercn/
├── docs/
│   ├── frontend-spec.md
│   └── implementation-plan.md
├── src/
│   ├── index.tsx              # Bun server
│   ├── index.html
│   ├── index.css
│   ├── frontend.tsx           # React entry
│   ├── App.tsx                # Root component
│   ├── router.tsx             # Hash router
│   ├── contexts/
│   │   ├── IdentityContext.tsx
│   │   └── ChesterContext.tsx
│   ├── hooks/
│   │   ├── useChester.ts
│   │   ├── useProfile.ts
│   │   ├── useOpenGames.ts
│   │   ├── useMyGames.ts
│   │   ├── useGame.ts
│   │   ├── useChallengers.ts
│   │   ├── useJoinRequest.ts
│   │   ├── useMoves.ts
│   │   ├── useGamePlay.ts
│   │   ├── useDrawOffer.ts
│   │   └── useLeaderboard.ts
│   ├── pages/
│   │   ├── Welcome.tsx
│   │   ├── Lobby.tsx
│   │   ├── WaitingRoom.tsx
│   │   ├── PendingJoin.tsx
│   │   ├── GameView.tsx
│   │   ├── Profile.tsx
│   │   └── Leaderboard.tsx
│   ├── components/
│   │   ├── ui/                # ShadCN components
│   │   ├── chess/
│   │   │   ├── ChessBoard.tsx
│   │   │   ├── Square.tsx
│   │   │   └── Piece.tsx
│   │   ├── ProfileCard.tsx
│   │   ├── GameCard.tsx
│   │   ├── ActiveGameCard.tsx
│   │   ├── CreateGameModal.tsx
│   │   ├── ChallengerCard.tsx
│   │   ├── ShareableLink.tsx
│   │   ├── MoveHistory.tsx
│   │   ├── GamePlayerCard.tsx
│   │   ├── GameControls.tsx
│   │   ├── GameOverModal.tsx
│   │   ├── DrawBanner.tsx
│   │   ├── LeaderboardRow.tsx
│   │   └── LeaderboardPreview.tsx
│   ├── utils/
│   │   ├── keys.ts
│   │   ├── nip07.ts
│   │   └── chess.ts
│   ├── ctxcn/
│   │   └── ChestervmClient.ts  # Generated
│   └── lib/
│       └── utils.ts           # ShadCN utils
├── styles/
│   └── globals.css
├── package.json
├── tsconfig.json
└── build.ts
```

---

## Dependencies to Add

```bash
bun add chess.js @noble/secp256k1 @noble/hashes
```

---

## Execution Order

1. **WP1** - Identity & Welcome (foundation)
2. **WP2** - Registration & Profile
3. **WP3** - Lobby (game browser)
4. **WP4** - Game Creation
5. **WP5** - Joining Games
6. **WP6** - Chess Board (visual)
7. **WP7** - Game View (full gameplay)
8. **WP8** - Draw & Resign
9. **WP9** - Leaderboard
10. **WP10** - Polish

---

## Development Commands

```bash
# Start dev server
bun run dev

# Build for production
bun run build

# Run tests (when added)
bun test
```

---

## Notes

- All pubkeys displayed as npub, stored as hex
- ChestervmClient handles MCP transport
- Polling intervals are configurable
- Mobile-first responsive design
- Accessibility: keyboard navigation, ARIA labels

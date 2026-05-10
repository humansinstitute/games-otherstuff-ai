# Chester Frontend: Nostr-Native Chess Client

## Technical Specification v1.0

### Overview

Chester Frontend is a web-based chess client that connects to the Chester CVM backend over Nostr relays using MCP. Players authenticate with their Nostr identity, browse open games, challenge opponents, and play chess in real-time.

**Backend Spec:** [chestercvm/docs/chester-spec.md](../../chestercvm/docs/chester-spec.md)

### Design Principles

1. **Nostr-native identity** - Login with existing Nostr keys (NIP-07 extensions) or generate new keys locally
2. **Stateless client** - All game state lives on the CVM server; client is a thin UI layer
3. **Real-time feel** - Polling-based updates with smart intervals for active games
4. **Mobile-first** - Responsive design that works on phones
5. **Offline key management** - Private keys never leave the browser

---

## Tech Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Runtime | Bun | Fast dev server, native bundling |
| Framework | React 19 | Latest features, good DX |
| UI Components | ShadCN/ui | Pre-built, accessible, Tailwind-based |
| Styling | Tailwind CSS 4 | Utility-first, tree-shakeable |
| Chess Board | Custom or react-chessboard | Visual board rendering |
| State | React Context + useReducer | Simple, no external deps |
| Nostr Keys | @noble/secp256k1 | For key generation |
| Backend Client | ChestervmClient (generated) | MCP over Nostr |

---

## User Flows

### 1. Onboarding (First Visit)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  1. User visits chester.otherstuff.ai                       │
│                      │                                      │
│                      ▼                                      │
│  2. App detects no stored identity                          │
│     Shows welcome screen with options:                      │
│     [A] Connect with Nostr extension (NIP-07)               │
│     [B] Generate new keys                                   │
│     [C] Import nsec/hex key                                 │
│                      │                                      │
│              ┌───────┼───────┐                              │
│              ▼       ▼       ▼                              │
│           NIP-07   Generate  Import                         │
│              │       │       │                              │
│              └───────┴───────┘                              │
│                      │                                      │
│                      ▼                                      │
│  3. Store identity in localStorage (encrypted nsec or ref)  │
│                      │                                      │
│                      ▼                                      │
│  4. Call RegisterPlayer with pubkey                         │
│     (auto-creates player on backend)                        │
│                      │                                      │
│                      ▼                                      │
│  5. Redirect to lobby                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2. Game Lobby

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Lobby shows:                                               │
│  - User profile card (rating, W/L/D)                        │
│  - "Create Game" button                                     │
│  - Open games list (from ListOpenGames)                     │
│  - My active games (from GetMyGames status=active)          │
│  - Leaderboard (from GetLeaderboard)                        │
│                                                             │
│  Polling: every 10s for open games, 5s for active games     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3. Creating a Game

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  1. User clicks "Create Game"                               │
│                      │                                      │
│                      ▼                                      │
│  2. Modal: Select game type and color preference            │
│     - Type: Public / Private / AI                           │
│     - Color: White / Black / Random                         │
│                      │                                      │
│                      ▼                                      │
│  3. Call CreateGame(host_pubkey, type, color_preference)    │
│                      │                                      │
│                      ▼                                      │
│  4. Show "Waiting for opponent" screen                      │
│     - Share link (nostr:// or https://)                     │
│     - Challenger list (poll ListChallengers)                │
│                      │                                      │
│                      ▼                                      │
│  5. Host can Accept/Decline challengers                     │
│                      │                                      │
│                      ▼                                      │
│  6. On accept → Game starts → Navigate to game view         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4. Joining a Game

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  1. User clicks "Join" on an open game                      │
│                      │                                      │
│                      ▼                                      │
│  2. Call RequestJoin(game_id, requester_pubkey)             │
│                      │                                      │
│                      ▼                                      │
│  3. Show "Waiting for host to accept" state                 │
│     - Option to withdraw request                            │
│                      │                                      │
│                      ▼                                      │
│  4. Poll GetGame until status changes or request declined   │
│                      │                                      │
│              ┌───────┴───────┐                              │
│              ▼               ▼                              │
│         Accepted         Declined                           │
│              │               │                              │
│              ▼               ▼                              │
│      Navigate to game   Show notification, return to lobby  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5. Playing a Game

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Game View Components:                                      │
│  - Chess board (interactive when your turn)                 │
│  - Move history panel                                       │
│  - Player cards (both players with ratings)                 │
│  - Game controls (Resign, Offer Draw)                       │
│  - Draw offer banner (when offered)                         │
│                                                             │
│  Making a Move:                                             │
│  1. User drags piece or clicks squares                      │
│  2. Validate move locally (chess.js)                        │
│  3. Call MakeMove(game_id, player_pubkey, move)             │
│  4. Update board with server response                       │
│  5. Resume polling for opponent's move                      │
│                                                             │
│  Polling: 2s when it's opponent's turn                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Application State

### State Shape

```typescript
interface AppState {
  // Identity
  identity: {
    pubkey: string;          // hex
    privateKey: string | null; // hex (null if using NIP-07)
    displayName: string;
    useExtension: boolean;   // true if NIP-07
  } | null;

  // Player profile (from backend)
  profile: {
    pubkey: string;
    displayName: string;
    rating: number;
    ratingDeviation: number;
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
  } | null;

  // Current view
  view: 'welcome' | 'lobby' | 'game' | 'profile' | 'leaderboard';

  // Lobby data
  lobby: {
    openGames: Game[];
    myGames: Game[];
    loading: boolean;
  };

  // Active game (when in game view)
  activeGame: {
    game: Game;
    moves: Move[];
    selectedSquare: string | null;
    legalMoves: string[];
    pendingMove: boolean;
  } | null;
}
```

### Context Providers

```
<AppStateProvider>
  <IdentityProvider>      // Manages keys, NIP-07 integration
    <ChesterProvider>     // ChestervmClient instance
      <App />
    </ChesterProvider>
  </IdentityProvider>
</AppStateProvider>
```

---

## Component Hierarchy

```
App
├── WelcomeScreen
│   ├── LoginOptions
│   │   ├── NIP07Login
│   │   ├── GenerateKeys
│   │   └── ImportKey
│   └── KeyDisplay (for new keys)
│
├── Lobby
│   ├── ProfileCard
│   ├── CreateGameButton
│   ├── OpenGamesList
│   │   └── GameCard
│   ├── MyGamesList
│   │   └── ActiveGameCard
│   └── LeaderboardPreview
│
├── WaitingRoom (host waiting for challengers)
│   ├── ShareableLink
│   ├── ChallengerList
│   │   └── ChallengerCard (with Accept/Decline)
│   └── CancelGameButton
│
├── PendingJoin (challenger waiting for acceptance)
│   └── WithdrawButton
│
├── GameView
│   ├── ChessBoard
│   │   ├── Square
│   │   └── Piece
│   ├── PlayerCard (x2)
│   ├── MoveHistory
│   ├── GameControls
│   │   ├── ResignButton
│   │   ├── OfferDrawButton
│   │   └── DrawResponseBanner
│   └── GameOverModal
│
├── ProfilePage
│   ├── StatsCard
│   └── RecentGames
│
└── Leaderboard
    └── LeaderboardRow
```

---

## Page Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | WelcomeScreen or Lobby | Conditional on auth state |
| `/lobby` | Lobby | Game browser |
| `/game/:id` | GameView | Active game |
| `/game/:id/waiting` | WaitingRoom | Host waiting for challengers |
| `/profile` | ProfilePage | User's own profile |
| `/profile/:pubkey` | ProfilePage | View other player |
| `/leaderboard` | Leaderboard | Full leaderboard |

Note: Using hash routing (`/#/game/123`) for simplicity with Bun.serve.

---

## API Integration Patterns

### ChestervmClient Instance

```typescript
// src/contexts/ChesterContext.tsx
import { ChestervmClient } from '../ctxcn/ChestervmClient';

export function ChesterProvider({ children }) {
  const { identity } = useIdentity();

  const client = useMemo(() => {
    if (!identity) return null;
    return new ChestervmClient({
      privateKey: identity.privateKey,
      relays: ['wss://relay.contextvm.org'],
    });
  }, [identity?.privateKey]);

  return (
    <ChesterContext.Provider value={client}>
      {children}
    </ChesterContext.Provider>
  );
}
```

### Polling Hook

```typescript
// src/hooks/usePolling.ts
function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  enabled: boolean = true
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;
    const poll = async () => {
      try {
        const result = await fetcher();
        if (mounted) setData(result);
      } catch (e) {
        if (mounted) setError(e as Error);
      }
    };

    poll(); // Initial fetch
    const id = setInterval(poll, intervalMs);
    return () => { mounted = false; clearInterval(id); };
  }, [fetcher, intervalMs, enabled]);

  return { data, error };
}
```

---

## Identity Management

### Key Storage

Keys are stored in localStorage with the following structure:

```typescript
interface StoredIdentity {
  type: 'local' | 'extension';
  pubkey: string;           // hex
  encryptedNsec?: string;   // For local keys, encrypted with user password
  displayName?: string;
}
```

### NIP-07 Integration

```typescript
// src/utils/nip07.ts
export async function getNostrExtension(): Promise<{
  getPublicKey: () => Promise<string>;
  signEvent: (event: UnsignedEvent) => Promise<SignedEvent>;
} | null> {
  if (typeof window !== 'undefined' && window.nostr) {
    return window.nostr;
  }
  return null;
}

export async function loginWithExtension(): Promise<string> {
  const nostr = await getNostrExtension();
  if (!nostr) throw new Error('No Nostr extension found');
  return nostr.getPublicKey();
}
```

### Key Generation

```typescript
// src/utils/keys.ts
import { generateSecretKey, getPublicKey } from '@noble/secp256k1';
import { bytesToHex } from '@noble/hashes/utils';

export function generateKeyPair(): { privateKey: string; pubkey: string } {
  const sk = generateSecretKey();
  const pk = getPublicKey(sk);
  return {
    privateKey: bytesToHex(sk),
    pubkey: bytesToHex(pk),
  };
}
```

---

## Chess Board Implementation

### Option A: Custom Board (Recommended)

Build a simple board using Tailwind grid:

```tsx
// src/components/ChessBoard.tsx
function ChessBoard({ fen, onMove, perspective, interactive }) {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const game = new Chess(fen);

  const handleSquareClick = (square) => {
    if (!interactive) return;

    if (selectedSquare) {
      // Try to make move
      const move = game.move({ from: selectedSquare, to: square, promotion: 'q' });
      if (move) onMove(move.san);
      setSelectedSquare(null);
    } else {
      // Select piece
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(square);
      }
    }
  };

  return (
    <div className="grid grid-cols-8 aspect-square max-w-md">
      {squares.map((sq, i) => (
        <Square
          key={sq}
          square={sq}
          piece={game.get(sq)}
          selected={selectedSquare === sq}
          onClick={() => handleSquareClick(sq)}
        />
      ))}
    </div>
  );
}
```

### Piece Rendering

Use Unicode chess symbols or SVG sprites:

```typescript
const PIECE_SYMBOLS = {
  'wp': '♙', 'wn': '♘', 'wb': '♗', 'wr': '♖', 'wq': '♕', 'wk': '♔',
  'bp': '♟', 'bn': '♞', 'bb': '♝', 'br': '♜', 'bq': '♛', 'bk': '♚',
};
```

---

## Error Handling

### API Error Display

```typescript
const ERROR_MESSAGES = {
  'PLAYER_NOT_FOUND': 'Player not found. Please register first.',
  'GAME_NOT_FOUND': 'Game not found or has been deleted.',
  'GAME_NOT_OPEN': 'This game is no longer accepting players.',
  'GAME_NOT_ACTIVE': 'This game has ended.',
  'NOT_YOUR_TURN': "It's not your turn.",
  'INVALID_MOVE': 'That move is not allowed.',
  'NOT_IN_GAME': "You're not a participant in this game.",
  // ... etc
};
```

### Toast Notifications

Use ShadCN's toast component for user feedback:

```tsx
import { useToast } from '@/components/ui/use-toast';

function GameControls() {
  const { toast } = useToast();

  const handleResign = async () => {
    try {
      await client.Resign(gameId, pubkey);
      toast({ title: 'Game resigned', variant: 'destructive' });
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };
}
```

---

## Responsive Design

### Breakpoints

```
Mobile: < 640px  - Single column, board fills width
Tablet: 640-1024px - Two column, board + sidebar
Desktop: > 1024px - Three column, full layout
```

### Mobile Considerations

- Touch-friendly square size (min 44px)
- Bottom navigation bar
- Swipe to view move history
- Haptic feedback on moves (if available)

---

## Performance Optimizations

1. **Lazy load game view** - Only load chess.js when entering a game
2. **Memoize board rendering** - Only re-render changed squares
3. **Debounce polling** - Pause when tab is hidden
4. **Optimistic updates** - Show move immediately, rollback on error

---

## Future Enhancements

### v1.1 - Real-time Updates
- WebSocket subscriptions for game updates
- Push notifications for game invites

### v1.2 - Social Features
- Post game results to Nostr (kind 1)
- Share game links as Nostr events
- Follow players from leaderboard

### v1.3 - Analysis Mode
- Post-game analysis
- Engine evaluation display
- Move annotations

### v1.4 - Themes
- Dark/light mode
- Custom board themes
- Piece set selection

import { getDb } from "../db.js";
import { normalizeHex } from "../pubkey.js";
import { generateUUID, nowISO } from "../utils.js";
import { ChesterError, PLAYER_EXISTS, PLAYER_NOT_FOUND, INVALID_PUBKEY } from "../errors.js";

export interface Player {
  pubkey: string;
  display_name: string | null;
  is_ai: boolean;
  ai_personality: Record<string, unknown> | null;
  rating: number;
  rating_deviation: number;
  rating_volatility: number;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  created_at: string;
  last_seen_at: string;
}

export interface RecentGame {
  game_id: string;
  opponent_pubkey: string;
  result: "win" | "loss" | "draw";
  played_as: "white" | "black";
  ended_at: string;
}

interface RegisterPlayerParams {
  pubkey: string;
  displayName?: string;
  isAi?: boolean;
  aiPersonality?: Record<string, unknown>;
}

interface PlayerRow {
  pubkey: string;
  display_name: string | null;
  is_ai: number;
  ai_personality: string | null;
  rating: number;
  rating_deviation: number;
  rating_volatility: number;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  created_at: string;
  last_seen_at: string;
}

function rowToPlayer(row: PlayerRow): Player {
  return {
    pubkey: row.pubkey,
    display_name: row.display_name,
    is_ai: row.is_ai === 1,
    ai_personality: row.ai_personality ? JSON.parse(row.ai_personality) : null,
    rating: row.rating,
    rating_deviation: row.rating_deviation,
    rating_volatility: row.rating_volatility,
    games_played: row.games_played,
    wins: row.wins,
    losses: row.losses,
    draws: row.draws,
    created_at: row.created_at,
    last_seen_at: row.last_seen_at,
  };
}

/**
 * Register a new player
 */
export function registerPlayer(params: RegisterPlayerParams): Player {
  const db = getDb();
  const pubkey = normalizeHex(params.pubkey);

  // Check if player already exists
  const existing = db.query("SELECT pubkey FROM players WHERE pubkey = ?").get(pubkey);
  if (existing) {
    throw new ChesterError(PLAYER_EXISTS, `Player with pubkey ${pubkey} already exists`);
  }

  const aiPersonalityJson = params.aiPersonality ? JSON.stringify(params.aiPersonality) : null;

  db.run(
    `INSERT INTO players (pubkey, display_name, is_ai, ai_personality)
     VALUES (?, ?, ?, ?)`,
    [pubkey, params.displayName || null, params.isAi ? 1 : 0, aiPersonalityJson]
  );

  const row = db.query("SELECT * FROM players WHERE pubkey = ?").get(pubkey) as PlayerRow;
  return rowToPlayer(row);
}

/**
 * Get a player by pubkey
 */
export function getPlayer(pubkey: string): Player {
  const db = getDb();
  const normalizedPubkey = normalizeHex(pubkey);

  const row = db.query("SELECT * FROM players WHERE pubkey = ?").get(normalizedPubkey) as PlayerRow | null;
  if (!row) {
    throw new ChesterError(PLAYER_NOT_FOUND, `Player with pubkey ${normalizedPubkey} not found`);
  }

  return rowToPlayer(row);
}

/**
 * Get a player by pubkey, returning null if not found
 */
export function getPlayerOrNull(pubkey: string): Player | null {
  try {
    return getPlayer(pubkey);
  } catch (e) {
    if (e instanceof ChesterError && e.code === PLAYER_NOT_FOUND) {
      return null;
    }
    throw e;
  }
}

/**
 * Ensure a player exists, creating with defaults if not
 */
export function ensurePlayer(pubkey: string): Player {
  const existing = getPlayerOrNull(pubkey);
  if (existing) {
    return existing;
  }
  return registerPlayer({ pubkey });
}

/**
 * Get recent games for a player
 */
export function getRecentGames(pubkey: string, limit: number = 10): RecentGame[] {
  const db = getDb();
  const normalizedPubkey = normalizeHex(pubkey);

  const rows = db.query(`
    SELECT
      id as game_id,
      white_pubkey,
      black_pubkey,
      result,
      ended_at
    FROM games
    WHERE status = 'completed'
      AND (white_pubkey = ? OR black_pubkey = ?)
    ORDER BY ended_at DESC
    LIMIT ?
  `).all(normalizedPubkey, normalizedPubkey, limit) as Array<{
    game_id: string;
    white_pubkey: string;
    black_pubkey: string;
    result: string;
    ended_at: string;
  }>;

  return rows.map((row) => {
    const playedAs = row.white_pubkey === normalizedPubkey ? "white" : "black";
    const opponentPubkey = playedAs === "white" ? row.black_pubkey : row.white_pubkey;

    let result: "win" | "loss" | "draw";
    if (row.result === "draw") {
      result = "draw";
    } else if (row.result === playedAs) {
      result = "win";
    } else {
      result = "loss";
    }

    return {
      game_id: row.game_id,
      opponent_pubkey: opponentPubkey,
      result,
      played_as: playedAs,
      ended_at: row.ended_at,
    };
  });
}

/**
 * Get player profile with recent games
 */
export function getPlayerProfile(pubkey: string): Player & { recent_games: RecentGame[]; win_rate: number } {
  const player = getPlayer(pubkey);
  const recentGames = getRecentGames(pubkey);
  const winRate = player.games_played > 0 ? player.wins / player.games_played : 0;

  return {
    ...player,
    recent_games: recentGames,
    win_rate: Math.round(winRate * 100) / 100,
  };
}

/**
 * Get leaderboard
 */
export function getLeaderboard(params: { limit?: number; includeAi?: boolean } = {}): Array<{
  rank: number;
  pubkey: string;
  display_name: string | null;
  is_ai: boolean;
  rating: number;
  games_played: number;
  win_rate: number;
}> {
  const db = getDb();
  const limit = Math.min(params.limit || 20, 100);
  const includeAi = params.includeAi !== false;

  const aiFilter = includeAi ? "" : "WHERE is_ai = 0";

  const rows = db.query(`
    SELECT
      pubkey,
      display_name,
      is_ai,
      rating,
      games_played,
      wins
    FROM players
    ${aiFilter}
    ORDER BY rating DESC
    LIMIT ?
  `).all(limit) as Array<{
    pubkey: string;
    display_name: string | null;
    is_ai: number;
    rating: number;
    games_played: number;
    wins: number;
  }>;

  return rows.map((row, index) => ({
    rank: index + 1,
    pubkey: row.pubkey,
    display_name: row.display_name,
    is_ai: row.is_ai === 1,
    rating: row.rating,
    games_played: row.games_played,
    win_rate: row.games_played > 0 ? Math.round((row.wins / row.games_played) * 100) / 100 : 0,
  }));
}

/**
 * Update last_seen_at for a player
 */
export function updateLastSeen(pubkey: string): void {
  const db = getDb();
  const normalizedPubkey = normalizeHex(pubkey);
  db.run("UPDATE players SET last_seen_at = ? WHERE pubkey = ?", [nowISO(), normalizedPubkey]);
}

/**
 * Get games for a player (with optional status filter)
 */
export function getMyGames(params: {
  playerPubkey: string;
  statusFilter?: string;
  limit?: number;
}): Array<{
  id: string;
  type: string;
  status: string;
  opponent_pubkey: string | null;
  opponent_display_name: string | null;
  played_as: "white" | "black" | null;
  current_fen: string;
  result: string | null;
  is_my_turn: boolean;
  created_at: string;
  last_move_at: string | null;
}> {
  const db = getDb();
  const pubkey = normalizeHex(params.playerPubkey);
  const limit = Math.min(params.limit || 20, 100);

  let statusClause = "";
  const queryParams: (string | number)[] = [pubkey, pubkey];

  if (params.statusFilter) {
    statusClause = "AND g.status = ?";
    queryParams.push(params.statusFilter);
  }

  queryParams.push(limit);

  const rows = db.query(`
    SELECT
      g.id,
      g.type,
      g.status,
      g.white_pubkey,
      g.black_pubkey,
      g.current_fen,
      g.result,
      g.created_at,
      g.last_move_at,
      pw.display_name as white_display_name,
      pb.display_name as black_display_name
    FROM games g
    LEFT JOIN players pw ON g.white_pubkey = pw.pubkey
    LEFT JOIN players pb ON g.black_pubkey = pb.pubkey
    WHERE (g.white_pubkey = ? OR g.black_pubkey = ?)
    ${statusClause}
    ORDER BY
      CASE g.status
        WHEN 'active' THEN 0
        WHEN 'open' THEN 1
        ELSE 2
      END,
      g.last_move_at DESC NULLS LAST,
      g.created_at DESC
    LIMIT ?
  `).all(...queryParams) as Array<{
    id: string;
    type: string;
    status: string;
    white_pubkey: string | null;
    black_pubkey: string | null;
    current_fen: string;
    result: string | null;
    created_at: string;
    last_move_at: string | null;
    white_display_name: string | null;
    black_display_name: string | null;
  }>;

  return rows.map((row) => {
    let playedAs: "white" | "black" | null = null;
    let opponentPubkey: string | null = null;
    let opponentDisplayName: string | null = null;

    if (row.white_pubkey === pubkey) {
      playedAs = "white";
      opponentPubkey = row.black_pubkey;
      opponentDisplayName = row.black_display_name;
    } else if (row.black_pubkey === pubkey) {
      playedAs = "black";
      opponentPubkey = row.white_pubkey;
      opponentDisplayName = row.white_display_name;
    }

    // Determine if it's my turn from FEN
    const fenParts = row.current_fen.split(" ");
    const activeColor = fenParts[1]; // 'w' or 'b'
    const isMyTurn = row.status === "active" && (
      (activeColor === "w" && playedAs === "white") ||
      (activeColor === "b" && playedAs === "black")
    );

    return {
      id: row.id,
      type: row.type,
      status: row.status,
      opponent_pubkey: opponentPubkey,
      opponent_display_name: opponentDisplayName,
      played_as: playedAs,
      current_fen: row.current_fen,
      result: row.result,
      is_my_turn: isMyTurn,
      created_at: row.created_at,
      last_move_at: row.last_move_at,
    };
  });
}

import { getDb, STARTING_FEN } from "../db.js";
import { normalizeHex } from "../pubkey.js";
import { generateUUID, nowISO } from "../utils.js";
import { ChesterError, GAME_NOT_FOUND, PLAYER_NOT_FOUND, INVALID_COLOR_PREFERENCE } from "../errors.js";
import { ensurePlayer, getPlayerOrNull } from "./player-service.js";

export type GameType = "public" | "private" | "ai";
export type GameStatus = "open" | "active" | "completed" | "abandoned" | "cancelled";
export type ColorPreference = "white" | "black" | "random";

export interface Game {
  id: string;
  type: GameType;
  status: GameStatus;
  host_pubkey: string;
  host_color_preference: ColorPreference;
  white_pubkey: string | null;
  black_pubkey: string | null;
  current_fen: string;
  result: string | null;
  termination_type: string | null;
  opening_eco: string | null;
  draw_offer_by: string | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  last_move_at: string | null;
}

export interface GameWithPlayers extends Game {
  white?: {
    pubkey: string;
    display_name: string | null;
    rating: number;
  } | null;
  black?: {
    pubkey: string;
    display_name: string | null;
    rating: number;
  } | null;
  turn: "white" | "black";
  move_count: number;
}

interface GameRow {
  id: string;
  type: string;
  status: string;
  host_pubkey: string;
  host_color_preference: string;
  white_pubkey: string | null;
  black_pubkey: string | null;
  current_fen: string;
  result: string | null;
  termination_type: string | null;
  opening_eco: string | null;
  draw_offer_by: string | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  last_move_at: string | null;
}

function rowToGame(row: GameRow): Game {
  return {
    id: row.id,
    type: row.type as GameType,
    status: row.status as GameStatus,
    host_pubkey: row.host_pubkey,
    host_color_preference: row.host_color_preference as ColorPreference,
    white_pubkey: row.white_pubkey,
    black_pubkey: row.black_pubkey,
    current_fen: row.current_fen,
    result: row.result,
    termination_type: row.termination_type,
    opening_eco: row.opening_eco,
    draw_offer_by: row.draw_offer_by,
    created_at: row.created_at,
    started_at: row.started_at,
    ended_at: row.ended_at,
    last_move_at: row.last_move_at,
  };
}

function getTurnFromFen(fen: string): "white" | "black" {
  const parts = fen.split(" ");
  return parts[1] === "w" ? "white" : "black";
}

function getMoveCountFromFen(fen: string): number {
  const parts = fen.split(" ");
  return parseInt(parts[5] || "1", 10);
}

const VALID_COLOR_PREFERENCES = ["white", "black", "random"];

interface CreateGameParams {
  hostPubkey: string;
  type: GameType;
  colorPreference?: ColorPreference;
}

/**
 * Create a new game
 */
export function createGame(params: CreateGameParams): Game {
  const db = getDb();
  const hostPubkey = normalizeHex(params.hostPubkey);
  const colorPreference = params.colorPreference || "random";

  if (!VALID_COLOR_PREFERENCES.includes(colorPreference)) {
    throw new ChesterError(
      INVALID_COLOR_PREFERENCE,
      `Invalid color preference: ${colorPreference}. Must be one of: ${VALID_COLOR_PREFERENCES.join(", ")}`
    );
  }

  // Ensure host player exists
  ensurePlayer(hostPubkey);

  const gameId = generateUUID();

  db.run(
    `INSERT INTO games (id, type, host_pubkey, host_color_preference)
     VALUES (?, ?, ?, ?)`,
    [gameId, params.type, hostPubkey, colorPreference]
  );

  const row = db.query("SELECT * FROM games WHERE id = ?").get(gameId) as GameRow;
  return rowToGame(row);
}

/**
 * Get a game by ID
 */
export function getGame(gameId: string): Game {
  const db = getDb();

  const row = db.query("SELECT * FROM games WHERE id = ?").get(gameId) as GameRow | null;
  if (!row) {
    throw new ChesterError(GAME_NOT_FOUND, `Game with ID ${gameId} not found`);
  }

  return rowToGame(row);
}

/**
 * Get a game with full player info
 */
export function getGameWithPlayers(gameId: string): GameWithPlayers {
  const db = getDb();

  const row = db.query(`
    SELECT
      g.*,
      pw.display_name as white_display_name,
      pw.rating as white_rating,
      pb.display_name as black_display_name,
      pb.rating as black_rating
    FROM games g
    LEFT JOIN players pw ON g.white_pubkey = pw.pubkey
    LEFT JOIN players pb ON g.black_pubkey = pb.pubkey
    WHERE g.id = ?
  `).get(gameId) as (GameRow & {
    white_display_name: string | null;
    white_rating: number | null;
    black_display_name: string | null;
    black_rating: number | null;
  }) | null;

  if (!row) {
    throw new ChesterError(GAME_NOT_FOUND, `Game with ID ${gameId} not found`);
  }

  const game = rowToGame(row);

  return {
    ...game,
    white: row.white_pubkey ? {
      pubkey: row.white_pubkey,
      display_name: row.white_display_name,
      rating: row.white_rating || 1500,
    } : null,
    black: row.black_pubkey ? {
      pubkey: row.black_pubkey,
      display_name: row.black_display_name,
      rating: row.black_rating || 1500,
    } : null,
    turn: getTurnFromFen(game.current_fen),
    move_count: getMoveCountFromFen(game.current_fen),
  };
}

/**
 * List open games
 */
export function listOpenGames(params: { limit?: number; excludeAiHosts?: boolean } = {}): Array<{
  id: string;
  host_pubkey: string;
  host_display_name: string | null;
  host_rating: number;
  type: GameType;
  host_color_preference: ColorPreference;
  created_at: string;
  challenger_count: number;
}> {
  const db = getDb();
  const limit = Math.min(params.limit || 20, 100);

  const aiFilter = params.excludeAiHosts ? "AND p.is_ai = 0" : "";

  const rows = db.query(`
    SELECT
      g.id,
      g.host_pubkey,
      p.display_name as host_display_name,
      p.rating as host_rating,
      g.type,
      g.host_color_preference,
      g.created_at,
      (SELECT COUNT(*) FROM game_requests gr WHERE gr.game_id = g.id AND gr.status = 'pending') as challenger_count
    FROM games g
    JOIN players p ON g.host_pubkey = p.pubkey
    WHERE g.status = 'open' AND g.type = 'public'
    ${aiFilter}
    ORDER BY g.created_at DESC
    LIMIT ?
  `).all(limit) as Array<{
    id: string;
    host_pubkey: string;
    host_display_name: string | null;
    host_rating: number;
    type: string;
    host_color_preference: string;
    created_at: string;
    challenger_count: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    host_pubkey: row.host_pubkey,
    host_display_name: row.host_display_name,
    host_rating: row.host_rating,
    type: row.type as GameType,
    host_color_preference: row.host_color_preference as ColorPreference,
    created_at: row.created_at,
    challenger_count: row.challenger_count,
  }));
}

/**
 * Update game status
 */
export function updateGameStatus(gameId: string, status: GameStatus): void {
  const db = getDb();
  db.run("UPDATE games SET status = ? WHERE id = ?", [status, gameId]);
}

/**
 * Get moves for a game
 */
export function getMoves(gameId: string): {
  game_id: string;
  moves: Array<{
    move_number: number;
    white: { san: string; uci: string; timestamp: string } | null;
    black: { san: string; uci: string; timestamp: string } | null;
  }>;
  pgn: string;
} {
  const db = getDb();

  // Verify game exists
  getGame(gameId);

  const rows = db.query(`
    SELECT move_number, color, san, uci, created_at
    FROM moves
    WHERE game_id = ?
    ORDER BY ply_number ASC
  `).all(gameId) as Array<{
    move_number: number;
    color: string;
    san: string;
    uci: string;
    created_at: string;
  }>;

  // Group moves by move_number
  const moveMap = new Map<number, {
    white: { san: string; uci: string; timestamp: string } | null;
    black: { san: string; uci: string; timestamp: string } | null;
  }>();

  for (const row of rows) {
    if (!moveMap.has(row.move_number)) {
      moveMap.set(row.move_number, { white: null, black: null });
    }
    const entry = moveMap.get(row.move_number)!;
    const moveData = { san: row.san, uci: row.uci, timestamp: row.created_at };
    if (row.color === "white") {
      entry.white = moveData;
    } else {
      entry.black = moveData;
    }
  }

  const moves = Array.from(moveMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([move_number, data]) => ({
      move_number,
      white: data.white,
      black: data.black,
    }));

  // Generate PGN
  const pgnParts: string[] = [];
  for (const move of moves) {
    let movePgn = `${move.move_number}.`;
    if (move.white) {
      movePgn += ` ${move.white.san}`;
    }
    if (move.black) {
      movePgn += ` ${move.black.san}`;
    }
    pgnParts.push(movePgn);
  }

  return {
    game_id: gameId,
    moves,
    pgn: pgnParts.join(" "),
  };
}

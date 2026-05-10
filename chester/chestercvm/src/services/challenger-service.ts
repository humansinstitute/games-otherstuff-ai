import { getDb, STARTING_FEN } from "../db.js";
import { normalizeHex } from "../pubkey.js";
import { generateUUID, nowISO } from "../utils.js";
import {
  ChesterError,
  GAME_NOT_FOUND,
  GAME_NOT_OPEN,
  REQUEST_NOT_FOUND,
  ALREADY_REQUESTED,
  CANNOT_JOIN_OWN_GAME,
  NOT_HOST,
  PLAYER_NOT_FOUND,
} from "../errors.js";
import { getGame, type ColorPreference } from "./game-service.js";
import { ensurePlayer, getPlayerOrNull } from "./player-service.js";

interface RequestJoinParams {
  gameId: string;
  requesterPubkey: string;
}

interface ChallengerInfo {
  request_id: string;
  pubkey: string;
  display_name: string | null;
  is_ai: boolean;
  rating: number;
  games_played: number;
  win_rate: number;
  requested_at: string;
}

/**
 * Request to join a game
 */
export function requestJoin(params: RequestJoinParams): { request_id: string; status: string } {
  const db = getDb();
  const requesterPubkey = normalizeHex(params.requesterPubkey);

  // Verify game exists and is open
  const game = getGame(params.gameId);
  if (game.status !== "open") {
    throw new ChesterError(GAME_NOT_OPEN, `Game ${params.gameId} is not open for joining`);
  }

  // Prevent host from joining own game
  if (game.host_pubkey === requesterPubkey) {
    throw new ChesterError(CANNOT_JOIN_OWN_GAME, "You cannot join your own game");
  }

  // Ensure requester player exists
  ensurePlayer(requesterPubkey);

  // Check for existing pending request (unique index will also catch this, but better error message)
  const existing = db.query(`
    SELECT id FROM game_requests
    WHERE game_id = ? AND requester_pubkey = ? AND status = 'pending'
  `).get(params.gameId, requesterPubkey);

  if (existing) {
    throw new ChesterError(ALREADY_REQUESTED, "You already have a pending request for this game");
  }

  const requestId = generateUUID();

  db.run(
    `INSERT INTO game_requests (id, game_id, requester_pubkey) VALUES (?, ?, ?)`,
    [requestId, params.gameId, requesterPubkey]
  );

  return { request_id: requestId, status: "pending" };
}

/**
 * Withdraw a join request
 */
export function withdrawRequest(params: { gameId: string; requesterPubkey: string }): void {
  const db = getDb();
  const requesterPubkey = normalizeHex(params.requesterPubkey);

  const result = db.run(
    `UPDATE game_requests
     SET status = 'withdrawn', resolved_at = ?
     WHERE game_id = ? AND requester_pubkey = ? AND status = 'pending'`,
    [nowISO(), params.gameId, requesterPubkey]
  );

  if (result.changes === 0) {
    throw new ChesterError(REQUEST_NOT_FOUND, "No pending request found for this game");
  }
}

/**
 * List challengers for a game
 */
export function listChallengers(gameId: string): ChallengerInfo[] {
  const db = getDb();

  // Verify game exists
  getGame(gameId);

  const rows = db.query(`
    SELECT
      gr.id as request_id,
      gr.requester_pubkey as pubkey,
      p.display_name,
      p.is_ai,
      p.rating,
      p.games_played,
      p.wins,
      gr.created_at as requested_at
    FROM game_requests gr
    JOIN players p ON gr.requester_pubkey = p.pubkey
    WHERE gr.game_id = ? AND gr.status = 'pending'
    ORDER BY gr.created_at ASC
  `).all(gameId) as Array<{
    request_id: string;
    pubkey: string;
    display_name: string | null;
    is_ai: number;
    rating: number;
    games_played: number;
    wins: number;
    requested_at: string;
  }>;

  return rows.map((row) => ({
    request_id: row.request_id,
    pubkey: row.pubkey,
    display_name: row.display_name,
    is_ai: row.is_ai === 1,
    rating: row.rating,
    games_played: row.games_played,
    win_rate: row.games_played > 0 ? Math.round((row.wins / row.games_played) * 100) / 100 : 0,
    requested_at: row.requested_at,
  }));
}

/**
 * Decline all pending requests for a game
 */
export function declineAllPending(gameId: string): void {
  const db = getDb();
  db.run(
    `UPDATE game_requests
     SET status = 'declined', resolved_at = ?
     WHERE game_id = ? AND status = 'pending'`,
    [nowISO(), gameId]
  );
}

/**
 * Accept a challenger and start the game
 */
export function acceptChallenger(params: {
  gameId: string;
  hostPubkey: string;
  challengerPubkey: string;
}): {
  id: string;
  status: string;
  white_pubkey: string;
  black_pubkey: string;
  current_fen: string;
  turn: "white";
  started_at: string;
} {
  const db = getDb();
  const hostPubkey = normalizeHex(params.hostPubkey);
  const challengerPubkey = normalizeHex(params.challengerPubkey);

  // Get game and verify host
  const game = getGame(params.gameId);

  if (game.host_pubkey !== hostPubkey) {
    throw new ChesterError(NOT_HOST, "Only the game host can accept challengers");
  }

  if (game.status !== "open") {
    throw new ChesterError(GAME_NOT_OPEN, "Game is not open for accepting challengers");
  }

  // Verify challenger has a pending request
  const request = db.query(`
    SELECT id FROM game_requests
    WHERE game_id = ? AND requester_pubkey = ? AND status = 'pending'
  `).get(params.gameId, challengerPubkey) as { id: string } | null;

  if (!request) {
    throw new ChesterError(REQUEST_NOT_FOUND, "Challenger has not requested to join this game");
  }

  // Determine colors
  let whitePubkey: string;
  let blackPubkey: string;

  if (game.host_color_preference === "white") {
    whitePubkey = hostPubkey;
    blackPubkey = challengerPubkey;
  } else if (game.host_color_preference === "black") {
    whitePubkey = challengerPubkey;
    blackPubkey = hostPubkey;
  } else {
    // Random
    if (Math.random() < 0.5) {
      whitePubkey = hostPubkey;
      blackPubkey = challengerPubkey;
    } else {
      whitePubkey = challengerPubkey;
      blackPubkey = hostPubkey;
    }
  }

  const now = nowISO();

  // Update game
  db.run(
    `UPDATE games
     SET status = 'active',
         white_pubkey = ?,
         black_pubkey = ?,
         current_fen = ?,
         started_at = ?
     WHERE id = ?`,
    [whitePubkey, blackPubkey, STARTING_FEN, now, params.gameId]
  );

  // Accept the challenger's request
  db.run(
    `UPDATE game_requests
     SET status = 'accepted', resolved_at = ?
     WHERE id = ?`,
    [now, request.id]
  );

  // Decline all other pending requests
  db.run(
    `UPDATE game_requests
     SET status = 'declined', resolved_at = ?
     WHERE game_id = ? AND status = 'pending'`,
    [now, params.gameId]
  );

  return {
    id: params.gameId,
    status: "active",
    white_pubkey: whitePubkey,
    black_pubkey: blackPubkey,
    current_fen: STARTING_FEN,
    turn: "white",
    started_at: now,
  };
}

/**
 * Decline a specific challenger
 */
export function declineChallenger(params: {
  gameId: string;
  hostPubkey: string;
  challengerPubkey: string;
}): void {
  const db = getDb();
  const hostPubkey = normalizeHex(params.hostPubkey);
  const challengerPubkey = normalizeHex(params.challengerPubkey);

  // Get game and verify host
  const game = getGame(params.gameId);

  if (game.host_pubkey !== hostPubkey) {
    throw new ChesterError(NOT_HOST, "Only the game host can decline challengers");
  }

  const result = db.run(
    `UPDATE game_requests
     SET status = 'declined', resolved_at = ?
     WHERE game_id = ? AND requester_pubkey = ? AND status = 'pending'`,
    [nowISO(), params.gameId, challengerPubkey]
  );

  if (result.changes === 0) {
    throw new ChesterError(REQUEST_NOT_FOUND, "Challenger has not requested to join this game");
  }
}

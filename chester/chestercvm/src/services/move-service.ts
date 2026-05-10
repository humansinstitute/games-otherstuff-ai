import { getDb } from "../db.js";
import { normalizeHex } from "../pubkey.js";
import { generateUUID, nowISO } from "../utils.js";
import {
  ChesterError,
  GAME_NOT_FOUND,
  GAME_NOT_ACTIVE,
  NOT_IN_GAME,
  NOT_YOUR_TURN,
  INVALID_MOVE,
  DRAW_ALREADY_OFFERED,
  NO_DRAW_OFFER,
  CANNOT_RESPOND_OWN_OFFER,
} from "../errors.js";
import { getGame, type Game } from "./game-service.js";
import {
  validateMove,
  isGameOver,
  getTurn,
  isCheck,
  getMoveNumber,
} from "./chess-engine.js";

export interface MakeMoveResult {
  current_fen: string;
  turn: "white" | "black";
  move_count: number;
  last_move: {
    san: string;
    uci: string;
  };
  status: string;
  check: boolean;
  game_over: boolean;
  result?: string;
  termination_type?: string;
  rating_changes?: {
    white: { old: number; new: number };
    black: { old: number; new: number };
  };
}

/**
 * Finalize a game (update status, ratings, stats)
 */
function finalizeGame(params: {
  gameId: string;
  result: "white" | "black" | "draw";
  terminationType: string;
}): { white: { old: number; new: number }; black: { old: number; new: number } } {
  const db = getDb();
  const now = nowISO();

  // Get game to find players
  const game = getGame(params.gameId);

  // Get player ratings
  const whitePl = db.query("SELECT rating FROM players WHERE pubkey = ?").get(game.white_pubkey) as { rating: number } | null;
  const blackPl = db.query("SELECT rating FROM players WHERE pubkey = ?").get(game.black_pubkey) as { rating: number } | null;

  const whiteOldRating = whitePl?.rating || 1500;
  const blackOldRating = blackPl?.rating || 1500;

  // Simple rating change calculation (placeholder for Glicko-2 in WP8)
  // For now, use a simple K-factor system
  const K = 32;
  const expectedWhite = 1 / (1 + Math.pow(10, (blackOldRating - whiteOldRating) / 400));
  const expectedBlack = 1 - expectedWhite;

  let actualWhite: number;
  let actualBlack: number;

  if (params.result === "white") {
    actualWhite = 1;
    actualBlack = 0;
  } else if (params.result === "black") {
    actualWhite = 0;
    actualBlack = 1;
  } else {
    actualWhite = 0.5;
    actualBlack = 0.5;
  }

  const whiteNewRating = Math.round(whiteOldRating + K * (actualWhite - expectedWhite));
  const blackNewRating = Math.round(blackOldRating + K * (actualBlack - expectedBlack));

  // Update game
  db.run(
    `UPDATE games
     SET status = 'completed', result = ?, termination_type = ?, ended_at = ?
     WHERE id = ?`,
    [params.result, params.terminationType, now, params.gameId]
  );

  // Update player stats and ratings
  if (game.white_pubkey) {
    const whiteWin = params.result === "white" ? 1 : 0;
    const whiteLoss = params.result === "black" ? 1 : 0;
    const whiteDraw = params.result === "draw" ? 1 : 0;

    db.run(
      `UPDATE players
       SET rating = ?, games_played = games_played + 1,
           wins = wins + ?, losses = losses + ?, draws = draws + ?,
           last_seen_at = ?
       WHERE pubkey = ?`,
      [whiteNewRating, whiteWin, whiteLoss, whiteDraw, now, game.white_pubkey]
    );
  }

  if (game.black_pubkey) {
    const blackWin = params.result === "black" ? 1 : 0;
    const blackLoss = params.result === "white" ? 1 : 0;
    const blackDraw = params.result === "draw" ? 1 : 0;

    db.run(
      `UPDATE players
       SET rating = ?, games_played = games_played + 1,
           wins = wins + ?, losses = losses + ?, draws = draws + ?,
           last_seen_at = ?
       WHERE pubkey = ?`,
      [blackNewRating, blackWin, blackLoss, blackDraw, now, game.black_pubkey]
    );
  }

  return {
    white: { old: whiteOldRating, new: whiteNewRating },
    black: { old: blackOldRating, new: blackNewRating },
  };
}

/**
 * Make a move in a game
 */
export function makeMove(params: {
  gameId: string;
  playerPubkey: string;
  move: string;
}): MakeMoveResult {
  const db = getDb();
  const playerPubkey = normalizeHex(params.playerPubkey);

  // Get game
  const game = getGame(params.gameId);

  // Verify game is active
  if (game.status !== "active") {
    throw new ChesterError(GAME_NOT_ACTIVE, "Game is not active");
  }

  // Verify player is in the game
  const playerColor = game.white_pubkey === playerPubkey ? "white" :
                      game.black_pubkey === playerPubkey ? "black" : null;

  if (!playerColor) {
    throw new ChesterError(NOT_IN_GAME, "You are not a participant in this game");
  }

  // Verify it's player's turn
  const currentTurn = getTurn(game.current_fen);
  if (currentTurn !== playerColor) {
    throw new ChesterError(NOT_YOUR_TURN, `It is ${currentTurn}'s turn`);
  }

  // Validate and execute move
  const moveResult = validateMove(game.current_fen, params.move);
  if (!moveResult.valid) {
    throw new ChesterError(INVALID_MOVE, moveResult.error);
  }

  const now = nowISO();
  const moveNumber = getMoveNumber(game.current_fen);

  // Calculate ply number (moves made so far + 1)
  const existingPlyCount = db.query(
    "SELECT COUNT(*) as count FROM moves WHERE game_id = ?"
  ).get(params.gameId) as { count: number };
  const plyNumber = existingPlyCount.count + 1;

  // Insert move record
  const moveId = generateUUID();
  db.run(
    `INSERT INTO moves (id, game_id, move_number, ply_number, color, player_pubkey, san, uci, fen_after)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [moveId, params.gameId, moveNumber, plyNumber, playerColor, playerPubkey, moveResult.san, moveResult.uci, moveResult.fenAfter]
  );

  // Update game FEN and last_move_at, clear draw offer
  db.run(
    `UPDATE games SET current_fen = ?, last_move_at = ?, draw_offer_by = NULL WHERE id = ?`,
    [moveResult.fenAfter, now, params.gameId]
  );

  // Check for game over
  const gameOverCheck = isGameOver(moveResult.fenAfter);
  const newTurn = getTurn(moveResult.fenAfter);
  const newMoveCount = getMoveNumber(moveResult.fenAfter);
  const inCheck = isCheck(moveResult.fenAfter);

  const result: MakeMoveResult = {
    current_fen: moveResult.fenAfter,
    turn: newTurn,
    move_count: newMoveCount,
    last_move: {
      san: moveResult.san,
      uci: moveResult.uci,
    },
    status: "active",
    check: inCheck,
    game_over: false,
  };

  if (gameOverCheck.over) {
    const ratingChanges = finalizeGame({
      gameId: params.gameId,
      result: gameOverCheck.result,
      terminationType: gameOverCheck.termination,
    });

    result.status = "completed";
    result.game_over = true;
    result.result = gameOverCheck.result;
    result.termination_type = gameOverCheck.termination;
    result.rating_changes = ratingChanges;
  }

  return result;
}

/**
 * Resign from a game
 */
export function resign(params: {
  gameId: string;
  playerPubkey: string;
}): {
  status: string;
  result: string;
  termination_type: string;
  rating_changes: { white: { old: number; new: number }; black: { old: number; new: number } };
} {
  const db = getDb();
  const playerPubkey = normalizeHex(params.playerPubkey);

  // Get game
  const game = getGame(params.gameId);

  // Verify game is active
  if (game.status !== "active") {
    throw new ChesterError(GAME_NOT_ACTIVE, "Game is not active");
  }

  // Verify player is in the game
  const playerColor = game.white_pubkey === playerPubkey ? "white" :
                      game.black_pubkey === playerPubkey ? "black" : null;

  if (!playerColor) {
    throw new ChesterError(NOT_IN_GAME, "You are not a participant in this game");
  }

  // The opponent wins
  const winner = playerColor === "white" ? "black" : "white";

  const ratingChanges = finalizeGame({
    gameId: params.gameId,
    result: winner,
    terminationType: "resignation",
  });

  return {
    status: "completed",
    result: winner,
    termination_type: "resignation",
    rating_changes: ratingChanges,
  };
}

/**
 * Offer a draw
 */
export function offerDraw(params: {
  gameId: string;
  playerPubkey: string;
}): { draw_offer_by: string } {
  const db = getDb();
  const playerPubkey = normalizeHex(params.playerPubkey);

  // Get game
  const game = getGame(params.gameId);

  // Verify game is active
  if (game.status !== "active") {
    throw new ChesterError(GAME_NOT_ACTIVE, "Game is not active");
  }

  // Verify player is in the game
  if (game.white_pubkey !== playerPubkey && game.black_pubkey !== playerPubkey) {
    throw new ChesterError(NOT_IN_GAME, "You are not a participant in this game");
  }

  // Check if draw already offered
  if (game.draw_offer_by) {
    throw new ChesterError(DRAW_ALREADY_OFFERED, "There is already a pending draw offer");
  }

  // Set draw offer
  db.run("UPDATE games SET draw_offer_by = ? WHERE id = ?", [playerPubkey, params.gameId]);

  return { draw_offer_by: playerPubkey };
}

/**
 * Respond to a draw offer
 */
export function respondDraw(params: {
  gameId: string;
  playerPubkey: string;
  accept: boolean;
}): {
  draw_offer_by: string | null;
  game?: {
    status: string;
    result: string;
    termination_type: string;
    rating_changes: { white: { old: number; new: number }; black: { old: number; new: number } };
  };
} {
  const db = getDb();
  const playerPubkey = normalizeHex(params.playerPubkey);

  // Get game
  const game = getGame(params.gameId);

  // Verify game is active
  if (game.status !== "active") {
    throw new ChesterError(GAME_NOT_ACTIVE, "Game is not active");
  }

  // Verify player is in the game
  if (game.white_pubkey !== playerPubkey && game.black_pubkey !== playerPubkey) {
    throw new ChesterError(NOT_IN_GAME, "You are not a participant in this game");
  }

  // Check if there's a draw offer
  if (!game.draw_offer_by) {
    throw new ChesterError(NO_DRAW_OFFER, "There is no pending draw offer");
  }

  // Can't respond to your own offer
  if (game.draw_offer_by === playerPubkey) {
    throw new ChesterError(CANNOT_RESPOND_OWN_OFFER, "You cannot respond to your own draw offer");
  }

  if (params.accept) {
    // Accept draw
    const ratingChanges = finalizeGame({
      gameId: params.gameId,
      result: "draw",
      terminationType: "draw_agreement",
    });

    return {
      draw_offer_by: null,
      game: {
        status: "completed",
        result: "draw",
        termination_type: "draw_agreement",
        rating_changes: ratingChanges,
      },
    };
  } else {
    // Decline draw
    db.run("UPDATE games SET draw_offer_by = NULL WHERE id = ?", [params.gameId]);
    return { draw_offer_by: null };
  }
}

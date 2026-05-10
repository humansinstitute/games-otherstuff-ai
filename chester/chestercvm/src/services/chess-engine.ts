import { Chess } from "chess.js";

export interface MoveValidationResult {
  valid: true;
  san: string;
  uci: string;
  fenAfter: string;
}

export interface MoveValidationError {
  valid: false;
  error: string;
}

export type ValidateMoveResult = MoveValidationResult | MoveValidationError;

export interface GameOverResult {
  over: true;
  result: "white" | "black" | "draw";
  termination: string;
}

export interface GameNotOver {
  over: false;
}

export type GameOverCheck = GameOverResult | GameNotOver;

/**
 * Validate a move and return the result
 * Accepts both SAN (e.g., "Nf3") and UCI (e.g., "g1f3") formats
 */
export function validateMove(fen: string, move: string): ValidateMoveResult {
  try {
    const chess = new Chess(fen);

    // Try the move - chess.js accepts both SAN and UCI
    const result = chess.move(move);

    if (!result) {
      return { valid: false, error: `Invalid move: ${move}` };
    }

    // Convert to UCI format (from + to + promotion)
    let uci = result.from + result.to;
    if (result.promotion) {
      uci += result.promotion;
    }

    return {
      valid: true,
      san: result.san,
      uci,
      fenAfter: chess.fen(),
    };
  } catch (e) {
    return { valid: false, error: `Invalid move: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/**
 * Check if the game is over and why
 */
export function isGameOver(fen: string): GameOverCheck {
  try {
    const chess = new Chess(fen);

    if (!chess.isGameOver()) {
      return { over: false };
    }

    if (chess.isCheckmate()) {
      // The player whose turn it is has been checkmated, so the other player wins
      const winner = chess.turn() === "w" ? "black" : "white";
      return { over: true, result: winner, termination: "checkmate" };
    }

    if (chess.isStalemate()) {
      return { over: true, result: "draw", termination: "stalemate" };
    }

    if (chess.isThreefoldRepetition()) {
      return { over: true, result: "draw", termination: "threefold_repetition" };
    }

    if (chess.isDraw()) {
      // Check specific draw conditions
      if (chess.isInsufficientMaterial()) {
        return { over: true, result: "draw", termination: "insufficient_material" };
      }
      // Fifty move rule is handled by isDraw when halfmove clock >= 100
      const parts = fen.split(" ");
      const halfmoveClock = parseInt(parts[4] || "0", 10);
      if (halfmoveClock >= 100) {
        return { over: true, result: "draw", termination: "fifty_move_rule" };
      }
      // Generic draw
      return { over: true, result: "draw", termination: "draw" };
    }

    // Shouldn't reach here, but just in case
    return { over: false };
  } catch (e) {
    // Invalid FEN or other error
    return { over: false };
  }
}

/**
 * Get whose turn it is from FEN
 */
export function getTurn(fen: string): "white" | "black" {
  const parts = fen.split(" ");
  return parts[1] === "w" ? "white" : "black";
}

/**
 * Check if the current position is in check
 */
export function isCheck(fen: string): boolean {
  try {
    const chess = new Chess(fen);
    return chess.isCheck();
  } catch (e) {
    return false;
  }
}

/**
 * Get the full move number from FEN
 */
export function getMoveNumber(fen: string): number {
  const parts = fen.split(" ");
  return parseInt(parts[5] || "1", 10);
}

/**
 * Calculate ply number from FEN
 * Ply 1 = White's first move, Ply 2 = Black's first move, etc.
 */
export function getPlyNumber(fen: string): number {
  const parts = fen.split(" ");
  const fullMoveNumber = parseInt(parts[5] || "1", 10);
  const turn = parts[1]; // 'w' or 'b'

  // Before any moves: fullmove=1, turn=w -> ply 0 (no moves made yet)
  // After 1. e4: fullmove=1, turn=b -> ply 1
  // After 1... e5: fullmove=2, turn=w -> ply 2
  if (turn === "w") {
    return (fullMoveNumber - 1) * 2;
  } else {
    return (fullMoveNumber - 1) * 2 + 1;
  }
}

/**
 * Get legal moves from a position
 */
export function getLegalMoves(fen: string): string[] {
  try {
    const chess = new Chess(fen);
    return chess.moves();
  } catch (e) {
    return [];
  }
}

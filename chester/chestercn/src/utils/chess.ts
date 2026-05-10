import { Chess } from "chess.js";

export type PieceColor = "w" | "b";
export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";

export interface Piece {
  type: PieceType;
  color: PieceColor;
}

export interface Square {
  file: number; // 0-7 (a-h)
  rank: number; // 0-7 (1-8)
  name: string; // e.g., "e4"
  color: "light" | "dark";
  piece: Piece | null;
}

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["1", "2", "3", "4", "5", "6", "7", "8"];

/**
 * Convert file/rank indices to square name
 */
export function coordsToSquare(file: number, rank: number): string {
  return `${FILES[file]}${RANKS[rank]}`;
}

/**
 * Convert square name to file/rank indices
 */
export function squareToCoords(square: string): { file: number; rank: number } {
  return {
    file: FILES.indexOf(square[0]),
    rank: RANKS.indexOf(square[1]),
  };
}

/**
 * Get square color (light or dark)
 */
export function getSquareColor(file: number, rank: number): "light" | "dark" {
  return (file + rank) % 2 === 0 ? "dark" : "light";
}

/**
 * Parse FEN and return board state as 2D array
 */
export function fenToBoard(fen: string): Square[][] {
  const chess = new Chess(fen);
  const board: Square[][] = [];

  for (let rank = 7; rank >= 0; rank--) {
    const row: Square[] = [];
    for (let file = 0; file < 8; file++) {
      const squareName = coordsToSquare(file, rank);
      const piece = chess.get(squareName as any);

      row.push({
        file,
        rank,
        name: squareName,
        color: getSquareColor(file, rank),
        piece: piece ? { type: piece.type, color: piece.color } : null,
      });
    }
    board.push(row);
  }

  return board;
}

/**
 * Get legal moves for a piece at the given square
 */
export function getLegalMoves(fen: string, square: string): string[] {
  const chess = new Chess(fen);
  const moves = chess.moves({ square: square as any, verbose: true });
  return moves.map((m) => m.to);
}

/**
 * Check if a move is legal
 */
export function isLegalMove(fen: string, from: string, to: string): boolean {
  const chess = new Chess(fen);
  try {
    const move = chess.move({ from: from as any, to: to as any, promotion: "q" });
    return move !== null;
  } catch {
    return false;
  }
}

/**
 * Get whose turn it is from FEN
 */
export function getTurn(fen: string): "white" | "black" {
  const parts = fen.split(" ");
  return parts[1] === "b" ? "black" : "white";
}

/**
 * Check if the current player is in check
 */
export function isInCheck(fen: string): boolean {
  const chess = new Chess(fen);
  return chess.isCheck();
}

/**
 * Check if the game is over
 */
export function isGameOver(fen: string): {
  over: boolean;
  result?: "white" | "black" | "draw";
  reason?: string;
} {
  const chess = new Chess(fen);

  if (chess.isCheckmate()) {
    const winner = chess.turn() === "w" ? "black" : "white";
    return { over: true, result: winner, reason: "checkmate" };
  }

  if (chess.isStalemate()) {
    return { over: true, result: "draw", reason: "stalemate" };
  }

  if (chess.isThreefoldRepetition()) {
    return { over: true, result: "draw", reason: "threefold repetition" };
  }

  if (chess.isDraw()) {
    return { over: true, result: "draw", reason: "draw" };
  }

  return { over: false };
}

/**
 * Unicode piece symbols
 */
export const PIECE_SYMBOLS: Record<string, string> = {
  wp: "♙",
  wn: "♘",
  wb: "♗",
  wr: "♖",
  wq: "♕",
  wk: "♔",
  bp: "♟",
  bn: "♞",
  bb: "♝",
  br: "♜",
  bq: "♛",
  bk: "♚",
};

export function getPieceSymbol(piece: Piece): string {
  return PIECE_SYMBOLS[`${piece.color}${piece.type}`] || "";
}

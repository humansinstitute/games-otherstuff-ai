import { useState, useMemo, useCallback } from "react";
import { Square } from "./Square";
import { fenToBoard, getLegalMoves, getTurn, isInCheck, coordsToSquare } from "../../utils/chess";

interface ChessBoardProps {
  fen: string;
  perspective?: "white" | "black";
  interactive?: boolean;
  onMove?: (from: string, to: string) => void;
  lastMove?: { from: string; to: string } | null;
}

export function ChessBoard({
  fen,
  perspective = "white",
  interactive = false,
  onMove,
  lastMove,
}: ChessBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  const board = useMemo(() => fenToBoard(fen), [fen]);
  const turn = useMemo(() => getTurn(fen), [fen]);
  const inCheck = useMemo(() => isInCheck(fen), [fen]);

  const legalMoves = useMemo(() => {
    if (!selectedSquare) return [];
    return getLegalMoves(fen, selectedSquare);
  }, [fen, selectedSquare]);

  // Find king position for check highlight
  const kingInCheck = useMemo(() => {
    if (!inCheck) return null;
    const kingColor = turn === "white" ? "w" : "b";
    for (const row of board) {
      for (const sq of row) {
        if (sq.piece?.type === "k" && sq.piece.color === kingColor) {
          return sq.name;
        }
      }
    }
    return null;
  }, [board, inCheck, turn]);

  const handleSquareClick = useCallback(
    (squareName: string) => {
      if (!interactive) return;

      const clickedSquare = board
        .flat()
        .find((sq) => sq.name === squareName);

      if (selectedSquare) {
        // Check if clicking on a legal move destination
        if (legalMoves.includes(squareName)) {
          onMove?.(selectedSquare, squareName);
          setSelectedSquare(null);
          return;
        }

        // Clicking on another own piece - select it
        if (clickedSquare?.piece) {
          const pieceColor = clickedSquare.piece.color === "w" ? "white" : "black";
          if (pieceColor === turn) {
            setSelectedSquare(squareName);
            return;
          }
        }

        // Deselect
        setSelectedSquare(null);
      } else {
        // Select a piece if it's the current player's
        if (clickedSquare?.piece) {
          const pieceColor = clickedSquare.piece.color === "w" ? "white" : "black";
          if (pieceColor === turn) {
            setSelectedSquare(squareName);
          }
        }
      }
    },
    [interactive, selectedSquare, legalMoves, board, turn, onMove]
  );

  // Flip board based on perspective
  const displayBoard = useMemo(() => {
    if (perspective === "black") {
      return board.map((row) => [...row].reverse()).reverse();
    }
    return board;
  }, [board, perspective]);

  return (
    <div className="grid grid-cols-8 aspect-square w-full max-w-lg border-2 border-amber-900 rounded overflow-hidden shadow-lg">
      {displayBoard.map((row, rowIndex) =>
        row.map((square) => (
          <Square
            key={square.name}
            name={square.name}
            color={square.color}
            piece={square.piece}
            isSelected={selectedSquare === square.name}
            isLegalMove={legalMoves.includes(square.name)}
            isLastMove={
              lastMove?.from === square.name || lastMove?.to === square.name
            }
            isCheck={kingInCheck === square.name}
            onClick={() => handleSquareClick(square.name)}
            interactive={interactive}
          />
        ))
      )}
    </div>
  );
}

import { cn } from "@/lib/utils";
import type { Piece } from "../../utils/chess";
import { getPieceSymbol } from "../../utils/chess";

interface SquareProps {
  name: string;
  color: "light" | "dark";
  piece: Piece | null;
  isSelected: boolean;
  isLegalMove: boolean;
  isLastMove: boolean;
  isCheck: boolean;
  onClick: () => void;
  interactive: boolean;
}

export function Square({
  name,
  color,
  piece,
  isSelected,
  isLegalMove,
  isLastMove,
  isCheck,
  onClick,
  interactive,
}: SquareProps) {
  return (
    <div
      className={cn(
        "aspect-square flex items-center justify-center relative select-none",
        color === "light" ? "bg-amber-100" : "bg-amber-700",
        isSelected && "ring-2 ring-inset ring-blue-500",
        isLastMove && "bg-yellow-300/50",
        isCheck && "bg-red-400/50",
        interactive && "cursor-pointer hover:brightness-110",
        !interactive && piece && "cursor-default"
      )}
      onClick={interactive ? onClick : undefined}
      data-square={name}
    >
      {/* Legal move indicator */}
      {isLegalMove && !piece && (
        <div className="absolute w-1/3 h-1/3 rounded-full bg-black/20" />
      )}
      {isLegalMove && piece && (
        <div className="absolute inset-0 ring-4 ring-inset ring-black/20 rounded-sm" />
      )}

      {/* Piece */}
      {piece && (
        <span
          className={cn(
            "text-4xl md:text-5xl leading-none",
            piece.color === "w" ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" : "text-gray-900"
          )}
        >
          {getPieceSymbol(piece)}
        </span>
      )}
    </div>
  );
}

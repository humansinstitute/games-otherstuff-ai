import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { MyGame } from "../hooks/useMyGames";
import { shortenPubkey } from "../utils/keys";

interface ActiveGameCardProps {
  game: MyGame;
  onContinue: (gameId: string) => void;
}

export function ActiveGameCard({ game, onContinue }: ActiveGameCardProps) {
  const statusText = game.status === "open"
    ? "Waiting for opponent"
    : game.isMyTurn
      ? "Your turn"
      : "Opponent's turn";

  const statusColor = game.status === "open"
    ? "text-yellow-600"
    : game.isMyTurn
      ? "text-green-600"
      : "text-muted-foreground";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {game.opponentDisplayName || game.opponentPubkey ? (
                <>
                  <span className="font-medium">
                    vs {game.opponentDisplayName || shortenPubkey(game.opponentPubkey!, 6)}
                  </span>
                  {game.opponentRating && (
                    <span className="text-sm text-muted-foreground font-mono">
                      ({Math.round(game.opponentRating)})
                    </span>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground">Waiting for opponent...</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              {game.myColor && (
                <span>{game.myColor === "white" ? "○" : "●"}</span>
              )}
              <span className={statusColor}>{statusText}</span>
            </div>
          </div>
          <Button size="sm" onClick={() => onContinue(game.id)}>
            {game.status === "open" ? "View" : "Continue"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { OpenGame } from "../hooks/useOpenGames";
import { shortenPubkey } from "../utils/keys";

interface GameCardProps {
  game: OpenGame;
  onJoin: (gameId: string) => void;
  isJoining?: boolean;
  disabled?: boolean;
}

export function GameCard({ game, onJoin, isJoining, disabled }: GameCardProps) {
  const colorIcon = game.hostColorPreference === "white" ? "○"
    : game.hostColorPreference === "black" ? "●"
    : "◐";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {game.hostDisplayName || shortenPubkey(game.hostPubkey, 6)}
              </span>
              <span className="text-sm text-muted-foreground font-mono">
                ({Math.round(game.hostRating)})
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span title={`Host plays ${game.hostColorPreference}`}>{colorIcon}</span>
              {game.type !== "public" && (
                <span className="px-1.5 py-0.5 bg-muted rounded text-xs">
                  {game.type}
                </span>
              )}
              {game.challengerCount > 0 && (
                <span>{game.challengerCount} waiting</span>
              )}
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => onJoin(game.id)}
            disabled={disabled || isJoining}
          >
            {isJoining ? "Joining..." : "Join"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

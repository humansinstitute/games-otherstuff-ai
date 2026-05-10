import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Challenger } from "../hooks/useChallengers";
import { shortenPubkey } from "../utils/keys";

interface ChallengerCardProps {
  challenger: Challenger;
  onAccept: () => void;
  onDecline: () => void;
  isAccepting?: boolean;
  isDeclining?: boolean;
}

export function ChallengerCard({
  challenger,
  onAccept,
  onDecline,
  isAccepting,
  isDeclining,
}: ChallengerCardProps) {
  const winRatePercent = (challenger.winRate * 100).toFixed(0);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {challenger.displayName || shortenPubkey(challenger.pubkey, 6)}
              </span>
              {challenger.isAi && (
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                  AI
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-mono">{Math.round(challenger.rating)}</span>
              {challenger.gamesPlayed > 0 && (
                <span className="ml-2">
                  {challenger.gamesPlayed} games · {winRatePercent}% wins
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onDecline}
              disabled={isAccepting || isDeclining}
            >
              {isDeclining ? "..." : "Decline"}
            </Button>
            <Button
              size="sm"
              onClick={onAccept}
              disabled={isAccepting || isDeclining}
            >
              {isAccepting ? "..." : "Accept"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGame } from "../hooks/useGame";
import { useChallengers } from "../hooks/useChallengers";
import { ChallengerCard } from "../components/ChallengerCard";
import { navigate } from "../router";

interface WaitingRoomProps {
  gameId: string;
  onGameStart?: () => void;
  onCancel?: () => void;
}

export function WaitingRoom({ gameId, onGameStart, onCancel }: WaitingRoomProps) {
  const { game, isLoading: gameLoading } = useGame(gameId, 3000);
  const { challengers, isLoading: challengersLoading, acceptChallenger, declineChallenger } = useChallengers(gameId);
  const [acceptingPubkey, setAcceptingPubkey] = useState<string | null>(null);
  const [decliningPubkey, setDecliningPubkey] = useState<string | null>(null);

  // Navigate to game when it starts
  useEffect(() => {
    if (game?.status === "active") {
      onGameStart?.();
      navigate(`/game/${gameId}`);
    }
  }, [game?.status, gameId, onGameStart]);

  const handleAccept = async (challengerPubkey: string) => {
    setAcceptingPubkey(challengerPubkey);
    try {
      await acceptChallenger(challengerPubkey);
    } catch (err) {
      console.error("Failed to accept challenger:", err);
    } finally {
      setAcceptingPubkey(null);
    }
  };

  const handleDecline = async (challengerPubkey: string) => {
    setDecliningPubkey(challengerPubkey);
    try {
      await declineChallenger(challengerPubkey);
    } catch (err) {
      console.error("Failed to decline challenger:", err);
    } finally {
      setDecliningPubkey(null);
    }
  };

  const shareUrl = `${window.location.origin}/#/game/${gameId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
  };

  if (gameLoading && !game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading game...</div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Game not found</p>
            <Button className="mt-4" onClick={() => navigate("/")}>
              Back to Lobby
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Waiting for Opponent</h1>
          <Button variant="outline" onClick={onCancel || (() => navigate("/"))}>
            Cancel
          </Button>
        </div>

        {/* Share Link */}
        <Card>
          <CardHeader>
            <CardTitle>Share this game</CardTitle>
            <CardDescription>Send this link to invite players</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2 bg-muted rounded-md font-mono text-sm"
              />
              <Button onClick={copyLink}>Copy</Button>
            </div>
          </CardContent>
        </Card>

        {/* Challengers */}
        <Card>
          <CardHeader>
            <CardTitle>
              Challengers
              {challengers.length > 0 && (
                <span className="ml-2 text-muted-foreground font-normal">
                  ({challengers.length})
                </span>
              )}
            </CardTitle>
            <CardDescription>Players waiting to join your game</CardDescription>
          </CardHeader>
          <CardContent>
            {challengersLoading && challengers.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                Loading...
              </div>
            ) : challengers.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No challengers yet. Share the link above!
              </div>
            ) : (
              <div className="space-y-3">
                {challengers.map((challenger) => (
                  <ChallengerCard
                    key={challenger.pubkey}
                    challenger={challenger}
                    onAccept={() => handleAccept(challenger.pubkey)}
                    onDecline={() => handleDecline(challenger.pubkey)}
                    isAccepting={acceptingPubkey === challenger.pubkey}
                    isDeclining={decliningPubkey === challenger.pubkey}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

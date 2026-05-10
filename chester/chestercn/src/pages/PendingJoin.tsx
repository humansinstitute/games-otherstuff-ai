import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGame } from "../hooks/useGame";
import { useChester } from "../contexts/ChesterContext";
import { useIdentity } from "../contexts/IdentityContext";
import { navigate } from "../router";
import { shortenPubkey } from "../utils/keys";

interface PendingJoinProps {
  gameId: string;
}

export function PendingJoin({ gameId }: PendingJoinProps) {
  const { client } = useChester();
  const { identity } = useIdentity();
  const { game, isLoading } = useGame(gameId, 2000);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [wasDeclined, setWasDeclined] = useState(false);

  // Check if we're in the game (accepted) or not
  useEffect(() => {
    if (!game || !identity) return;

    if (game.status === "active") {
      // Check if we're a player
      const isPlayer =
        game.white?.pubkey === identity.pubkey ||
        game.black?.pubkey === identity.pubkey;

      if (isPlayer) {
        navigate(`/game/${gameId}`);
      } else {
        // We were declined
        setWasDeclined(true);
      }
    }
  }, [game, identity, gameId]);

  const handleWithdraw = useCallback(async () => {
    if (!client || !identity) return;

    setIsWithdrawing(true);
    try {
      await client.WithdrawRequest(gameId, identity.pubkey);
      navigate("/");
    } catch (err) {
      console.error("Failed to withdraw:", err);
    } finally {
      setIsWithdrawing(false);
    }
  }, [client, identity, gameId]);

  if (isLoading && !game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (wasDeclined) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Request Declined</CardTitle>
            <CardDescription>
              The host accepted a different challenger
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/")}>
              Back to Lobby
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Waiting for Host</CardTitle>
          <CardDescription>
            Your request to join has been sent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <div className="text-6xl mb-4 animate-pulse">&#9816;</div>
            <p className="text-muted-foreground">
              Waiting for{" "}
              <span className="font-medium">
                {shortenPubkey(game.hostPubkey, 6)}
              </span>{" "}
              to accept...
            </p>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleWithdraw}
            disabled={isWithdrawing}
          >
            {isWithdrawing ? "Withdrawing..." : "Withdraw Request"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

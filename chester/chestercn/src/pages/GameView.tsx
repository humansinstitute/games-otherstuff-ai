import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChessBoard } from "../components/chess/ChessBoard";
import { useGame } from "../hooks/useGame";
import { useChester } from "../contexts/ChesterContext";
import { useIdentity } from "../contexts/IdentityContext";
import { navigate } from "../router";
import { shortenPubkey } from "../utils/keys";

interface GameViewProps {
  gameId: string;
}

export function GameView({ gameId }: GameViewProps) {
  const { client } = useChester();
  const { identity } = useIdentity();
  const { game, isLoading, refresh } = useGame(gameId, 2000);

  const [isMoving, setIsMoving] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  // Determine player's perspective and turn
  const myColor =
    game?.white?.pubkey === identity?.pubkey
      ? "white"
      : game?.black?.pubkey === identity?.pubkey
        ? "black"
        : null;

  const isMyTurn = game?.turn === myColor;
  const isSpectator = !myColor;

  const handleMove = useCallback(
    async (from: string, to: string) => {
      if (!client || !identity || !game || isMoving) return;

      setIsMoving(true);
      setMoveError(null);

      try {
        const move = `${from}${to}`; // UCI format
        const result = (await client.MakeMove(
          gameId,
          identity.pubkey,
          move
        )) as any;

        if (result.success) {
          setLastMove({ from, to });
          refresh();
        } else {
          setMoveError(result.error || "Invalid move");
        }
      } catch (err) {
        setMoveError(err instanceof Error ? err.message : "Move failed");
      } finally {
        setIsMoving(false);
      }
    },
    [client, identity, game, gameId, isMoving, refresh]
  );

  const handleResign = useCallback(async () => {
    if (!client || !identity || !window.confirm("Are you sure you want to resign?")) return;

    try {
      await client.Resign(gameId, identity.pubkey);
      refresh();
    } catch (err) {
      console.error("Resign failed:", err);
    }
  }, [client, identity, gameId, refresh]);

  const handleOfferDraw = useCallback(async () => {
    if (!client || !identity) return;

    try {
      await client.OfferDraw(gameId, identity.pubkey);
      refresh();
    } catch (err) {
      console.error("Draw offer failed:", err);
    }
  }, [client, identity, gameId, refresh]);

  const handleRespondDraw = useCallback(
    async (accept: boolean) => {
      if (!client || !identity) return;

      try {
        await client.RespondDraw(gameId, identity.pubkey, accept);
        refresh();
      } catch (err) {
        console.error("Draw response failed:", err);
      }
    },
    [client, identity, gameId, refresh]
  );

  if (isLoading && !game) {
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

  const isGameOver = game.status === "completed";
  const opponent = myColor === "white" ? game.black : game.white;
  const me = myColor === "white" ? game.white : game.black;
  const canOfferDraw = !isGameOver && !game.drawOfferBy && !isSpectator;
  const drawOfferedToMe = game.drawOfferBy && game.drawOfferBy !== identity?.pubkey;

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => navigate("/")}>
            ← Back
          </Button>
          {isGameOver && (
            <div className="text-lg font-bold">
              {game.result === "draw"
                ? "Draw"
                : game.result === myColor
                  ? "You won!"
                  : isSpectator
                    ? `${game.result} wins`
                    : "You lost"}
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Board Section */}
          <div className="lg:col-span-2 space-y-4">
            {/* Opponent info (top) */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-xl">{myColor === "white" ? "●" : "○"}</span>
                <span className="font-medium">
                  {opponent?.displayName || shortenPubkey(opponent?.pubkey || "", 6)}
                </span>
                <span className="text-muted-foreground font-mono">
                  ({Math.round(opponent?.rating || 1500)})
                </span>
              </div>
              {game.turn !== myColor && !isGameOver && (
                <span className="text-sm text-muted-foreground animate-pulse">
                  Thinking...
                </span>
              )}
            </div>

            {/* Chess Board */}
            <ChessBoard
              fen={game.currentFen}
              perspective={myColor || "white"}
              interactive={isMyTurn && !isGameOver && !isMoving}
              onMove={handleMove}
              lastMove={lastMove}
            />

            {/* My info (bottom) */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-xl">{myColor === "white" ? "○" : "●"}</span>
                <span className="font-medium">
                  {me?.displayName || (isSpectator ? "Spectating" : shortenPubkey(me?.pubkey || "", 6))}
                </span>
                {me && (
                  <span className="text-muted-foreground font-mono">
                    ({Math.round(me.rating)})
                  </span>
                )}
              </div>
              {isMyTurn && !isGameOver && (
                <span className="text-sm text-green-600 font-medium">Your turn</span>
              )}
            </div>

            {/* Move Error */}
            {moveError && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                {moveError}
              </div>
            )}
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            {/* Draw Offer Banner */}
            {drawOfferedToMe && (
              <Card className="border-yellow-500">
                <CardContent className="p-4">
                  <p className="text-sm mb-3">Your opponent offers a draw</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRespondDraw(false)}
                    >
                      Decline
                    </Button>
                    <Button size="sm" onClick={() => handleRespondDraw(true)}>
                      Accept
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Game Info */}
            <Card>
              <CardHeader>
                <CardTitle>Game Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="capitalize">{game.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Moves</span>
                  <span>{game.moveCount}</span>
                </div>
                {game.result && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Result</span>
                    <span className="capitalize">{game.result}</span>
                  </div>
                )}
                {game.terminationType && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ended by</span>
                    <span className="capitalize">{game.terminationType.replace("_", " ")}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Game Controls */}
            {!isGameOver && !isSpectator && (
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleOfferDraw}
                    disabled={!canOfferDraw}
                  >
                    {game.drawOfferBy === identity?.pubkey
                      ? "Draw Offered..."
                      : "Offer Draw"}
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handleResign}
                  >
                    Resign
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Game Over Actions */}
            {isGameOver && (
              <Card>
                <CardContent className="p-4">
                  <Button className="w-full" onClick={() => navigate("/")}>
                    Back to Lobby
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

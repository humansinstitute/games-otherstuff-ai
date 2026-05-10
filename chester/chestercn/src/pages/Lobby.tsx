import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useIdentity } from "../contexts/IdentityContext";
import { useChester } from "../contexts/ChesterContext";
import { useProfile } from "../hooks/useProfile";
import { useOpenGames } from "../hooks/useOpenGames";
import { useMyGames } from "../hooks/useMyGames";
import { ProfileCard } from "../components/ProfileCard";
import { GameCard } from "../components/GameCard";
import { ActiveGameCard } from "../components/ActiveGameCard";
import { CreateGameModal } from "../components/CreateGameModal";
import { shortenNpub } from "../utils/keys";
import { navigate } from "../router";

export function Lobby() {
  const { identity, logout } = useIdentity();
  const { client, isConnecting, connectionError } = useChester();
  const { profile, isLoading: profileLoading, isRegistering, error: profileError } = useProfile();
  const { games: openGames, isLoading: openGamesLoading } = useOpenGames();
  const { activeGames, openGames: myOpenGames, isLoading: myGamesLoading } = useMyGames();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [joiningGameId, setJoiningGameId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleCreateGame = useCallback(async (type: string, colorPreference: string) => {
    if (!client || !identity) {
      setActionError("Not connected. Please wait or refresh.");
      return;
    }

    setIsCreating(true);
    setActionError(null);
    try {
      console.log("Creating game with:", { pubkey: identity.pubkey, type, colorPreference });
      const result = await client.CreateGame(identity.pubkey, type, colorPreference) as any;
      console.log("CreateGame result:", result);

      if (result.success && result.game?.id) {
        setShowCreateModal(false);
        navigate(`/waiting/${result.game.id}`);
      } else {
        const errorMsg = result.error || "Failed to create game";
        setActionError(errorMsg);
        console.error("Failed to create game:", errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error creating game";
      setActionError(errorMsg);
      console.error("Error creating game:", err);
    } finally {
      setIsCreating(false);
    }
  }, [client, identity]);

  const handleJoinGame = useCallback(async (gameId: string) => {
    if (!client || !identity) return;

    setJoiningGameId(gameId);
    try {
      const result = await client.RequestJoin(gameId, identity.pubkey) as any;

      if (result.success) {
        navigate(`/pending/${gameId}`);
      } else {
        console.error("Failed to join game:", result.error);
      }
    } catch (err) {
      console.error("Error joining game:", err);
    } finally {
      setJoiningGameId(null);
    }
  }, [client, identity]);

  const handleContinueGame = useCallback((gameId: string) => {
    navigate(`/game/${gameId}`);
  }, []);

  const handleViewWaiting = useCallback((gameId: string) => {
    navigate(`/waiting/${gameId}`);
  }, []);

  if (!identity) {
    return null;
  }

  // Filter out my own games from open games list
  const availableGames = openGames.filter(g => g.hostPubkey !== identity.pubkey);

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="text-3xl">&#9816;</span> Chester
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground font-mono">
              {shortenNpub(identity.npub)}
            </span>
            <Button variant="outline" size="sm" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>

        {/* Connection Status */}
        {connectionError && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
            {connectionError}
          </div>
        )}
        {actionError && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm flex justify-between items-center">
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} className="text-xs underline">dismiss</button>
          </div>
        )}
        {isConnecting && (
          <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
            Connecting to Chester server...
          </div>
        )}
        {isRegistering && (
          <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
            Registering player...
          </div>
        )}
        {profileError && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
            Profile error: {profileError}
          </div>
        )}

        {/* Main Content */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Create Game */}
          <Card>
            <CardHeader>
              <CardTitle>Start a Game</CardTitle>
              <CardDescription>Create a new game and wait for challengers</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                disabled={!client || isCreating || !profile}
                onClick={() => setShowCreateModal(true)}
              >
                {!client ? "Connecting..." : !profile ? "Loading profile..." : isCreating ? "Creating..." : "Create Game"}
              </Button>
            </CardContent>
          </Card>

          {/* Profile */}
          <ProfileCard profile={profile} isLoading={profileLoading} />
        </div>

        {/* My Active Games */}
        {(activeGames.length > 0 || myOpenGames.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Your Games</CardTitle>
              <CardDescription>Games you're currently playing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {myOpenGames.map((game) => (
                <ActiveGameCard
                  key={game.id}
                  game={game}
                  onContinue={() => handleViewWaiting(game.id)}
                />
              ))}
              {activeGames.map((game) => (
                <ActiveGameCard
                  key={game.id}
                  game={game}
                  onContinue={handleContinueGame}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Open Games */}
        <Card>
          <CardHeader>
            <CardTitle>Open Games</CardTitle>
            <CardDescription>Join a game and challenge the host</CardDescription>
          </CardHeader>
          <CardContent>
            {openGamesLoading && availableGames.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Loading...
              </div>
            ) : availableGames.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                {client ? "No open games available" : "Connect to see open games"}
              </div>
            ) : (
              <div className="space-y-3">
                {availableGames.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    onJoin={handleJoinGame}
                    isJoining={joiningGameId === game.id}
                    disabled={!client || !!joiningGameId}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateGameModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateGame}
        isCreating={isCreating}
      />
    </div>
  );
}

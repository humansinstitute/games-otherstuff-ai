import "./index.css";
import { IdentityProvider, useIdentity } from "./contexts/IdentityContext";
import { ChesterProvider } from "./contexts/ChesterContext";
import { RouterProvider, useRouter } from "./router";
import { Welcome } from "./pages/Welcome";
import { Lobby } from "./pages/Lobby";
import { WaitingRoom } from "./pages/WaitingRoom";
import { PendingJoin } from "./pages/PendingJoin";
import { GameView } from "./pages/GameView";

function AppRoutes() {
  const { identity, isLoading } = useIdentity();
  const { path } = useRouter();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!identity) {
    return <Welcome />;
  }

  // Simple route matching
  if (path.startsWith("/waiting/")) {
    const gameId = path.replace("/waiting/", "");
    return <WaitingRoom gameId={gameId} />;
  }

  if (path.startsWith("/pending/")) {
    const gameId = path.replace("/pending/", "");
    return <PendingJoin gameId={gameId} />;
  }

  if (path.startsWith("/game/")) {
    const gameId = path.replace("/game/", "");
    return <GameView gameId={gameId} />;
  }

  // Default to lobby
  return <Lobby />;
}

function AppContent() {
  return (
    <ChesterProvider>
      <AppRoutes />
    </ChesterProvider>
  );
}

export function App() {
  return (
    <RouterProvider>
      <IdentityProvider>
        <AppContent />
      </IdentityProvider>
    </RouterProvider>
  );
}

export default App;

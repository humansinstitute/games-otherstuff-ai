import { useCallback } from "react";
import { useChester } from "../contexts/ChesterContext";
import { useIdentity } from "../contexts/IdentityContext";
import { usePolling } from "./usePolling";

export interface MyGame {
  id: string;
  type: "public" | "private" | "ai";
  status: "open" | "active" | "completed" | "abandoned" | "cancelled";
  hostPubkey: string;
  whitePubkey: string | null;
  blackPubkey: string | null;
  opponentPubkey: string | null;
  opponentDisplayName: string | null;
  opponentRating: number | null;
  currentFen: string;
  isMyTurn: boolean;
  myColor: "white" | "black" | null;
  result: "white" | "black" | "draw" | null;
  createdAt: string;
  startedAt: string | null;
  lastMoveAt: string | null;
}

interface UseMyGamesResult {
  games: MyGame[];
  activeGames: MyGame[];
  openGames: MyGame[];
  completedGames: MyGame[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useMyGames(): UseMyGamesResult {
  const { client } = useChester();
  const { identity } = useIdentity();

  const fetcher = useCallback(async (): Promise<MyGame[]> => {
    if (!client || !identity) return [];

    const result = await client.GetMyGames(identity.pubkey, undefined, 50) as any;

    if (result.games && Array.isArray(result.games)) {
      return result.games.map((g: any) => mapMyGameData(g, identity.pubkey));
    }

    return [];
  }, [client, identity]);

  const { data, isLoading, error, refresh } = usePolling(fetcher, {
    enabled: !!client && !!identity,
    interval: 5000, // Poll every 5 seconds for active games
  });

  const games = data || [];

  return {
    games,
    activeGames: games.filter(g => g.status === "active"),
    openGames: games.filter(g => g.status === "open"),
    completedGames: games.filter(g => g.status === "completed"),
    isLoading,
    error,
    refresh,
  };
}

function mapMyGameData(data: any, myPubkey: string): MyGame {
  const whitePubkey = data.white_pubkey || data.white?.pubkey;
  const blackPubkey = data.black_pubkey || data.black?.pubkey;

  const myColor = whitePubkey === myPubkey ? "white"
    : blackPubkey === myPubkey ? "black"
    : null;

  const opponentPubkey = myColor === "white" ? blackPubkey
    : myColor === "black" ? whitePubkey
    : null;

  // Determine whose turn from FEN
  const fen = data.current_fen || "";
  const fenParts = fen.split(" ");
  const turnFromFen = fenParts[1] === "w" ? "white" : "black";
  const isMyTurn = myColor === turnFromFen;

  return {
    id: data.id,
    type: data.type || "public",
    status: data.status || "open",
    hostPubkey: data.host_pubkey,
    whitePubkey,
    blackPubkey,
    opponentPubkey,
    opponentDisplayName: data.opponent?.display_name || data.opponent_display_name || null,
    opponentRating: data.opponent?.rating || data.opponent_rating || null,
    currentFen: fen,
    isMyTurn,
    myColor,
    result: data.result || null,
    createdAt: data.created_at || "",
    startedAt: data.started_at || null,
    lastMoveAt: data.last_move_at || null,
  };
}

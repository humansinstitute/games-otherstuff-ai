import { useCallback } from "react";
import { useChester } from "../contexts/ChesterContext";
import { usePolling } from "./usePolling";

export interface GameState {
  id: string;
  type: "public" | "private" | "ai";
  status: "open" | "active" | "completed" | "abandoned" | "cancelled";
  hostPubkey: string;
  white: { pubkey: string; displayName: string; rating: number } | null;
  black: { pubkey: string; displayName: string; rating: number } | null;
  currentFen: string;
  turn: "white" | "black";
  moveCount: number;
  result: "white" | "black" | "draw" | null;
  terminationType: string | null;
  drawOfferBy: string | null;
  createdAt: string;
  startedAt: string | null;
  lastMoveAt: string | null;
}

interface UseGameResult {
  game: GameState | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useGame(gameId: string | null, pollInterval: number = 2000): UseGameResult {
  const { client } = useChester();

  const fetcher = useCallback(async (): Promise<GameState | null> => {
    if (!client || !gameId) return null;

    const result = await client.GetGame(gameId) as any;

    if (result.id) {
      return mapGameState(result);
    }

    if (result.error) {
      throw new Error(result.error);
    }

    return null;
  }, [client, gameId]);

  const { data, isLoading, error, refresh } = usePolling(fetcher, {
    enabled: !!client && !!gameId,
    interval: pollInterval,
  });

  return {
    game: data,
    isLoading,
    error,
    refresh,
  };
}

function mapGameState(data: any): GameState {
  const fen = data.current_fen || "";
  const fenParts = fen.split(" ");
  const turn = fenParts[1] === "b" ? "black" : "white";

  return {
    id: data.id,
    type: data.type || "public",
    status: data.status || "open",
    hostPubkey: data.host_pubkey,
    white: data.white ? {
      pubkey: data.white.pubkey,
      displayName: data.white.display_name || "",
      rating: data.white.rating ?? 1500,
    } : null,
    black: data.black ? {
      pubkey: data.black.pubkey,
      displayName: data.black.display_name || "",
      rating: data.black.rating ?? 1500,
    } : null,
    currentFen: fen,
    turn,
    moveCount: data.move_count ?? 0,
    result: data.result || null,
    terminationType: data.termination_type || null,
    drawOfferBy: data.draw_offer_by || null,
    createdAt: data.created_at || "",
    startedAt: data.started_at || null,
    lastMoveAt: data.last_move_at || null,
  };
}

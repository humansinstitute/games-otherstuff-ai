import { useCallback } from "react";
import { useChester } from "../contexts/ChesterContext";
import { usePolling } from "./usePolling";

export interface OpenGame {
  id: string;
  hostPubkey: string;
  hostDisplayName: string;
  hostRating: number;
  type: "public" | "private" | "ai";
  hostColorPreference: "white" | "black" | "random";
  createdAt: string;
  challengerCount: number;
}

interface UseOpenGamesResult {
  games: OpenGame[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useOpenGames(options: { excludeAiHosts?: boolean } = {}): UseOpenGamesResult {
  const { client } = useChester();
  const { excludeAiHosts = false } = options;

  const fetcher = useCallback(async (): Promise<OpenGame[]> => {
    if (!client) return [];

    const result = await client.ListOpenGames(20, excludeAiHosts) as any;

    if (result.games && Array.isArray(result.games)) {
      return result.games.map(mapGameData);
    }

    return [];
  }, [client, excludeAiHosts]);

  const { data, isLoading, error, refresh } = usePolling(fetcher, {
    enabled: !!client,
    interval: 10000, // Poll every 10 seconds
  });

  return {
    games: data || [],
    isLoading,
    error,
    refresh,
  };
}

function mapGameData(data: any): OpenGame {
  return {
    id: data.id,
    hostPubkey: data.host_pubkey,
    hostDisplayName: data.host_display_name || "",
    hostRating: data.host_rating ?? 1500,
    type: data.type || "public",
    hostColorPreference: data.host_color_preference || "random",
    createdAt: data.created_at || "",
    challengerCount: data.challenger_count ?? 0,
  };
}

import { useCallback } from "react";
import { useChester } from "../contexts/ChesterContext";
import { useIdentity } from "../contexts/IdentityContext";
import { usePolling } from "./usePolling";

export interface Challenger {
  requestId: string;
  pubkey: string;
  displayName: string;
  isAi: boolean;
  rating: number;
  gamesPlayed: number;
  winRate: number;
  requestedAt: string;
}

interface UseChallengersResult {
  challengers: Challenger[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  acceptChallenger: (challengerPubkey: string) => Promise<any>;
  declineChallenger: (challengerPubkey: string) => Promise<any>;
}

export function useChallengers(gameId: string | null): UseChallengersResult {
  const { client } = useChester();
  const { identity } = useIdentity();

  const fetcher = useCallback(async (): Promise<Challenger[]> => {
    if (!client || !gameId || !identity) return [];

    const result = await client.ListChallengers(gameId, identity.pubkey) as any;

    if (result.challengers && Array.isArray(result.challengers)) {
      return result.challengers.map(mapChallenger);
    }

    return [];
  }, [client, gameId, identity]);

  const { data, isLoading, error, refresh } = usePolling(fetcher, {
    enabled: !!client && !!gameId && !!identity,
    interval: 3000,
  });

  const acceptChallenger = useCallback(async (challengerPubkey: string) => {
    if (!client || !gameId || !identity) {
      throw new Error("Not connected");
    }
    return client.AcceptChallenger(gameId, identity.pubkey, challengerPubkey);
  }, [client, gameId, identity]);

  const declineChallenger = useCallback(async (challengerPubkey: string) => {
    if (!client || !gameId || !identity) {
      throw new Error("Not connected");
    }
    return client.DeclineChallenger(gameId, identity.pubkey, challengerPubkey);
  }, [client, gameId, identity]);

  return {
    challengers: data || [],
    isLoading,
    error,
    refresh,
    acceptChallenger,
    declineChallenger,
  };
}

function mapChallenger(data: any): Challenger {
  return {
    requestId: data.request_id,
    pubkey: data.pubkey,
    displayName: data.display_name || "",
    isAi: Boolean(data.is_ai),
    rating: data.rating ?? 1500,
    gamesPlayed: data.games_played ?? 0,
    winRate: data.win_rate ?? 0,
    requestedAt: data.requested_at || "",
  };
}

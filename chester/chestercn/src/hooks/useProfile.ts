import { useEffect, useState, useCallback } from "react";
import { useChester } from "../contexts/ChesterContext";
import { useIdentity } from "../contexts/IdentityContext";

export interface PlayerProfile {
  pubkey: string;
  displayName: string;
  isAi: boolean;
  rating: number;
  ratingDeviation: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  createdAt: string;
  lastSeenAt: string;
}

interface UseProfileResult {
  profile: PlayerProfile | null;
  isLoading: boolean;
  error: string | null;
  isRegistering: boolean;
  refresh: () => Promise<void>;
}

export function useProfile(): UseProfileResult {
  const { client } = useChester();
  const { identity } = useIdentity();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!client || !identity) {
      console.log("useProfile: No client or identity", { hasClient: !!client, hasIdentity: !!identity });
      setIsLoading(false);
      return;
    }

    setError(null);

    try {
      console.log("useProfile: Fetching player", identity.pubkey);
      const result = await client.GetPlayer(identity.pubkey) as any;
      console.log("useProfile: GetPlayer result", result);

      if (result.error === "PLAYER_NOT_FOUND") {
        // Auto-register the player
        console.log("useProfile: Player not found, registering...");
        setIsRegistering(true);
        try {
          const registerResult = await client.RegisterPlayer(
            identity.pubkey,
            identity.displayName || undefined
          ) as any;
          console.log("useProfile: RegisterPlayer result", registerResult);

          if (registerResult.success && registerResult.player) {
            setProfile(mapPlayerData(registerResult.player));
          } else {
            throw new Error(registerResult.error || "Registration failed");
          }
        } finally {
          setIsRegistering(false);
        }
      } else if (result.pubkey) {
        setProfile(mapPlayerData(result));
      } else if (result.error) {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  }, [client, identity]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    isLoading,
    error,
    isRegistering,
    refresh: fetchProfile,
  };
}

function mapPlayerData(data: any): PlayerProfile {
  return {
    pubkey: data.pubkey,
    displayName: data.display_name || "",
    isAi: Boolean(data.is_ai),
    rating: data.rating ?? 1500,
    ratingDeviation: data.rating_deviation ?? 350,
    gamesPlayed: data.games_played ?? 0,
    wins: data.wins ?? 0,
    losses: data.losses ?? 0,
    draws: data.draws ?? 0,
    createdAt: data.created_at || "",
    lastSeenAt: data.last_seen_at || "",
  };
}

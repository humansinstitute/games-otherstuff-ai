import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ChestervmClient } from "../ctxcn/ChestervmClient";
import { useIdentity } from "./IdentityContext";

interface ChesterContextValue {
  client: ChestervmClient | null;
  isConnecting: boolean;
  connectionError: string | null;
}

const ChesterContext = createContext<ChesterContextValue | null>(null);

export function ChesterProvider({ children }: { children: ReactNode }) {
  const { identity } = useIdentity();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Create client when identity changes
  const client = useMemo(() => {
    if (!identity) return null;

    // For extension users, we need a custom signer approach
    // For now, only support local keys
    if (identity.useExtension || !identity.privateKey) {
      setConnectionError("Extension signing not yet supported. Please use a local key.");
      return null;
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      console.log("ChesterContext: Creating client with pubkey", identity.pubkey);
      const newClient = new ChestervmClient({
        privateKey: identity.privateKey,
        relays: ["wss://relay.contextvm.org"],
      });
      console.log("ChesterContext: Client created successfully");

      setIsConnecting(false);
      return newClient;
    } catch (err) {
      setConnectionError(err instanceof Error ? err.message : "Failed to create client");
      setIsConnecting(false);
      return null;
    }
  }, [identity?.privateKey, identity?.useExtension]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (client) {
        client.disconnect().catch(console.error);
      }
    };
  }, [client]);

  return (
    <ChesterContext.Provider value={{ client, isConnecting, connectionError }}>
      {children}
    </ChesterContext.Provider>
  );
}

export function useChester(): ChesterContextValue {
  const context = useContext(ChesterContext);
  if (!context) {
    throw new Error("useChester must be used within ChesterProvider");
  }
  return context;
}

/**
 * Hook that returns the client and throws if not available
 */
export function useChesterClient(): ChestervmClient {
  const { client, connectionError } = useChester();
  if (!client) {
    throw new Error(connectionError || "Chester client not available. Please log in.");
  }
  return client;
}

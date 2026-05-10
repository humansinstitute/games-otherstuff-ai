import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { generateKeyPair, getPublicKeyFromPrivate, isValidHexKey, nsecToHex, pubkeyToNpub, hexToNsec } from "../utils/keys";
import { getPublicKeyFromExtension, hasNostrExtension } from "../utils/nip07";

const STORAGE_KEY = "chester_identity";

export interface Identity {
  pubkey: string;
  privateKey: string | null; // null if using extension
  npub: string;
  nsec: string | null; // null if using extension
  displayName: string;
  useExtension: boolean;
}

interface StoredIdentity {
  type: "local" | "extension";
  pubkey: string;
  privateKey?: string;
  displayName?: string;
}

interface IdentityContextValue {
  identity: Identity | null;
  isLoading: boolean;
  error: string | null;
  hasExtension: boolean;
  loginWithExtension: () => Promise<void>;
  loginWithPrivateKey: (privateKey: string) => Promise<void>;
  generateAndLogin: () => Promise<{ privateKey: string; pubkey: string }>;
  setDisplayName: (name: string) => void;
  logout: () => void;
}

const IdentityContext = createContext<IdentityContextValue | null>(null);

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasExtension, setHasExtension] = useState(false);

  // Check for extension and load stored identity on mount
  useEffect(() => {
    setHasExtension(hasNostrExtension());
    loadStoredIdentity();
  }, []);

  function loadStoredIdentity() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setIsLoading(false);
        return;
      }

      const parsed: StoredIdentity = JSON.parse(stored);

      if (parsed.type === "extension") {
        // Re-verify extension is available and get current pubkey
        if (hasNostrExtension()) {
          getPublicKeyFromExtension()
            .then((pubkey) => {
              const npub = pubkeyToNpub(pubkey);
              setIdentity({
                pubkey,
                privateKey: null,
                npub,
                nsec: null,
                displayName: parsed.displayName || "",
                useExtension: true,
              });
            })
            .catch(() => {
              // Extension unavailable or user denied, clear storage
              localStorage.removeItem(STORAGE_KEY);
            })
            .finally(() => setIsLoading(false));
        } else {
          setIsLoading(false);
        }
      } else if (parsed.type === "local" && parsed.privateKey) {
        // Regenerate npub/nsec from stored private key
        const npub = pubkeyToNpub(parsed.pubkey);
        const nsec = hexToNsec(parsed.privateKey);
        setIdentity({
          pubkey: parsed.pubkey,
          privateKey: parsed.privateKey,
          npub,
          nsec,
          displayName: parsed.displayName || "",
          useExtension: false,
        });
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      setIsLoading(false);
    }
  }

  function saveIdentity(id: Identity) {
    const stored: StoredIdentity = {
      type: id.useExtension ? "extension" : "local",
      pubkey: id.pubkey,
      privateKey: id.privateKey || undefined,
      displayName: id.displayName || undefined,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }

  async function loginWithExtension(): Promise<void> {
    setError(null);
    setIsLoading(true);

    try {
      if (!hasNostrExtension()) {
        throw new Error("No Nostr extension found. Please install nos2x, Alby, or similar.");
      }

      const pubkey = await getPublicKeyFromExtension();
      const npub = pubkeyToNpub(pubkey);

      const newIdentity: Identity = {
        pubkey,
        privateKey: null,
        npub,
        nsec: null,
        displayName: "",
        useExtension: true,
      };

      setIdentity(newIdentity);
      saveIdentity(newIdentity);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect extension");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  async function loginWithPrivateKey(privateKey: string): Promise<void> {
    setError(null);

    try {
      // Support both hex and nsec formats
      const cleanKey = privateKey.trim();
      let hexKey: string;

      if (cleanKey.startsWith("nsec1")) {
        hexKey = nsecToHex(cleanKey);
      } else if (isValidHexKey(cleanKey.toLowerCase())) {
        hexKey = cleanKey.toLowerCase();
      } else {
        throw new Error("Invalid private key. Enter hex (64 chars) or nsec format.");
      }

      const pubkey = getPublicKeyFromPrivate(hexKey);
      const npub = pubkeyToNpub(pubkey);
      const nsec = hexToNsec(hexKey);

      const newIdentity: Identity = {
        pubkey,
        privateKey: hexKey,
        npub,
        nsec,
        displayName: "",
        useExtension: false,
      };

      setIdentity(newIdentity);
      saveIdentity(newIdentity);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import key");
      throw err;
    }
  }

  async function generateAndLogin(): Promise<{ privateKey: string; pubkey: string; nsec: string; npub: string }> {
    setError(null);

    const { privateKey, pubkey, nsec, npub } = generateKeyPair();

    const newIdentity: Identity = {
      pubkey,
      privateKey,
      npub,
      nsec,
      displayName: "",
      useExtension: false,
    };

    setIdentity(newIdentity);
    saveIdentity(newIdentity);

    return { privateKey, pubkey, nsec, npub };
  }

  function setDisplayName(name: string) {
    if (!identity) return;

    const updated = { ...identity, displayName: name };
    setIdentity(updated);
    saveIdentity(updated);
  }

  function logout() {
    setIdentity(null);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <IdentityContext.Provider
      value={{
        identity,
        isLoading,
        error,
        hasExtension,
        loginWithExtension,
        loginWithPrivateKey,
        generateAndLogin,
        setDisplayName,
        logout,
      }}
    >
      {children}
    </IdentityContext.Provider>
  );
}

export function useIdentity(): IdentityContextValue {
  const context = useContext(IdentityContext);
  if (!context) {
    throw new Error("useIdentity must be used within IdentityProvider");
  }
  return context;
}

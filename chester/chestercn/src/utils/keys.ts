import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";

// Hex conversion utilities
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Generate a new secp256k1 keypair
 */
export function generateKeyPair(): { privateKey: string; pubkey: string; nsec: string; npub: string } {
  const sk = generateSecretKey();
  const pk = getPublicKey(sk);
  return {
    privateKey: toHex(sk),
    pubkey: pk,
    nsec: nip19.nsecEncode(sk),
    npub: nip19.npubEncode(pk),
  };
}

/**
 * Get public key from private key (hex)
 */
export function getPublicKeyFromPrivate(privateKeyHex: string): string {
  const sk = fromHex(privateKeyHex);
  return getPublicKey(sk);
}

/**
 * Validate a 64-character hex key
 */
export function isValidHexKey(key: string): boolean {
  if (typeof key !== "string") return false;
  if (key.length !== 64) return false;
  return /^[0-9a-fA-F]{64}$/.test(key);
}

/**
 * Convert hex pubkey to npub for display
 */
export function pubkeyToNpub(hex: string): string {
  if (!isValidHexKey(hex)) {
    throw new Error("Invalid hex pubkey");
  }
  return nip19.npubEncode(hex);
}

/**
 * Convert hex private key to nsec
 */
export function hexToNsec(hex: string): string {
  if (!isValidHexKey(hex)) {
    throw new Error("Invalid hex private key");
  }
  return nip19.nsecEncode(fromHex(hex));
}

/**
 * Convert nsec to hex private key
 */
export function nsecToHex(nsec: string): string {
  // If already hex, return as-is
  if (isValidHexKey(nsec)) {
    return nsec.toLowerCase();
  }

  // Try to decode nsec
  if (nsec.startsWith("nsec1")) {
    try {
      const decoded = nip19.decode(nsec);
      if (decoded.type === "nsec") {
        return toHex(decoded.data);
      }
    } catch {
      throw new Error("Invalid nsec format");
    }
  }

  throw new Error("Please enter your private key in hex (64 chars) or nsec format");
}

/**
 * Shorten a pubkey for display
 */
export function shortenPubkey(pubkey: string, chars: number = 8): string {
  if (pubkey.length <= chars * 2 + 3) return pubkey;
  return `${pubkey.slice(0, chars)}...${pubkey.slice(-chars)}`;
}

/**
 * Shorten an npub for display
 */
export function shortenNpub(npub: string | undefined): string {
  if (!npub) return "unknown";
  if (npub.length <= 20) return npub;
  return `${npub.slice(0, 12)}...${npub.slice(-8)}`;
}

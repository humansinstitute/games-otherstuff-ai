/**
 * NIP-07 integration for Nostr browser extensions
 * https://github.com/nostr-protocol/nips/blob/master/07.md
 */

export interface NostrExtension {
  getPublicKey(): Promise<string>;
  signEvent(event: UnsignedEvent): Promise<SignedEvent>;
  getRelays?(): Promise<Record<string, { read: boolean; write: boolean }>>;
  nip04?: {
    encrypt(pubkey: string, plaintext: string): Promise<string>;
    decrypt(pubkey: string, ciphertext: string): Promise<string>;
  };
}

export interface UnsignedEvent {
  kind: number;
  created_at: number;
  tags: string[][];
  content: string;
}

export interface SignedEvent extends UnsignedEvent {
  id: string;
  pubkey: string;
  sig: string;
}

declare global {
  interface Window {
    nostr?: NostrExtension;
  }
}

/**
 * Check if a NIP-07 compatible extension is available
 */
export function hasNostrExtension(): boolean {
  return typeof window !== "undefined" && window.nostr !== undefined;
}

/**
 * Get the Nostr extension object
 */
export function getNostrExtension(): NostrExtension | null {
  if (hasNostrExtension()) {
    return window.nostr!;
  }
  return null;
}

/**
 * Get public key from the browser extension
 */
export async function getPublicKeyFromExtension(): Promise<string> {
  const nostr = getNostrExtension();
  if (!nostr) {
    throw new Error("No Nostr extension found. Please install nos2x, Alby, or similar.");
  }
  return nostr.getPublicKey();
}

/**
 * Sign an event using the browser extension
 */
export async function signEventWithExtension(event: UnsignedEvent): Promise<SignedEvent> {
  const nostr = getNostrExtension();
  if (!nostr) {
    throw new Error("No Nostr extension found");
  }
  return nostr.signEvent(event);
}

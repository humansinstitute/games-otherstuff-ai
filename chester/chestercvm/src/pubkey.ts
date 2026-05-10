/**
 * Hex pubkey validation and normalization utilities
 * All pubkeys in Chester are stored and transmitted as 64-character hex strings
 */

const HEX_PUBKEY_REGEX = /^[0-9a-f]{64}$/i;

/**
 * Validate that a string is a valid hex pubkey (64 hex characters)
 */
export function isValidPubkey(input: string): boolean {
  return HEX_PUBKEY_REGEX.test(input);
}

/**
 * Normalize a hex pubkey to lowercase
 * Throws if the input is not a valid hex pubkey
 */
export function normalizeHex(pubkey: string): string {
  if (!isValidPubkey(pubkey)) {
    throw new Error(`Invalid pubkey: must be 64 hex characters, got "${pubkey}"`);
  }
  return pubkey.toLowerCase();
}

/**
 * Validate and normalize a pubkey, returning null if invalid
 */
export function tryNormalizeHex(pubkey: string): string | null {
  if (!isValidPubkey(pubkey)) {
    return null;
  }
  return pubkey.toLowerCase();
}

import { verifyEvent, type Event } from 'nostr-tools';
import { UnauthorizedError } from '../lib/errors';

const NIP98_KIND = 27235;
const MAX_AGE_SECONDS = 60;

/**
 * Verify a NIP-98 HTTP Auth event.
 * Returns the pubkey if valid, throws UnauthorizedError otherwise.
 */
export function verifyNip98(authHeader: string, url: string, method: string): string {
  if (!authHeader.startsWith('Nostr ')) {
    throw new UnauthorizedError('Missing Nostr auth header');
  }

  const base64 = authHeader.slice(6);
  let event: Event;

  try {
    const json = atob(base64);
    event = JSON.parse(json);
  } catch {
    throw new UnauthorizedError('Invalid NIP-98 event encoding');
  }

  // Verify event signature
  if (!verifyEvent(event)) {
    throw new UnauthorizedError('Invalid event signature');
  }

  // Must be kind 27235
  if (event.kind !== NIP98_KIND) {
    throw new UnauthorizedError(`Expected kind ${NIP98_KIND}, got ${event.kind}`);
  }

  // Check age
  const now = Math.floor(Date.now() / 1000);
  const age = Math.abs(now - event.created_at);
  if (age > MAX_AGE_SECONDS) {
    throw new UnauthorizedError('NIP-98 event expired');
  }

  // Verify URL tag
  const urlTag = event.tags.find(t => t[0] === 'u');
  if (!urlTag || !urlsMatch(urlTag[1], url)) {
    throw new UnauthorizedError('URL mismatch');
  }

  // Verify method tag
  const methodTag = event.tags.find(t => t[0] === 'method');
  if (!methodTag || methodTag[1].toUpperCase() !== method.toUpperCase()) {
    throw new UnauthorizedError('Method mismatch');
  }

  return event.pubkey;
}

/**
 * Extract pubkey from request Authorization header.
 * Validates NIP-98 event against the request URL and method.
 */
export function authenticate(req: Request): string {
  const auth = req.headers.get('Authorization');
  if (!auth) {
    throw new UnauthorizedError('No Authorization header');
  }
  return verifyNip98(auth, req.url, req.method);
}

/**
 * Compare URLs ignoring trivial differences (trailing slash, port).
 */
function urlsMatch(a: string, b: string): boolean {
  try {
    const urlA = new URL(a);
    const urlB = new URL(b);
    // Compare pathname and search, normalize trailing slash
    const pathA = urlA.pathname.replace(/\/$/, '') + urlA.search;
    const pathB = urlB.pathname.replace(/\/$/, '') + urlB.search;
    return pathA === pathB;
  } catch {
    return a === b;
  }
}

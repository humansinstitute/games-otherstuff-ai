/**
 * Nostr integration for Retro Racer
 * - Ephemeral keypair stored in localStorage
 * - NIP-07 extension support for login
 * - Publish race results to Nostr
 */

const NOSTR_STORAGE_KEY = 'racer.nostr.player.v1';
const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nos.lol'
];

// Player storage using localStorage (persists across sessions)
const NostrPlayer = {
  get() {
    try {
      const raw = localStorage.getItem(NOSTR_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
  },

  set(player) {
    try {
      localStorage.setItem(NOSTR_STORAGE_KEY, JSON.stringify(player));
    } catch (_) {}
  },

  update(patch) {
    const current = this.get() || {};
    const updated = { ...current, ...patch };
    this.set(updated);
    return updated;
  },

  clear() {
    try {
      localStorage.removeItem(NOSTR_STORAGE_KEY);
    } catch (_) {}
  }
};

// Utility: bytes to hex
function bytesToHex(buf) {
  return Array.from(buf)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Utility: hex to bytes
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// nostr-tools module (lazy loaded)
let nostrTools = null;

async function loadNostrTools() {
  if (nostrTools) return nostrTools;
  nostrTools = await import('https://esm.sh/nostr-tools@2?bundle');
  return nostrTools;
}

/**
 * Ensure a player exists (ephemeral or extension-based)
 * Creates new ephemeral keypair if none exists
 */
async function ensurePlayer() {
  let player = NostrPlayer.get();
  if (player) return player;

  // Create new ephemeral keypair
  const { generateSecretKey, getPublicKey, nip19 } = await loadNostrTools();

  const sk = generateSecretKey();
  const pkHex = getPublicKey(sk);
  const nsec = nip19.nsecEncode(sk);
  const npub = nip19.npubEncode(pkHex);

  player = {
    npub,
    pubkey: pkHex,
    nsec,
    privkey: bytesToHex(sk),
    isExtension: false,
    createdAt: Date.now()
  };

  NostrPlayer.set(player);
  return player;
}

/**
 * Check if NIP-07 extension is available
 */
function hasNostrExtension() {
  return typeof window !== 'undefined' && !!window.nostr;
}

/**
 * Login with NIP-07 extension (e.g., Alby, nos2x)
 * Returns player object or null if failed/cancelled
 */
async function loginWithExtension() {
  if (!hasNostrExtension()) {
    throw new Error('No Nostr extension found. Install Alby, nos2x, or similar.');
  }

  try {
    const pubkey = await window.nostr.getPublicKey();
    const { nip19 } = await loadNostrTools();
    const npub = nip19.npubEncode(pubkey);

    const player = {
      npub,
      pubkey,
      nsec: null,
      privkey: null,
      isExtension: true,
      createdAt: Date.now()
    };

    NostrPlayer.set(player);
    return player;
  } catch (err) {
    console.error('Extension login failed:', err);
    throw err;
  }
}

/**
 * Logout - clears stored player and creates new ephemeral
 */
async function logout() {
  NostrPlayer.clear();
  return await ensurePlayer();
}

/**
 * Sign an event - uses extension if available, otherwise ephemeral key
 */
async function signEvent(eventTemplate) {
  const player = NostrPlayer.get();
  if (!player) throw new Error('No player initialized');

  const { finalizeEvent, getPublicKey } = await loadNostrTools();

  if (player.isExtension && hasNostrExtension()) {
    // Use extension to sign
    const event = {
      kind: eventTemplate.kind,
      created_at: Math.floor(Date.now() / 1000),
      tags: eventTemplate.tags || [],
      content: eventTemplate.content || ''
    };
    return await window.nostr.signEvent(event);
  } else if (player.privkey) {
    // Sign with ephemeral key
    const sk = hexToBytes(player.privkey);
    const event = {
      kind: eventTemplate.kind,
      created_at: Math.floor(Date.now() / 1000),
      tags: eventTemplate.tags || [],
      content: eventTemplate.content || ''
    };
    return finalizeEvent(event, sk);
  } else {
    throw new Error('No signing capability available');
  }
}

/**
 * Publish event to relays
 */
async function publishEvent(signedEvent, relays = DEFAULT_RELAYS) {
  const { Relay } = await loadNostrTools();
  const results = [];

  for (const url of relays) {
    try {
      const relay = await Relay.connect(url);
      await relay.publish(signedEvent);
      relay.close();
      results.push({ url, success: true });
    } catch (err) {
      results.push({ url, success: false, error: err.message });
    }
  }

  return results;
}

/**
 * Publish race result to Nostr
 * @param {number} score - The race score
 * @param {string} raceTime - Formatted race time
 * @param {string} gameUrl - URL to the game
 * @param {string} gameName - Name of the game
 */
async function publishRaceResult(score, raceTime, gameUrl, gameName = 'Retro Racer') {
  const player = NostrPlayer.get();
  if (!player) throw new Error('No player initialized');

  const content = `I finished ${gameName} with a time of ${raceTime}! (Score: ${score})

Play here: ${gameUrl}

#MicroRacer #nostr #gaming #racing`;

  const eventTemplate = {
    kind: 1,
    content,
    tags: [
      ['t', 'MicroRacer'],
      ['t', 'nostr'],
      ['t', 'gaming'],
      ['t', 'racing'],
      ['r', gameUrl]
    ]
  };

  const signedEvent = await signEvent(eventTemplate);
  const results = await publishEvent(signedEvent);

  return {
    event: signedEvent,
    results,
    noteId: signedEvent.id
  };
}

/**
 * Publish generic game result to Nostr (kept for backwards compatibility)
 * @param {number} score - The game score
 * @param {string} gameUrl - URL to the game
 * @param {string} gameName - Name of the game
 */
async function publishGameResult(score, gameUrl, gameName = 'Retro Racer') {
  const player = NostrPlayer.get();
  if (!player) throw new Error('No player initialized');

  const content = `I scored ${score} points playing ${gameName}!

Play here: ${gameUrl}

#MicroRacer #nostr #gaming`;

  const eventTemplate = {
    kind: 1,
    content,
    tags: [
      ['t', 'MicroRacer'],
      ['t', 'nostr'],
      ['t', 'gaming'],
      ['r', gameUrl]
    ]
  };

  const signedEvent = await signEvent(eventTemplate);
  const results = await publishEvent(signedEvent);

  return {
    event: signedEvent,
    results,
    noteId: signedEvent.id
  };
}

/**
 * Get shortened npub for display
 */
function getShortNpub(npub) {
  if (!npub || npub.length < 20) return npub;
  return npub.slice(0, 12) + '...' + npub.slice(-6);
}

// Export API
window.NostrPlayer = NostrPlayer;
window.NostrGame = {
  ensurePlayer,
  hasNostrExtension,
  loginWithExtension,
  logout,
  signEvent,
  publishEvent,
  publishGameResult,
  publishRaceResult,
  getShortNpub,
  getPlayer: () => NostrPlayer.get(),
  DEFAULT_RELAYS
};

// Auto-initialize on load (with error handling for environments without crypto.randomUUID)
async function safeInit() {
  try {
    await ensurePlayer();
  } catch (err) {
    console.warn('Nostr initialization failed (this is OK if running locally):', err.message);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', safeInit);
} else {
  safeInit();
}

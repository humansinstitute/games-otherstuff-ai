/**
 * Dumpling Town - Nostr Authentication
 * Handles ephemeral key generation and NIP-07 extension login
 */

const STORAGE_KEY = 'dumplingtown.nostr.player.v1';

// Lazy load nostr-tools
let nostrTools = null;
async function getNostrTools() {
    if (!nostrTools) {
        nostrTools = await import('https://esm.sh/nostr-tools@2');
    }
    return nostrTools;
}

export class NostrAuth {
    constructor() {
        this.player = null;
        this.useExtension = false;
    }

    /**
     * Ensure we have a player identity (create ephemeral if needed)
     */
    async ensurePlayer() {
        // Check for existing stored player
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                this.player = JSON.parse(stored);
                return this.player;
            } catch (e) {
                console.warn('Failed to parse stored player, creating new one');
            }
        }

        // Generate new ephemeral keypair
        return await this.generateNewPlayer();
    }

    /**
     * Generate a new ephemeral keypair
     */
    async generateNewPlayer() {
        const { generateSecretKey, getPublicKey, nip19 } = await getNostrTools();

        const secretKey = generateSecretKey();
        const pubkey = getPublicKey(secretKey);

        // Convert to hex string for storage
        const secretKeyHex = Array.from(secretKey)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        const npub = nip19.npubEncode(pubkey);
        const nsec = nip19.nsecEncode(secretKey);

        this.player = {
            pubkey,
            secretKeyHex,
            npub,
            nsec,
            shortNpub: npub.slice(0, 8) + '...' + npub.slice(-4),
            isExtension: false,
            createdAt: Date.now()
        };

        // Store for persistence
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.player));

        return this.player;
    }

    /**
     * Login with NIP-07 extension (Alby, nos2x, etc.)
     */
    async loginWithExtension() {
        if (typeof window.nostr === 'undefined') {
            throw new Error('No Nostr extension found');
        }

        try {
            const pubkey = await window.nostr.getPublicKey();
            const { nip19 } = await getNostrTools();
            const npub = nip19.npubEncode(pubkey);

            this.player = {
                pubkey,
                npub,
                shortNpub: npub.slice(0, 8) + '...' + npub.slice(-4),
                isExtension: true,
                createdAt: Date.now()
            };

            this.useExtension = true;

            // Store (without secret key since extension handles signing)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.player));

            return this.player;
        } catch (e) {
            console.error('Extension login failed:', e);
            throw e;
        }
    }

    /**
     * Get keys for display (public always, private only if ephemeral)
     */
    async getKeys() {
        if (!this.player) {
            await this.ensurePlayer();
        }

        return {
            npub: this.player.npub,
            nsec: this.player.isExtension ? null : this.player.nsec,
            isExtension: this.player.isExtension
        };
    }

    /**
     * Sign an event (uses extension or local key)
     */
    async signEvent(event) {
        if (this.useExtension && window.nostr) {
            return await window.nostr.signEvent(event);
        }

        if (!this.player || !this.player.secretKeyHex) {
            throw new Error('No signing key available');
        }

        const { finalizeEvent } = await getNostrTools();

        // Convert hex string back to Uint8Array
        const secretKey = new Uint8Array(
            this.player.secretKeyHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
        );

        return finalizeEvent(event, secretKey);
    }

    /**
     * Check if extension is available
     */
    hasExtension() {
        return typeof window.nostr !== 'undefined';
    }

    /**
     * Clear stored player data
     */
    logout() {
        localStorage.removeItem(STORAGE_KEY);
        this.player = null;
        this.useExtension = false;
    }

    /**
     * Publish a game event (e.g., achievements) to Nostr
     */
    async publishGameEvent(content, tags = []) {
        if (!this.player) {
            await this.ensurePlayer();
        }

        const { SimplePool } = await getNostrTools();

        const event = {
            kind: 1,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['t', 'dumplingtown'],
                ['client', 'DumplingTown'],
                ...tags
            ],
            content
        };

        const signedEvent = await this.signEvent(event);

        // Publish to relays
        const pool = new SimplePool();
        const relays = [
            'wss://relay.damus.io',
            'wss://relay.nostr.band',
            'wss://nos.lol'
        ];

        try {
            await Promise.any(
                relays.map(relay => pool.publish([relay], signedEvent))
            );
            console.log('Published game event:', signedEvent.id);
            return signedEvent;
        } catch (e) {
            console.error('Failed to publish:', e);
            throw e;
        } finally {
            pool.close(relays);
        }
    }
}

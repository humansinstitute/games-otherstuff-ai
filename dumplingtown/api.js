/**
 * Dumpling Town - Server API Client
 * Handles async backup to server with NIP-98 auth.
 * localStorage remains the primary store (instant, offline-safe).
 * Server is async backup for cross-device play.
 */

export class GameAPI {
  constructor(nostrAuth, baseUrl = window.location.origin) {
    this.nostr = nostrAuth;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.available = false;
    this.checking = false;
  }

  /**
   * Probe server availability via /api/health.
   * Call once at startup; if unreachable, all methods silently no-op.
   */
  async checkServer() {
    if (this.checking) return this.available;
    this.checking = true;

    try {
      const res = await fetch(`${this.baseUrl}/api/health`, { signal: AbortSignal.timeout(3000) });
      this.available = res.ok;
    } catch {
      this.available = false;
    }

    this.checking = false;
    console.log(`[API] Server ${this.available ? 'available' : 'unavailable'}`);
    return this.available;
  }

  /**
   * Create a NIP-98 Authorization header for the given URL + method.
   */
  async _authHeader(url, method, bodyHash) {
    const event = {
      kind: 27235,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['u', url],
        ['method', method],
      ],
      content: '',
    };

    if (bodyHash) {
      event.tags.push(['payload', bodyHash]);
    }

    const signed = await this.nostr.signEvent(event);
    const encoded = btoa(JSON.stringify(signed));
    return `Nostr ${encoded}`;
  }

  /**
   * Make an authenticated request to the server.
   * Returns null if server is unavailable or request fails.
   */
  async _request(path, method = 'GET', body = null) {
    if (!this.available) return null;

    const url = `${this.baseUrl}${path}`;

    try {
      const headers = { 'Content-Type': 'application/json' };
      let bodyStr = null;

      if (body !== null) {
        bodyStr = JSON.stringify(body);
      }

      headers['Authorization'] = await this._authHeader(url, method);

      const res = await fetch(url, {
        method,
        headers,
        body: bodyStr,
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn(`[API] ${method} ${path} failed:`, res.status, err.error);
        return null;
      }

      return await res.json();
    } catch (err) {
      console.warn(`[API] ${method} ${path} error:`, err.message);
      return null;
    }
  }

  // --- Save/Load (primary integration point) ---

  /**
   * Upload full save state to server (fire-and-forget from game's perspective).
   * Accepts the same shape as localStorage save data.
   */
  async pushSave(saveData) {
    // Remap gameTime keys to match server expectations
    const payload = {
      ...saveData,
      gameTime: saveData.gameTime ? {
        minutes: saveData.gameTime.minutes,
        day: saveData.gameTime.dayNumber ?? saveData.gameTime.day,
        paused: saveData.gameTime.paused ?? false,
      } : undefined,
    };
    return this._request('/api/save', 'PUT', payload);
  }

  /**
   * Download save state from server.
   * Returns localStorage-compatible shape, or null if unavailable.
   */
  async pullSave() {
    const data = await this._request('/api/save', 'GET');
    if (!data) return null;

    // Remap server gameTime back to client shape
    if (data.gameTime) {
      data.gameTime = {
        minutes: data.gameTime.minutes,
        dayNumber: data.gameTime.day,
        paused: data.gameTime.paused,
      };
    }
    return data;
  }

  // --- Individual endpoints for granular updates ---

  async createPlayer(filling) {
    return this._request('/api/player', 'POST', { filling });
  }

  async getPlayer() {
    return this._request('/api/player', 'GET');
  }

  async buyItem(item) {
    return this._request('/api/inventory/buy', 'POST', item);
  }

  async equipItem(instanceId, slot) {
    return this._request('/api/inventory/equip', 'POST', { instanceId, slot });
  }

  async unequipSlot(slot) {
    return this._request('/api/inventory/unequip', 'POST', { slot });
  }

  async placeDecoration(instanceId, x, y) {
    return this._request('/api/decorations/place', 'POST', { instanceId, x, y });
  }

  async pickupDecoration(instanceId) {
    return this._request('/api/decorations/pickup', 'POST', { instanceId });
  }

  async updateQuest(questId, state) {
    return this._request(`/api/quests/${questId}`, 'PATCH', { state });
  }

  async addCoins(amount, reason) {
    return this._request('/api/coins/reward', 'POST', { amount, reason });
  }

  async spendCoins(amount, reason) {
    return this._request('/api/coins/spend', 'POST', { amount, reason });
  }

  async sleep() {
    return this._request('/api/time/sleep', 'POST', {});
  }
}

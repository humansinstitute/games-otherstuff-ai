/**
 * Nostr UI Handler for Lemmings
 * Manages the player panel and publish overlay interactions
 */

// DOM Elements
let nostrPanel;
let nostrNpub;
let nostrExtensionBtn;
let nostrLogoutBtn;
let nostrPublishOverlay;
let nostrPublishPreview;
let nostrPublishBtn;
let nostrCancelBtn;
let nostrPublishStatus;

// Current game result to publish
let pendingGameResult = null;

/**
 * Initialize the Nostr UI elements
 */
function initNostrUI() {
  // Get DOM elements
  nostrPanel = document.getElementById('nostrPanel');
  nostrNpub = document.getElementById('nostrNpub');
  nostrExtensionBtn = document.getElementById('nostrExtensionBtn');
  nostrLogoutBtn = document.getElementById('nostrLogoutBtn');
  nostrPublishOverlay = document.getElementById('nostrPublishOverlay');
  nostrPublishPreview = document.getElementById('nostrPublishPreview');
  nostrPublishBtn = document.getElementById('nostrPublishBtn');
  nostrCancelBtn = document.getElementById('nostrCancelBtn');
  nostrPublishStatus = document.getElementById('nostrPublishStatus');

  // Set up event listeners
  if (nostrExtensionBtn) {
    nostrExtensionBtn.addEventListener('click', handleExtensionLogin);
  }

  if (nostrLogoutBtn) {
    nostrLogoutBtn.addEventListener('click', handleLogout);
  }

  if (nostrPublishBtn) {
    nostrPublishBtn.addEventListener('click', handlePublish);
  }

  if (nostrCancelBtn) {
    nostrCancelBtn.addEventListener('click', hidePublishOverlay);
  }

  // Close overlay on backdrop click
  if (nostrPublishOverlay) {
    nostrPublishOverlay.addEventListener('click', (e) => {
      if (e.target === nostrPublishOverlay) {
        hidePublishOverlay();
      }
    });
  }

  // Update UI with current player
  updatePlayerDisplay();
}

/**
 * Update the player display panel
 */
async function updatePlayerDisplay() {
  // Wait for NostrGame to be available
  if (typeof window.NostrGame === 'undefined') {
    setTimeout(updatePlayerDisplay, 100);
    return;
  }

  const player = window.NostrGame.getPlayer();

  if (player && player.npub) {
    const shortNpub = window.NostrGame.getShortNpub(player.npub);
    nostrNpub.textContent = shortNpub;

    // Show appropriate buttons
    if (player.isExtension) {
      // Logged in with extension - show logout button
      nostrExtensionBtn.style.display = 'none';
      nostrLogoutBtn.style.display = 'inline-block';
      nostrNpub.innerHTML = shortNpub + '<span class="nostr-extension-badge">EXT</span>';
    } else {
      // Ephemeral key - show extension login if available
      if (window.NostrGame.hasNostrExtension()) {
        nostrExtensionBtn.style.display = 'inline-block';
      } else {
        nostrExtensionBtn.style.display = 'none';
      }
      nostrLogoutBtn.style.display = 'none';
    }
  } else {
    nostrNpub.textContent = 'Initializing...';
    nostrExtensionBtn.style.display = 'none';
    nostrLogoutBtn.style.display = 'none';
  }
}

/**
 * Handle extension login button click
 */
async function handleExtensionLogin() {
  try {
    nostrExtensionBtn.disabled = true;
    nostrExtensionBtn.textContent = 'Connecting...';

    await window.NostrGame.loginWithExtension();
    updatePlayerDisplay();
  } catch (err) {
    console.error('Extension login failed:', err);
    alert('Failed to connect: ' + err.message);
  } finally {
    nostrExtensionBtn.disabled = false;
    nostrExtensionBtn.textContent = 'Login with Extension';
  }
}

/**
 * Handle logout button click
 */
async function handleLogout() {
  await window.NostrGame.logout();
  updatePlayerDisplay();
}

/**
 * Show the publish overlay with game result preview
 * @param {Object} gameResult - The game result to publish
 */
function showPublishOverlay(gameResult) {
  pendingGameResult = gameResult;

  // Generate preview text
  const { levelName, levelNumber, saved, total, time, won } = gameResult;
  const percentage = ((saved / total) * 100).toFixed(1);
  const minutes = Math.floor(time / 60);
  const seconds = (time % 60).toFixed(1);
  const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  const statusEmoji = won ? '🎉' : '💀';
  const statusText = won ? 'Complete' : 'Failed';

  const gameUrl = window.location.href.split('?')[0];

  const previewText = `Level ${levelNumber}: ${levelName} ${statusEmoji} ${statusText}!

Saved ${saved}/${total} lemmings (${percentage}%)
Time: ${timeStr}

Play here: ${gameUrl}

#Lemmings #nostr #gaming`;

  nostrPublishPreview.textContent = previewText;
  nostrPublishStatus.textContent = '';
  nostrPublishStatus.className = 'nostr-publish-status';
  nostrPublishBtn.disabled = false;
  nostrPublishOverlay.style.display = 'flex';
}

/**
 * Hide the publish overlay
 */
function hidePublishOverlay() {
  nostrPublishOverlay.style.display = 'none';
  pendingGameResult = null;
}

/**
 * Handle publish button click
 */
async function handlePublish() {
  if (!pendingGameResult) return;

  try {
    nostrPublishBtn.disabled = true;
    nostrPublishStatus.textContent = 'Publishing to relays...';
    nostrPublishStatus.className = 'nostr-publish-status nostr-publish-status--loading';

    const gameUrl = window.location.href.split('?')[0];
    const result = await window.NostrGame.publishGameResult(pendingGameResult, gameUrl);

    // Count successes
    const successCount = result.results.filter(r => r.success).length;
    const totalRelays = result.results.length;

    if (successCount > 0) {
      nostrPublishStatus.textContent = `Published to ${successCount}/${totalRelays} relays!`;
      nostrPublishStatus.className = 'nostr-publish-status nostr-publish-status--success';

      // Auto-close after success
      setTimeout(() => {
        hidePublishOverlay();
      }, 2000);
    } else {
      nostrPublishStatus.textContent = 'Failed to publish to any relay';
      nostrPublishStatus.className = 'nostr-publish-status nostr-publish-status--error';
      nostrPublishBtn.disabled = false;
    }
  } catch (err) {
    console.error('Publish failed:', err);
    nostrPublishStatus.textContent = 'Error: ' + err.message;
    nostrPublishStatus.className = 'nostr-publish-status nostr-publish-status--error';
    nostrPublishBtn.disabled = false;
  }
}

// Export for use by game.js
window.NostrUI = {
  init: initNostrUI,
  showPublishOverlay,
  hidePublishOverlay,
  updatePlayerDisplay
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNostrUI);
} else {
  initNostrUI();
}

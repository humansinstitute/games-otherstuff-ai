import { authenticate } from './auth/nip98';
import { ApiError } from './lib/errors';
import * as playerRoutes from './routes/player';
import * as saveRoutes from './routes/save';
import * as inventoryRoutes from './routes/inventory';
import * as decorationRoutes from './routes/decorations';
import * as questRoutes from './routes/quests';
import * as coinRoutes from './routes/coins';
import * as timeRoutes from './routes/time';
import { join, resolve } from 'path';

const PORT = Number(process.env.PORT) || 3001;
const CLIENT_DIR = resolve(import.meta.dir, '../../');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
};

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function corsResponse(response: Response): Response {
  const headers = corsHeaders();
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // API routes
    if (path.startsWith('/api/')) {
      try {
        // Health check (no auth)
        if (path === '/api/health' && method === 'GET') {
          return corsResponse(Response.json({ status: 'ok', timestamp: Date.now() }));
        }

        // All other routes require NIP-98 auth
        const pubkey = authenticate(req);

        const response = await route(method, path, pubkey, req);
        return corsResponse(response);
      } catch (err) {
        if (err instanceof ApiError) {
          return corsResponse(err.toResponse());
        }
        console.error('Unhandled error:', err);
        return corsResponse(Response.json({ error: 'Internal server error' }, { status: 500 }));
      }
    }

    // Static file serving — serve the game client
    return serveStatic(path);
  },
});

async function serveStatic(path: string): Promise<Response> {
  // Default to index.html
  let filePath = path === '/' ? '/index.html' : path;

  // Prevent directory traversal
  const resolved = resolve(CLIENT_DIR, '.' + filePath);
  if (!resolved.startsWith(CLIENT_DIR)) {
    return new Response('Forbidden', { status: 403 });
  }

  // Don't serve server directory or hidden files
  const relative = resolved.slice(CLIENT_DIR.length);
  if (relative.startsWith('/server') || relative.includes('/.')) {
    return new Response('Not found', { status: 404 });
  }

  const file = Bun.file(resolved);
  if (await file.exists()) {
    const ext = '.' + (filePath.split('.').pop() || '');
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    return new Response(file, {
      headers: { 'Content-Type': contentType },
    });
  }

  return new Response('Not found', { status: 404 });
}

async function route(method: string, path: string, pubkey: string, req: Request): Promise<Response> {
  // Player
  if (path === '/api/player' && method === 'POST') return playerRoutes.createPlayer(pubkey, req);
  if (path === '/api/player' && method === 'GET') return playerRoutes.getPlayer(pubkey);

  // Full save/load
  if (path === '/api/save' && method === 'GET') return saveRoutes.loadSave(pubkey);
  if (path === '/api/save' && method === 'PUT') return saveRoutes.writeSave(pubkey, req);

  // Inventory
  if (path === '/api/inventory' && method === 'GET') return inventoryRoutes.listInventory(pubkey);
  if (path === '/api/inventory/buy' && method === 'POST') return inventoryRoutes.buyItem(pubkey, req);
  if (path === '/api/inventory/equip' && method === 'POST') return inventoryRoutes.equipItem(pubkey, req);
  if (path === '/api/inventory/unequip' && method === 'POST') return inventoryRoutes.unequipSlot(pubkey, req);

  // Decorations
  if (path === '/api/decorations' && method === 'GET') return decorationRoutes.listDecorations(pubkey);
  if (path === '/api/decorations/place' && method === 'POST') return decorationRoutes.placeDecoration(pubkey, req);
  if (path === '/api/decorations/pickup' && method === 'POST') return decorationRoutes.pickupDecoration(pubkey, req);

  // Quests
  if (path === '/api/quests' && method === 'GET') return questRoutes.listQuests(pubkey);
  // PATCH /api/quests/:questId
  const questMatch = path.match(/^\/api\/quests\/([^/]+)$/);
  if (questMatch && method === 'PATCH') return questRoutes.updateQuest(pubkey, questMatch[1], req);

  // Coins
  if (path === '/api/coins/reward' && method === 'POST') return coinRoutes.addCoins(pubkey, req);
  if (path === '/api/coins/spend' && method === 'POST') return coinRoutes.spendCoins(pubkey, req);

  // Time
  if (path === '/api/time' && method === 'GET') return timeRoutes.getTime(pubkey);
  if (path === '/api/time/sleep' && method === 'POST') return timeRoutes.sleep(pubkey);
  if (path === '/api/time' && method === 'PATCH') return timeRoutes.updateTime(pubkey, req);

  return Response.json({ error: 'Not found' }, { status: 404 });
}

console.log(`Dumpling Town server running on http://localhost:${PORT}`);

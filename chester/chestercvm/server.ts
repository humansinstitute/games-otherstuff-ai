import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ApplesauceRelayPool, NostrServerTransport, PrivateKeySigner } from "@contextvm/sdk";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "fs";
import { randomBytes } from "crypto";
import { z } from "zod";
import { serve } from "bun";
import { initializeDatabase } from "./src/db.js";
import { jsonContent } from "./src/utils.js";
import { ChesterError } from "./src/errors.js";
import {
  registerPlayer,
  getPlayerProfile,
  getLeaderboard,
  getMyGames,
} from "./src/services/player-service.js";
import {
  createGame,
  getGameWithPlayers,
  listOpenGames,
  getMoves,
} from "./src/services/game-service.js";
import {
  requestJoin,
  withdrawRequest,
  listChallengers,
  acceptChallenger,
  declineChallenger,
} from "./src/services/challenger-service.js";
import {
  makeMove,
  resign,
  offerDraw,
  respondDraw,
} from "./src/services/move-service.js";

const ENV_PATH = ".env";
const RELAYS = process.env.RELAYS?.split(",") || [
  "wss://relay.contextvm.org",
  "wss://cvm.otherstuff.ai",
];

function ensureServerPrivateKey(): string {
  const existing = process.env.SERVER_PRIVATE_KEY;
  if (existing) return existing;

  const generated = randomBytes(32).toString("hex");
  try {
    let wrote = false;
    if (existsSync(ENV_PATH)) {
      const current = readFileSync(ENV_PATH, "utf8");
      if (!/SERVER_PRIVATE_KEY=/.test(current)) {
        const prefix = current.length && !current.endsWith("\n") ? "\n" : "";
        appendFileSync(ENV_PATH, `${prefix}SERVER_PRIVATE_KEY=${generated}\n`);
        wrote = true;
      }
    } else {
      writeFileSync(ENV_PATH, `SERVER_PRIVATE_KEY=${generated}\n`);
      wrote = true;
    }
    if (wrote) {
      console.log("Generated SERVER_PRIVATE_KEY and wrote to .env");
    } else {
      console.warn("SERVER_PRIVATE_KEY not set in .env; using generated key only for this run");
    }
  } catch (err) {
    console.warn("Failed to persist generated server key; using ephemeral key", err);
  }

  process.env.SERVER_PRIVATE_KEY = generated;
  return generated;
}

async function main() {
  const SERVER_PRIVATE_KEY_HEX = ensureServerPrivateKey();

  initializeDatabase();

  const signer = new PrivateKeySigner(SERVER_PRIVATE_KEY_HEX);
  const relayHandler = new ApplesauceRelayPool(RELAYS);
  const serverPubkey = await signer.getPublicKey();

  console.log(`Chester CVM Server`);
  console.log(`Server Public Key: ${serverPubkey}`);
  console.log(`Connecting to relays: ${RELAYS.join(", ")}`);

  const mcpServer = new McpServer({
    name: "Chester Chess Server",
    version: "1.0.0",
  });

  // Track registered tools for debug display
  const debugTools: Array<{ name: string; title: string; description: string; schema: unknown }> = [];

  function registerToolWithTracking(
    name: string,
    config: { title: string; description: string; inputSchema: unknown },
    handler: (...args: any[]) => any
  ) {
    debugTools.push({
      name,
      title: config.title,
      description: config.description,
      schema: config.inputSchema,
    });
    mcpServer.registerTool(name, config, handler);
  }

  // Health check tool
  registerToolWithTracking(
    "health",
    {
      title: "Health Check",
      description: "Check if the Chester server is running",
      inputSchema: {},
    },
    async () => jsonContent({ ok: true, version: "1.0.0" })
  );

  // Simple test tool with minimal schema
  registerToolWithTracking(
    "echo",
    {
      title: "Echo",
      description: "Echo back a message",
      inputSchema: {
        message: z.string().describe("Message to echo"),
      },
    },
    async ({ message }) => jsonContent({ echo: message })
  );

  // ============================================
  // Player Management Tools (WP3)
  // ============================================

  registerToolWithTracking(
    "register_player",
    {
      title: "Register Player",
      description: "Register a new player by their Nostr public key (hex)",
      inputSchema: {
        pubkey: z.string().length(64).describe("Nostr public key (64 hex characters)"),
        display_name: z.string().optional().describe("Optional display name"),
        is_ai: z.boolean().optional().describe("Whether this is an AI player"),
        ai_personality: z.object({
          skill_level: z.number().min(1).max(10),
          play_style: z.enum(["aggressive", "positional", "chaotic", "defensive"]),
          bio: z.string().optional(),
          trash_talk: z.boolean().optional(),
        }).optional().describe("AI personality config (required if is_ai is true)"),
      },
    },
    async ({ pubkey, display_name, is_ai, ai_personality }) => {
      try {
        const player = registerPlayer({
          pubkey,
          displayName: display_name,
          isAi: is_ai,
          aiPersonality: ai_personality,
        });
        return jsonContent({
          success: true,
          player: {
            pubkey: player.pubkey,
            display_name: player.display_name,
            rating: player.rating,
            games_played: player.games_played,
          },
        });
      } catch (error) {
        if (error instanceof ChesterError) {
          return jsonContent(error.toJSON());
        }
        return jsonContent({ error: "INTERNAL_ERROR", message: String(error) });
      }
    }
  );

  registerToolWithTracking(
    "get_player",
    {
      title: "Get Player",
      description: "Retrieve player profile and statistics",
      inputSchema: {
        pubkey: z.string().length(64).describe("Nostr public key (64 hex characters)"),
      },
    },
    async ({ pubkey }) => {
      try {
        const profile = getPlayerProfile(pubkey);
        return jsonContent(profile);
      } catch (error) {
        if (error instanceof ChesterError) {
          return jsonContent(error.toJSON());
        }
        return jsonContent({ error: "INTERNAL_ERROR", message: String(error) });
      }
    }
  );

  registerToolWithTracking(
    "get_leaderboard",
    {
      title: "Get Leaderboard",
      description: "Retrieve top players by rating",
      inputSchema: {
        limit: z.number().min(1).max(100).optional().describe("Number of players to return (default 20, max 100)"),
        include_ai: z.boolean().optional().describe("Include AI players (default true)"),
      },
    },
    async ({ limit, include_ai }) => {
      try {
        const leaderboard = getLeaderboard({ limit, includeAi: include_ai });
        return jsonContent({ leaderboard });
      } catch (error) {
        if (error instanceof ChesterError) {
          return jsonContent(error.toJSON());
        }
        return jsonContent({ error: "INTERNAL_ERROR", message: String(error) });
      }
    }
  );

  registerToolWithTracking(
    "get_my_games",
    {
      title: "Get My Games",
      description: "List games for a player",
      inputSchema: {
        player_pubkey: z.string().length(64).describe("Player's public key (64 hex characters)"),
        status_filter: z.enum(["open", "active", "completed", "abandoned", "cancelled"]).optional().describe("Filter by game status"),
        limit: z.number().min(1).max(100).optional().describe("Number of games to return (default 20, max 100)"),
      },
    },
    async ({ player_pubkey, status_filter, limit }) => {
      try {
        const games = getMyGames({
          playerPubkey: player_pubkey,
          statusFilter: status_filter,
          limit,
        });
        return jsonContent({ games });
      } catch (error) {
        if (error instanceof ChesterError) {
          return jsonContent(error.toJSON());
        }
        return jsonContent({ error: "INTERNAL_ERROR", message: String(error) });
      }
    }
  );

  // ============================================
  // Game Management Tools (WP4)
  // ============================================

  registerToolWithTracking(
    "create_game",
    {
      title: "Create Game",
      description: "Create a new game lobby",
      inputSchema: {
        host_pubkey: z.string().length(64).describe("Host's public key (64 hex characters)"),
        type: z.enum(["public", "private", "ai"]).describe("Game type"),
        host_color_preference: z.enum(["white", "black", "random"]).optional().describe("Host's color preference (default: random)"),
      },
    },
    async ({ host_pubkey, type, host_color_preference }) => {
      try {
        const game = createGame({
          hostPubkey: host_pubkey,
          type,
          colorPreference: host_color_preference,
        });
        return jsonContent({
          success: true,
          game: {
            id: game.id,
            status: game.status,
            type: game.type,
            host_pubkey: game.host_pubkey,
            host_color_preference: game.host_color_preference,
            created_at: game.created_at,
            share_url: `https://chester.otherstuff.ai/game/${game.id}`,
          },
        });
      } catch (error) {
        if (error instanceof ChesterError) {
          return jsonContent(error.toJSON());
        }
        return jsonContent({ error: "INTERNAL_ERROR", message: String(error) });
      }
    }
  );

  registerToolWithTracking(
    "list_open_games",
    {
      title: "List Open Games",
      description: "Find public games seeking opponents",
      inputSchema: {
        limit: z.number().min(1).max(100).optional().describe("Number of games to return (default 20, max 100)"),
        exclude_ai_hosts: z.boolean().optional().describe("Exclude games hosted by AI players (default false)"),
      },
    },
    async ({ limit, exclude_ai_hosts }) => {
      try {
        const games = listOpenGames({ limit, excludeAiHosts: exclude_ai_hosts });
        return jsonContent({ games });
      } catch (error) {
        if (error instanceof ChesterError) {
          return jsonContent(error.toJSON());
        }
        return jsonContent({ error: "INTERNAL_ERROR", message: String(error) });
      }
    }
  );

  registerToolWithTracking(
    "get_game",
    {
      title: "Get Game",
      description: "Retrieve full game state",
      inputSchema: {
        game_id: z.string().uuid().describe("Game ID"),
      },
    },
    async ({ game_id }) => {
      try {
        const game = getGameWithPlayers(game_id);
        return jsonContent(game);
      } catch (error) {
        if (error instanceof ChesterError) {
          return jsonContent(error.toJSON());
        }
        return jsonContent({ error: "INTERNAL_ERROR", message: String(error) });
      }
    }
  );

  registerToolWithTracking(
    "get_moves",
    {
      title: "Get Moves",
      description: "Retrieve move history for a game",
      inputSchema: {
        game_id: z.string().uuid().describe("Game ID"),
      },
    },
    async ({ game_id }) => {
      try {
        const moves = getMoves(game_id);
        return jsonContent(moves);
      } catch (error) {
        if (error instanceof ChesterError) {
          return jsonContent(error.toJSON());
        }
        return jsonContent({ error: "INTERNAL_ERROR", message: String(error) });
      }
    }
  );

  // ============================================
  // Challenger Flow Tools (WP5)
  // ============================================

  registerToolWithTracking(
    "request_join",
    {
      title: "Request Join",
      description: "Request to join an open game",
      inputSchema: {
        game_id: z.string().uuid().describe("Game ID"),
        requester_pubkey: z.string().length(64).describe("Requester's public key (64 hex characters)"),
      },
    },
    async ({ game_id, requester_pubkey }) => {
      try {
        const result = requestJoin({ gameId: game_id, requesterPubkey: requester_pubkey });
        return jsonContent({ success: true, ...result });
      } catch (error) {
        if (error instanceof ChesterError) {
          return jsonContent(error.toJSON());
        }
        return jsonContent({ error: "INTERNAL_ERROR", message: String(error) });
      }
    }
  );

  registerToolWithTracking(
    "withdraw_request",
    {
      title: "Withdraw Request",
      description: "Cancel a pending join request",
      inputSchema: {
        game_id: z.string().uuid().describe("Game ID"),
        requester_pubkey: z.string().length(64).describe("Requester's public key (64 hex characters)"),
      },
    },
    async ({ game_id, requester_pubkey }) => {
      try {
        withdrawRequest({ gameId: game_id, requesterPubkey: requester_pubkey });
        return jsonContent({ success: true });
      } catch (error) {
        if (error instanceof ChesterError) {
          return jsonContent(error.toJSON());
        }
        return jsonContent({ error: "INTERNAL_ERROR", message: String(error) });
      }
    }
  );

  registerToolWithTracking(
    "list_challengers",
    {
      title: "List Challengers",
      description: "View all players requesting to join a game",
      inputSchema: {
        game_id: z.string().uuid().describe("Game ID"),
        host_pubkey: z.string().length(64).describe("Host's public key for authorization (64 hex characters)"),
      },
    },
    async ({ game_id, host_pubkey }) => {
      try {
        // TODO: Verify host_pubkey matches extra.authInfo.pubkey for proper auth
        const challengers = listChallengers(game_id);
        return jsonContent({ challengers });
      } catch (error) {
        if (error instanceof ChesterError) {
          return jsonContent(error.toJSON());
        }
        return jsonContent({ error: "INTERNAL_ERROR", message: String(error) });
      }
    }
  );

  registerToolWithTracking(
    "accept_challenger",
    {
      title: "Accept Challenger",
      description: "Accept a challenger and start the game",
      inputSchema: {
        game_id: z.string().uuid().describe("Game ID"),
        host_pubkey: z.string().length(64).describe("Host's public key (64 hex characters)"),
        challenger_pubkey: z.string().length(64).describe("Challenger's public key (64 hex characters)"),
      },
    },
    async ({ game_id, host_pubkey, challenger_pubkey }) => {
      try {
        const result = acceptChallenger({
          gameId: game_id,
          hostPubkey: host_pubkey,
          challengerPubkey: challenger_pubkey,
        });
        return jsonContent({ success: true, game: result });
      } catch (error) {
        if (error instanceof ChesterError) {
          return jsonContent(error.toJSON());
        }
        return jsonContent({ error: "INTERNAL_ERROR", message: String(error) });
      }
    }
  );

  registerToolWithTracking(
    "decline_challenger",
    {
      title: "Decline Challenger",
      description: "Reject a challenger's request",
      inputSchema: {
        game_id: z.string().uuid().describe("Game ID"),
        host_pubkey: z.string().length(64).describe("Host's public key (64 hex characters)"),
        challenger_pubkey: z.string().length(64).describe("Challenger's public key (64 hex characters)"),
      },
    },
    async ({ game_id, host_pubkey, challenger_pubkey }) => {
      try {
        declineChallenger({
          gameId: game_id,
          hostPubkey: host_pubkey,
          challengerPubkey: challenger_pubkey,
        });
        return jsonContent({ success: true });
      } catch (error) {
        if (error instanceof ChesterError) {
          return jsonContent(error.toJSON());
        }
        return jsonContent({ error: "INTERNAL_ERROR", message: String(error) });
      }
    }
  );

  // ============================================
  // Gameplay Tools (WP6, WP7)
  // ============================================

  registerToolWithTracking(
    "make_move",
    {
      title: "Make Move",
      description: "Submit a chess move (SAN or UCI format)",
      inputSchema: {
        game_id: z.string().uuid().describe("Game ID"),
        player_pubkey: z.string().length(64).describe("Player's public key (64 hex characters)"),
        move: z.string().describe("Chess move in SAN (e.g., 'Nf3') or UCI (e.g., 'g1f3') format"),
      },
    },
    async ({ game_id, player_pubkey, move }) => {
      try {
        const result = makeMove({ gameId: game_id, playerPubkey: player_pubkey, move });
        return jsonContent({ success: true, game: result });
      } catch (error) {
        if (error instanceof ChesterError) {
          return jsonContent(error.toJSON());
        }
        return jsonContent({ error: "INTERNAL_ERROR", message: String(error) });
      }
    }
  );

  registerToolWithTracking(
    "resign",
    {
      title: "Resign",
      description: "Forfeit the game",
      inputSchema: {
        game_id: z.string().uuid().describe("Game ID"),
        player_pubkey: z.string().length(64).describe("Player's public key (64 hex characters)"),
      },
    },
    async ({ game_id, player_pubkey }) => {
      try {
        const result = resign({ gameId: game_id, playerPubkey: player_pubkey });
        return jsonContent({ success: true, game: result });
      } catch (error) {
        if (error instanceof ChesterError) {
          return jsonContent(error.toJSON());
        }
        return jsonContent({ error: "INTERNAL_ERROR", message: String(error) });
      }
    }
  );

  registerToolWithTracking(
    "offer_draw",
    {
      title: "Offer Draw",
      description: "Propose a draw to your opponent",
      inputSchema: {
        game_id: z.string().uuid().describe("Game ID"),
        player_pubkey: z.string().length(64).describe("Player's public key (64 hex characters)"),
      },
    },
    async ({ game_id, player_pubkey }) => {
      try {
        const result = offerDraw({ gameId: game_id, playerPubkey: player_pubkey });
        return jsonContent({ success: true, ...result });
      } catch (error) {
        if (error instanceof ChesterError) {
          return jsonContent(error.toJSON());
        }
        return jsonContent({ error: "INTERNAL_ERROR", message: String(error) });
      }
    }
  );

  registerToolWithTracking(
    "respond_draw",
    {
      title: "Respond to Draw",
      description: "Accept or decline a draw offer",
      inputSchema: {
        game_id: z.string().uuid().describe("Game ID"),
        player_pubkey: z.string().length(64).describe("Player's public key (64 hex characters)"),
        accept: z.boolean().describe("Whether to accept the draw"),
      },
    },
    async ({ game_id, player_pubkey, accept }) => {
      try {
        const result = respondDraw({ gameId: game_id, playerPubkey: player_pubkey, accept });
        return jsonContent({ success: true, ...result });
      } catch (error) {
        if (error instanceof ChesterError) {
          return jsonContent(error.toJSON());
        }
        return jsonContent({ error: "INTERNAL_ERROR", message: String(error) });
      }
    }
  );

  // TODO: Register admin tools (WP11)

  // Start debug HTTP server on port 49021
  const DEBUG_PORT = 49021;
  serve({
    port: DEBUG_PORT,
    fetch: async (req) => {
      const url = new URL(req.url);

      if (url.pathname === "/api/tools") {
        return new Response(JSON.stringify(debugTools, null, 2), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      // Serve main debug page
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>Chester CVM Debug</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; background: #1a1a2e; color: #eee; }
    h1 { color: #7c3aed; }
    .tool { background: #16213e; border-radius: 8px; padding: 16px; margin: 12px 0; border-left: 4px solid #7c3aed; }
    .tool-name { font-size: 18px; font-weight: bold; color: #a78bfa; }
    .tool-title { color: #888; font-size: 14px; }
    .tool-desc { margin: 8px 0; }
    .tool-schema { background: #0f0f23; padding: 12px; border-radius: 4px; font-family: monospace; font-size: 12px; overflow-x: auto; white-space: pre-wrap; }
    .count { background: #7c3aed; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px; }
    .server-info { background: #16213e; padding: 16px; border-radius: 8px; margin-bottom: 20px; }
    .loading { color: #888; }
  </style>
</head>
<body>
  <h1>Chester CVM Debug Server</h1>
  <div class="server-info">
    <strong>Server Public Key:</strong> ${serverPubkey}<br>
    <strong>Relays:</strong> ${RELAYS.join(", ")}<br>
    <strong>Version:</strong> 1.0.0
  </div>
  <h2>Registered Tools <span class="count" id="tool-count">...</span></h2>
  <div id="tools" class="loading">Loading tools...</div>

  <script>
    fetch('/api/tools')
      .then(r => r.json())
      .then(tools => {
        document.getElementById('tool-count').textContent = tools.length;
        if (tools.length === 0) {
          document.getElementById('tools').innerHTML = '<p>No tools found! Check server registration.</p>';
          return;
        }
        document.getElementById('tools').innerHTML = tools.map(t => \`
          <div class="tool">
            <div class="tool-name">\${t.name}</div>
            <div class="tool-title">\${t.title || ''}</div>
            <div class="tool-desc">\${t.description || 'No description'}</div>
            <div class="tool-schema">\${JSON.stringify(t.schema, null, 2)}</div>
          </div>
        \`).join('');
      })
      .catch(e => {
        document.getElementById('tools').innerHTML = '<p style="color:red">Error: ' + e.message + '</p>';
      });
  </script>
</body>
</html>`;
      return new Response(html, { headers: { "Content-Type": "text/html" } });
    },
  });
  console.log(`Debug server running at http://localhost:${DEBUG_PORT}`);

  const nostrTransport = new NostrServerTransport({
    signer,
    relayHandler,
  });

  mcpServer.connect(nostrTransport);

  console.log("Server started and listening for requests...");
}

main().catch((err) => {
  console.error("Fatal error starting server", err);
  process.exit(1);
});

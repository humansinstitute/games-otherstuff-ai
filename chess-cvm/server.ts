import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TextContent } from "@modelcontextprotocol/sdk/types.js";
import { ApplesauceRelayPool, NostrServerTransport, PrivateKeySigner } from "@contextvm/sdk";
import { existsSync, appendFileSync, readFileSync, writeFileSync } from "fs";
import { randomBytes } from "crypto";
import { z } from "zod";
import { initializeDatabase } from "./src/db.js";
import {
  createGame,
  createPlayer,
  getGameState,
  getGamesForPlayer,
  getPlayer,
  registerGamePlayers,
  submitMove,
  resignGame,
  offerDraw,
  acceptDraw,
  undoLastMove,
  listOpenGames,
  listActiveGames,
} from "./src/chess-service.js";

const ENV_PATH = ".env";
const RELAYS = process.env.RELAYS?.split(",") || [
  "wss://relay.contextvm.org",
  "wss://cvm.otherstuff.ai",
];

function jsonContent(payload: unknown): { content: TextContent[] } {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

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
  const relayPool = new ApplesauceRelayPool(RELAYS);
  const serverPubkey = await signer.getPublicKey();

  console.log(`Server Public Key: ${serverPubkey}`);
  console.log("Connecting to relays...");

  const mcpServer = new McpServer({
    name: "Chess CVM Server",
    version: "0.1.0",
  });

  mcpServer.registerTool(
    "setup_player",
    {
      title: "Setup Player",
      description: "Create a player record (handle must be unique)",
      inputSchema: {
        handle: z.string().min(2).describe("Unique player handle"),
        displayName: z.string().min(2).describe("Human friendly display name"),
      },
    },
    async ({ handle, displayName }) => {
      try {
        const player = createPlayer(handle, displayName);
        return jsonContent(player);
      } catch (error) {
        return jsonContent({ error: error instanceof Error ? error.message : String(error) });
      }
    }
  );

  mcpServer.registerTool(
    "get_player",
    {
      title: "Get Player",
      description: "Fetch a player by handle",
      inputSchema: { handle: z.string().describe("Player handle") },
    },
    async ({ handle }) => {
      try {
        const player = getPlayer({ handle });
        if (!player) return jsonContent({ error: "Not found", handle });
        return jsonContent(player);
      } catch (error) {
        return jsonContent({ error: error instanceof Error ? error.message : String(error) });
      }
    }
  );

  mcpServer.registerTool(
    "setup_game",
    {
      title: "Setup Game",
      description: "Create a new game, optionally seeding white/black players",
      inputSchema: {
        whiteHandle: z.string().optional().describe("Handle for white player"),
        blackHandle: z.string().optional().describe("Handle for black player"),
        whiteSecret: z.string().optional().describe("Secret for white (hash stored server-side)"),
        blackSecret: z.string().optional().describe("Secret for black (hash stored server-side)"),
      },
    },
    async ({ whiteHandle, blackHandle, whiteSecret, blackSecret }) => {
      try {
        const game = createGame({ whiteHandle, blackHandle, whiteSecret, blackSecret });
        return jsonContent(game);
      } catch (error) {
        return jsonContent({ error: error instanceof Error ? error.message : String(error) });
      }
    }
  );

  mcpServer.registerTool(
    "register_game",
    {
      title: "Register Game Players",
      description: "Assign both players to an existing game and activate it",
      inputSchema: {
        gameId: z.number().describe("Existing game id"),
        whiteHandle: z.string().describe("Handle for white player"),
        blackHandle: z.string().describe("Handle for black player"),
        whiteSecret: z.string().describe("Secret for white (hash stored server-side)"),
        blackSecret: z.string().describe("Secret for black (hash stored server-side)"),
      },
    },
    async ({ gameId, whiteHandle, blackHandle, whiteSecret, blackSecret }) => {
      try {
        const game = registerGamePlayers({ gameId, whiteHandle, blackHandle, whiteSecret, blackSecret });
        return jsonContent(game);
      } catch (error) {
        return jsonContent({ error: error instanceof Error ? error.message : String(error) });
      }
    }
  );

  mcpServer.registerTool(
    "get_game_state",
    {
      title: "Get Game State",
      description: "Return the game, players, and moves for a game id",
      inputSchema: { gameId: z.number().describe("Existing game id") },
    },
    async ({ gameId }) => {
      try {
        const state = getGameState(gameId);
        return jsonContent(state);
      } catch (error) {
        return jsonContent({ error: error instanceof Error ? error.message : String(error) });
      }
    }
  );

  mcpServer.registerTool(
    "submit_move",
    {
      title: "Submit Move",
      description: "Validate and record a move (SAN/lan) for a game",
      inputSchema: {
        gameId: z.number().describe("Existing game id"),
        playerHandle: z.string().describe("Handle of the player making the move"),
        move: z.string().describe("Move in SAN or coordinate notation (e.g., e4, Nf3)"),
        secret: z.string().describe("Player secret for auth"),
      },
    },
    async ({ gameId, playerHandle, move, secret }) => {
      try {
        const state = submitMove({ gameId, playerHandle, move, secret });
        return jsonContent(state);
      } catch (error) {
        return jsonContent({ error: error instanceof Error ? error.message : String(error) });
      }
    }
  );

  mcpServer.registerTool(
    "resign_game",
    {
      title: "Resign Game",
      description: "Resign from an active game; opponent is marked winner",
      inputSchema: {
        gameId: z.number().describe("Existing game id"),
        playerHandle: z.string().describe("Handle of the player resigning"),
        secret: z.string().describe("Player secret for auth"),
      },
    },
    async ({ gameId, playerHandle, secret }) => {
      try {
        const state = resignGame({ gameId, playerHandle, secret });
        return jsonContent(state);
      } catch (error) {
        return jsonContent({ error: error instanceof Error ? error.message : String(error) });
      }
    }
  );

  mcpServer.registerTool(
    "offer_draw",
    {
      title: "Offer Draw",
      description: "Create a draw offer on an active game",
      inputSchema: {
        gameId: z.number().describe("Existing game id"),
        playerHandle: z.string().describe("Handle making the draw offer"),
        secret: z.string().describe("Player secret for auth"),
      },
    },
    async ({ gameId, playerHandle, secret }) => {
      try {
        const state = offerDraw({ gameId, playerHandle, secret });
        return jsonContent(state);
      } catch (error) {
        return jsonContent({ error: error instanceof Error ? error.message : String(error) });
      }
    }
  );

  mcpServer.registerTool(
    "accept_draw",
    {
      title: "Accept Draw",
      description: "Accept a pending draw offer on an active game",
      inputSchema: {
        gameId: z.number().describe("Existing game id"),
        playerHandle: z.string().describe("Handle accepting the draw offer"),
        secret: z.string().describe("Player secret for auth"),
      },
    },
    async ({ gameId, playerHandle, secret }) => {
      try {
        const state = acceptDraw({ gameId, playerHandle, secret });
        return jsonContent(state);
      } catch (error) {
        return jsonContent({ error: error instanceof Error ? error.message : String(error) });
      }
    }
  );

  mcpServer.registerTool(
    "undo_last_move",
    {
      title: "Undo Last Move",
      description: "Roll back the most recent move; can require opponent confirmation",
      inputSchema: {
        gameId: z.number().describe("Existing game id"),
        requesterHandle: z.string().describe("Handle requesting the undo"),
        secret: z.string().describe("Player secret for auth"),
        confirmByOpponent: z.boolean().optional().describe("Require explicit opponent confirmation"),
        opponentConfirmed: z.boolean().optional().describe("Set true when opponent approves"),
        opponentHandle: z.string().optional().describe("Opponent handle (recommended when confirming)"),
      },
    },
    async ({ gameId, requesterHandle, secret, confirmByOpponent, opponentConfirmed, opponentHandle }) => {
      try {
        const state = undoLastMove({ gameId, requesterHandle, secret, confirmByOpponent, opponentConfirmed, opponentHandle });
        return jsonContent(state);
      } catch (error) {
        return jsonContent({ error: error instanceof Error ? error.message : String(error) });
      }
    }
  );

  mcpServer.registerTool(
    "list_open_games",
    {
      title: "List Open Games",
      description: "Games in pending state (need players)",
      inputSchema: {},
    },
    async () => {
      try {
        const games = listOpenGames();
        return jsonContent(games);
      } catch (error) {
        return jsonContent({ error: error instanceof Error ? error.message : String(error) });
      }
    }
  );

  mcpServer.registerTool(
    "list_active_games",
    {
      title: "List Active Games",
      description: "Games currently in progress",
      inputSchema: {},
    },
    async () => {
      try {
        const games = listActiveGames();
        return jsonContent(games);
      } catch (error) {
        return jsonContent({ error: error instanceof Error ? error.message : String(error) });
      }
    }
  );

  mcpServer.registerTool(
    "get_games_for_player",
    {
      title: "List Games for Player",
      description: "List games where the player is white or black",
      inputSchema: { playerHandle: z.string().describe("Player handle") },
    },
    async ({ playerHandle }) => {
      try {
        const games = getGamesForPlayer(playerHandle);
        return jsonContent(games);
      } catch (error) {
        return jsonContent({ error: error instanceof Error ? error.message : String(error) });
      }
    }
  );

  mcpServer.registerTool(
    "health",
    {
      title: "Health",
      description: "Simple connectivity check",
      inputSchema: {},
    },
    async () => jsonContent({ ok: true })
  );

  const serverTransport = new NostrServerTransport({
    signer,
    relayHandler: relayPool,
    serverInfo: { name: "Chess CVM Backend" },
  });

  await mcpServer.connect(serverTransport);
  console.log("Chess CVM server is running via Nostr relays. Press Ctrl+C to stop.");
}

main().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});

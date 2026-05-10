import { Client } from "@modelcontextprotocol/sdk/client";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  NostrClientTransport,
  type NostrTransportOptions,
  PrivateKeySigner,
  ApplesauceRelayPool,
} from "@contextvm/sdk";

export type HealthInput = Record<string, unknown>;

export interface HealthOutput {
  [k: string]: unknown;
}

export interface EchoInput {
  /**
   * Message to echo
   */
  message: string;
}

export interface EchoOutput {
  [k: string]: unknown;
}

export interface RegisterPlayerInput {
  /**
   * Nostr public key (64 hex characters)
   */
  pubkey: string;
  /**
   * Optional display name
   */
  display_name?: string;
  /**
   * Whether this is an AI player
   */
  is_ai?: boolean;
  /**
   * AI personality config (required if is_ai is true)
   */
  ai_personality?: {
    skill_level: number;
    play_style: "aggressive" | "positional" | "chaotic" | "defensive";
    bio?: string;
    trash_talk?: boolean;
  };
}

export interface RegisterPlayerOutput {
  [k: string]: unknown;
}

export interface GetPlayerInput {
  /**
   * Nostr public key (64 hex characters)
   */
  pubkey: string;
}

export interface GetPlayerOutput {
  [k: string]: unknown;
}

export interface GetLeaderboardInput {
  /**
   * Number of players to return (default 20, max 100)
   */
  limit?: number;
  /**
   * Include AI players (default true)
   */
  include_ai?: boolean;
}

export interface GetLeaderboardOutput {
  [k: string]: unknown;
}

export interface GetMyGamesInput {
  /**
   * Player's public key (64 hex characters)
   */
  player_pubkey: string;
  /**
   * Filter by game status
   */
  status_filter?: "open" | "active" | "completed" | "abandoned" | "cancelled";
  /**
   * Number of games to return (default 20, max 100)
   */
  limit?: number;
}

export interface GetMyGamesOutput {
  [k: string]: unknown;
}

export interface CreateGameInput {
  /**
   * Host's public key (64 hex characters)
   */
  host_pubkey: string;
  /**
   * Game type
   */
  type: "public" | "private" | "ai";
  /**
   * Host's color preference (default: random)
   */
  host_color_preference?: "white" | "black" | "random";
}

export interface CreateGameOutput {
  [k: string]: unknown;
}

export interface ListOpenGamesInput {
  /**
   * Number of games to return (default 20, max 100)
   */
  limit?: number;
  /**
   * Exclude games hosted by AI players (default false)
   */
  exclude_ai_hosts?: boolean;
}

export interface ListOpenGamesOutput {
  [k: string]: unknown;
}

export interface GetGameInput {
  /**
   * Game ID
   */
  game_id: string;
}

export interface GetGameOutput {
  [k: string]: unknown;
}

export interface GetMovesInput {
  /**
   * Game ID
   */
  game_id: string;
}

export interface GetMovesOutput {
  [k: string]: unknown;
}

export interface RequestJoinInput {
  /**
   * Game ID
   */
  game_id: string;
  /**
   * Requester's public key (64 hex characters)
   */
  requester_pubkey: string;
}

export interface RequestJoinOutput {
  [k: string]: unknown;
}

export interface WithdrawRequestInput {
  /**
   * Game ID
   */
  game_id: string;
  /**
   * Requester's public key (64 hex characters)
   */
  requester_pubkey: string;
}

export interface WithdrawRequestOutput {
  [k: string]: unknown;
}

export interface ListChallengersInput {
  /**
   * Game ID
   */
  game_id: string;
  /**
   * Host's public key for authorization (64 hex characters)
   */
  host_pubkey: string;
}

export interface ListChallengersOutput {
  [k: string]: unknown;
}

export interface AcceptChallengerInput {
  /**
   * Game ID
   */
  game_id: string;
  /**
   * Host's public key (64 hex characters)
   */
  host_pubkey: string;
  /**
   * Challenger's public key (64 hex characters)
   */
  challenger_pubkey: string;
}

export interface AcceptChallengerOutput {
  [k: string]: unknown;
}

export interface DeclineChallengerInput {
  /**
   * Game ID
   */
  game_id: string;
  /**
   * Host's public key (64 hex characters)
   */
  host_pubkey: string;
  /**
   * Challenger's public key (64 hex characters)
   */
  challenger_pubkey: string;
}

export interface DeclineChallengerOutput {
  [k: string]: unknown;
}

export interface MakeMoveInput {
  /**
   * Game ID
   */
  game_id: string;
  /**
   * Player's public key (64 hex characters)
   */
  player_pubkey: string;
  /**
   * Chess move in SAN (e.g., 'Nf3') or UCI (e.g., 'g1f3') format
   */
  move: string;
}

export interface MakeMoveOutput {
  [k: string]: unknown;
}

export interface ResignInput {
  /**
   * Game ID
   */
  game_id: string;
  /**
   * Player's public key (64 hex characters)
   */
  player_pubkey: string;
}

export interface ResignOutput {
  [k: string]: unknown;
}

export interface OfferDrawInput {
  /**
   * Game ID
   */
  game_id: string;
  /**
   * Player's public key (64 hex characters)
   */
  player_pubkey: string;
}

export interface OfferDrawOutput {
  [k: string]: unknown;
}

export interface RespondDrawInput {
  /**
   * Game ID
   */
  game_id: string;
  /**
   * Player's public key (64 hex characters)
   */
  player_pubkey: string;
  /**
   * Whether to accept the draw
   */
  accept: boolean;
}

export interface RespondDrawOutput {
  [k: string]: unknown;
}

export type Chestervm = {
  Health: (args: HealthInput) => Promise<HealthOutput>;
  Echo: (message: string) => Promise<EchoOutput>;
  RegisterPlayer: (pubkey: string, display_name?: string, is_ai?: boolean, ai_personality?: object) => Promise<RegisterPlayerOutput>;
  GetPlayer: (pubkey: string) => Promise<GetPlayerOutput>;
  GetLeaderboard: (limit?: number, include_ai?: boolean) => Promise<GetLeaderboardOutput>;
  GetMyGames: (player_pubkey: string, status_filter?: string, limit?: number) => Promise<GetMyGamesOutput>;
  CreateGame: (host_pubkey: string, type: string, host_color_preference?: string) => Promise<CreateGameOutput>;
  ListOpenGames: (limit?: number, exclude_ai_hosts?: boolean) => Promise<ListOpenGamesOutput>;
  GetGame: (game_id: string) => Promise<GetGameOutput>;
  GetMoves: (game_id: string) => Promise<GetMovesOutput>;
  RequestJoin: (game_id: string, requester_pubkey: string) => Promise<RequestJoinOutput>;
  WithdrawRequest: (game_id: string, requester_pubkey: string) => Promise<WithdrawRequestOutput>;
  ListChallengers: (game_id: string, host_pubkey: string) => Promise<ListChallengersOutput>;
  AcceptChallenger: (game_id: string, host_pubkey: string, challenger_pubkey: string) => Promise<AcceptChallengerOutput>;
  DeclineChallenger: (game_id: string, host_pubkey: string, challenger_pubkey: string) => Promise<DeclineChallengerOutput>;
  MakeMove: (game_id: string, player_pubkey: string, move: string) => Promise<MakeMoveOutput>;
  Resign: (game_id: string, player_pubkey: string) => Promise<ResignOutput>;
  OfferDraw: (game_id: string, player_pubkey: string) => Promise<OfferDrawOutput>;
  RespondDraw: (game_id: string, player_pubkey: string, accept: boolean) => Promise<RespondDrawOutput>;
};

export class ChestervmClient implements Chestervm {
  static readonly SERVER_PUBKEY = "4441c3e022f869fdca29cfda339674948c1b0a0cf984bbb815e4fd239b1209d7";
  static readonly DEFAULT_RELAYS = ["wss://relay.contextvm.org"];
  private client: Client;
  private transport: Transport;

  constructor(
    options: Partial<NostrTransportOptions> & { privateKey?: string; relays?: string[] } = {}
  ) {
    this.client = new Client({
      name: "ChestervmClient",
      version: "1.0.0",
    });

    // Private key precedence: constructor options > config file
    const resolvedPrivateKey = options.privateKey ||
      "";

    const {
      privateKey: _,
      relays = ChestervmClient.DEFAULT_RELAYS,
      signer = new PrivateKeySigner(resolvedPrivateKey),
      relayHandler = new ApplesauceRelayPool(relays),
 			serverPubkey,
      ...rest
    } = options;

    this.transport = new NostrClientTransport({
      serverPubkey: serverPubkey || ChestervmClient.SERVER_PUBKEY,
      signer,
      relayHandler,
      isStateless: true,
      ...rest,
    });

    // Auto-connect in constructor
    this.client.connect(this.transport).catch((error) => {
      console.error(`Failed to connect to server: ${error}`);
    });
  }

  async disconnect(): Promise<void> {
    await this.transport.close();
  }

  private async call<T = unknown>(
    name: string,
    args: Record<string, unknown>
  ): Promise<T> {
    const result = await this.client.callTool({
      name,
      arguments: { ...args },
    });
    return result.structuredContent as T;
  }

    /**
   * Check if the Chester server is running
   * @returns {Promise<HealthOutput>} The result of the health operation
   */
  async Health(
    args: HealthInput
  ): Promise<HealthOutput> {
    return this.call("health", args);
  }

    /**
   * Echo back a message
   * @param {string} message Message to echo
   * @returns {Promise<EchoOutput>} The result of the echo operation
   */
  async Echo(
    message: string
  ): Promise<EchoOutput> {
    return this.call("echo", { message });
  }

    /**
   * Register a new player by their Nostr public key (hex)
   * @param {string} pubkey Nostr public key (64 hex characters)
   * @param {string} display_name [optional] Optional display name
   * @param {boolean} is_ai [optional] Whether this is an AI player
   * @param {object} ai_personality [optional] AI personality config (required if is_ai is true)
   * @returns {Promise<RegisterPlayerOutput>} The result of the register_player operation
   */
  async RegisterPlayer(
    pubkey: string, display_name?: string, is_ai?: boolean, ai_personality?: object
  ): Promise<RegisterPlayerOutput> {
    return this.call("register_player", { pubkey, display_name, is_ai, ai_personality });
  }

    /**
   * Retrieve player profile and statistics
   * @param {string} pubkey Nostr public key (64 hex characters)
   * @returns {Promise<GetPlayerOutput>} The result of the get_player operation
   */
  async GetPlayer(
    pubkey: string
  ): Promise<GetPlayerOutput> {
    return this.call("get_player", { pubkey });
  }

    /**
   * Retrieve top players by rating
   * @param {number} limit [optional] Number of players to return (default 20, max 100)
   * @param {boolean} include_ai [optional] Include AI players (default true)
   * @returns {Promise<GetLeaderboardOutput>} The result of the get_leaderboard operation
   */
  async GetLeaderboard(
    limit?: number, include_ai?: boolean
  ): Promise<GetLeaderboardOutput> {
    return this.call("get_leaderboard", { limit, include_ai });
  }

    /**
   * List games for a player
   * @param {string} player_pubkey Player's public key (64 hex characters)
   * @param {string} status_filter [optional] Filter by game status
   * @param {number} limit [optional] Number of games to return (default 20, max 100)
   * @returns {Promise<GetMyGamesOutput>} The result of the get_my_games operation
   */
  async GetMyGames(
    player_pubkey: string, status_filter?: string, limit?: number
  ): Promise<GetMyGamesOutput> {
    return this.call("get_my_games", { player_pubkey, status_filter, limit });
  }

    /**
   * Create a new game lobby
   * @param {string} host_pubkey Host's public key (64 hex characters)
   * @param {string} type Game type
   * @param {string} host_color_preference [optional] Host's color preference (default: random)
   * @returns {Promise<CreateGameOutput>} The result of the create_game operation
   */
  async CreateGame(
    host_pubkey: string, type: string, host_color_preference?: string
  ): Promise<CreateGameOutput> {
    return this.call("create_game", { host_pubkey, type, host_color_preference });
  }

    /**
   * Find public games seeking opponents
   * @param {number} limit [optional] Number of games to return (default 20, max 100)
   * @param {boolean} exclude_ai_hosts [optional] Exclude games hosted by AI players (default false)
   * @returns {Promise<ListOpenGamesOutput>} The result of the list_open_games operation
   */
  async ListOpenGames(
    limit?: number, exclude_ai_hosts?: boolean
  ): Promise<ListOpenGamesOutput> {
    return this.call("list_open_games", { limit, exclude_ai_hosts });
  }

    /**
   * Retrieve full game state
   * @param {string} game_id Game ID
   * @returns {Promise<GetGameOutput>} The result of the get_game operation
   */
  async GetGame(
    game_id: string
  ): Promise<GetGameOutput> {
    return this.call("get_game", { game_id });
  }

    /**
   * Retrieve move history for a game
   * @param {string} game_id Game ID
   * @returns {Promise<GetMovesOutput>} The result of the get_moves operation
   */
  async GetMoves(
    game_id: string
  ): Promise<GetMovesOutput> {
    return this.call("get_moves", { game_id });
  }

    /**
   * Request to join an open game
   * @param {string} game_id Game ID
   * @param {string} requester_pubkey Requester's public key (64 hex characters)
   * @returns {Promise<RequestJoinOutput>} The result of the request_join operation
   */
  async RequestJoin(
    game_id: string, requester_pubkey: string
  ): Promise<RequestJoinOutput> {
    return this.call("request_join", { game_id, requester_pubkey });
  }

    /**
   * Cancel a pending join request
   * @param {string} game_id Game ID
   * @param {string} requester_pubkey Requester's public key (64 hex characters)
   * @returns {Promise<WithdrawRequestOutput>} The result of the withdraw_request operation
   */
  async WithdrawRequest(
    game_id: string, requester_pubkey: string
  ): Promise<WithdrawRequestOutput> {
    return this.call("withdraw_request", { game_id, requester_pubkey });
  }

    /**
   * View all players requesting to join a game
   * @param {string} game_id Game ID
   * @param {string} host_pubkey Host's public key for authorization (64 hex characters)
   * @returns {Promise<ListChallengersOutput>} The result of the list_challengers operation
   */
  async ListChallengers(
    game_id: string, host_pubkey: string
  ): Promise<ListChallengersOutput> {
    return this.call("list_challengers", { game_id, host_pubkey });
  }

    /**
   * Accept a challenger and start the game
   * @param {string} game_id Game ID
   * @param {string} host_pubkey Host's public key (64 hex characters)
   * @param {string} challenger_pubkey Challenger's public key (64 hex characters)
   * @returns {Promise<AcceptChallengerOutput>} The result of the accept_challenger operation
   */
  async AcceptChallenger(
    game_id: string, host_pubkey: string, challenger_pubkey: string
  ): Promise<AcceptChallengerOutput> {
    return this.call("accept_challenger", { game_id, host_pubkey, challenger_pubkey });
  }

    /**
   * Reject a challenger's request
   * @param {string} game_id Game ID
   * @param {string} host_pubkey Host's public key (64 hex characters)
   * @param {string} challenger_pubkey Challenger's public key (64 hex characters)
   * @returns {Promise<DeclineChallengerOutput>} The result of the decline_challenger operation
   */
  async DeclineChallenger(
    game_id: string, host_pubkey: string, challenger_pubkey: string
  ): Promise<DeclineChallengerOutput> {
    return this.call("decline_challenger", { game_id, host_pubkey, challenger_pubkey });
  }

    /**
   * Submit a chess move (SAN or UCI format)
   * @param {string} game_id Game ID
   * @param {string} player_pubkey Player's public key (64 hex characters)
   * @param {string} move Chess move in SAN (e.g., 'Nf3') or UCI (e.g., 'g1f3') format
   * @returns {Promise<MakeMoveOutput>} The result of the make_move operation
   */
  async MakeMove(
    game_id: string, player_pubkey: string, move: string
  ): Promise<MakeMoveOutput> {
    return this.call("make_move", { game_id, player_pubkey, move });
  }

    /**
   * Forfeit the game
   * @param {string} game_id Game ID
   * @param {string} player_pubkey Player's public key (64 hex characters)
   * @returns {Promise<ResignOutput>} The result of the resign operation
   */
  async Resign(
    game_id: string, player_pubkey: string
  ): Promise<ResignOutput> {
    return this.call("resign", { game_id, player_pubkey });
  }

    /**
   * Propose a draw to your opponent
   * @param {string} game_id Game ID
   * @param {string} player_pubkey Player's public key (64 hex characters)
   * @returns {Promise<OfferDrawOutput>} The result of the offer_draw operation
   */
  async OfferDraw(
    game_id: string, player_pubkey: string
  ): Promise<OfferDrawOutput> {
    return this.call("offer_draw", { game_id, player_pubkey });
  }

    /**
   * Accept or decline a draw offer
   * @param {string} game_id Game ID
   * @param {string} player_pubkey Player's public key (64 hex characters)
   * @param {boolean} accept Whether to accept the draw
   * @returns {Promise<RespondDrawOutput>} The result of the respond_draw operation
   */
  async RespondDraw(
    game_id: string, player_pubkey: string, accept: boolean
  ): Promise<RespondDrawOutput> {
    return this.call("respond_draw", { game_id, player_pubkey, accept });
  }
}

/**
 * Default singleton instance of ChestervmClient.
 * This instance uses the default configuration and can be used directly
 * without creating a new instance.
 *
 * @example
 * import { chestervm } from './ChestervmClient';
 * const result = await chestervm.SomeMethod();
 */
export const chestervm = new ChestervmClient();

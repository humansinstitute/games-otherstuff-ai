import { Chess } from "chess.js";
import { getDb } from "./db.js";
import { Game, GameStatus, MoveRecord, Player } from "./types.js";
import { createHash } from "crypto";

const START_FEN = new Chess().fen();

type Identifier = { id: number } | { handle: string };

type GameCreationInput = {
  whiteHandle?: string;
  blackHandle?: string;
  whiteSecret?: string;
  blackSecret?: string;
};

type GameRegistrationInput = {
  gameId: number;
  whiteHandle: string;
  blackHandle: string;
  whiteSecret: string;
  blackSecret: string;
};

type MoveSubmissionInput = {
  gameId: number;
  playerHandle: string;
  move: string;
  secret: string;
};

type ResignInput = {
  gameId: number;
  playerHandle: string;
  secret: string;
};

type DrawOfferInput = {
  gameId: number;
  playerHandle: string;
  secret: string;
};

type UndoMoveInput = {
  gameId: number;
  requesterHandle: string;
  secret: string;
  confirmByOpponent?: boolean;
  opponentConfirmed?: boolean;
  opponentHandle?: string;
};

export function createPlayer(handle: string, displayName: string): Player {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO players (handle, display_name) VALUES (?, ?)`
  );
  const result = stmt.run(handle, displayName);
  const id = Number(result.lastInsertRowid);
  return getPlayer({ id })!;
}

export function getPlayer(identifier: Identifier): Player | null {
  const db = getDb();
  const row = db
    .query(
      "SELECT * FROM players WHERE " + ("id" in identifier ? "id = ?" : "handle = ?")
    )
    .get("id" in identifier ? identifier.id : identifier.handle) as Player | undefined;
  return row ?? null;
}

export function createGame(input: GameCreationInput): Game {
  const db = getDb();

  let whiteId: number | null = null;
  let blackId: number | null = null;
  let whiteSecret: string | null = null;
  let blackSecret: string | null = null;

  if (input.whiteHandle) {
    const player = getPlayer({ handle: input.whiteHandle });
    if (!player) throw new Error(`White player not found: ${input.whiteHandle}`);
    whiteId = player.id;
    whiteSecret = input.whiteSecret ? hashSecret(input.whiteSecret) : null;
  }

  if (input.blackHandle) {
    const player = getPlayer({ handle: input.blackHandle });
    if (!player) throw new Error(`Black player not found: ${input.blackHandle}`);
    blackId = player.id;
    blackSecret = input.blackSecret ? hashSecret(input.blackSecret) : null;
  }

  const status: GameStatus = whiteId && blackId ? "active" : "pending";

  const result = db
    .prepare(
      `INSERT INTO games (white_player_id, black_player_id, status, current_fen, white_secret, black_secret) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(whiteId, blackId, status, START_FEN, whiteSecret, blackSecret);

  const gameId = Number(result.lastInsertRowid);
  return redactSecrets(getGame(gameId)!);
}

export function registerGamePlayers(input: GameRegistrationInput): Game {
  const db = getDb();
  const game = getGame(input.gameId);
  if (!game) throw new Error(`Game ${input.gameId} not found`);

  const white = getPlayer({ handle: input.whiteHandle });
  const black = getPlayer({ handle: input.blackHandle });
  if (!white) throw new Error(`White player not found: ${input.whiteHandle}`);
  if (!black) throw new Error(`Black player not found: ${input.blackHandle}`);

  if (game.white_player_id && game.white_player_id !== white.id) throw new Error("White player already set");
  if (game.black_player_id && game.black_player_id !== black.id) throw new Error("Black player already set");
  if (game.white_secret && game.white_secret !== hashSecret(input.whiteSecret)) {
    throw new Error("Provided white secret does not match existing");
  }
  if (game.black_secret && game.black_secret !== hashSecret(input.blackSecret)) {
    throw new Error("Provided black secret does not match existing");
  }

  db.prepare(
    `UPDATE games SET white_player_id = ?, black_player_id = ?, white_secret = COALESCE(white_secret, ?), black_secret = COALESCE(black_secret, ?), status = ? , updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).run(
    white.id,
    black.id,
    hashSecret(input.whiteSecret),
    hashSecret(input.blackSecret),
    game.status === "completed" ? game.status : "active",
    input.gameId
  );

  return redactSecrets(getGame(input.gameId)!);
}

export function getGame(gameId: number): Game | null {
  const db = getDb();
  const row = db.query("SELECT * FROM games WHERE id = ?").get(gameId) as Game | undefined;
  return row ?? null;
}

export function getGameState(gameId: number) {
  const game = getGame(gameId);
  if (!game) throw new Error(`Game ${gameId} not found`);

  const moves = getMoves(gameId);
  const white = game.white_player_id ? getPlayer({ id: game.white_player_id }) : null;
  const black = game.black_player_id ? getPlayer({ id: game.black_player_id }) : null;

  return {
    game: redactSecrets(game),
    white,
    black,
    moves,
  };
}

export function getGamesForPlayer(handle: string): Game[] {
  const player = getPlayer({ handle });
  if (!player) throw new Error(`Player not found: ${handle}`);
  const db = getDb();
  const games = db
    .query(
      `SELECT * FROM games WHERE white_player_id = ? OR black_player_id = ? ORDER BY updated_at DESC`
    )
    .all(player.id, player.id) as Game[];
  return games.map(redactSecrets);
}

export function submitMove(input: MoveSubmissionInput) {
  const db = getDb();
  const game = getGame(input.gameId);
  if (!game) throw new Error(`Game ${input.gameId} not found`);

  if (game.status !== "active") {
    throw new Error(`Game ${input.gameId} is not active (status: ${game.status})`);
  }

  const player = getPlayer({ handle: input.playerHandle });
  if (!player) throw new Error(`Player not found: ${input.playerHandle}`);

  const color = assertPlayerAuth(game, player.id, input.secret);

  const chess = new Chess(game.current_fen);
  if (chess.turn() !== color) {
    throw new Error(`It is not ${input.playerHandle}'s turn`);
  }

  const fenBefore = chess.fen();
  const moveResult = chess.move(input.move);
  if (!moveResult) {
    throw new Error(`Invalid move: ${input.move}`);
  }

  const fenAfter = chess.fen();
  const moves = getMoves(input.gameId);
  const plyNumber = moves.length + 1;

  db.prepare(
    `INSERT INTO moves (game_id, ply_number, player_id, san, from_square, to_square, fen_before, fen_after)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    input.gameId,
    plyNumber,
    player.id,
    moveResult.san,
    moveResult.from,
    moveResult.to,
    fenBefore,
    fenAfter
  );

  let status: GameStatus = "active";
  let result: string | null = null;
  let winner: number | null = null;

  if (chess.isGameOver()) {
    status = "completed";
    if (chess.isCheckmate()) {
      result = color === "w" ? "white" : "black";
      winner = color === "w" ? game.white_player_id : game.black_player_id;
    } else if (chess.isDraw()) {
      result = "draw";
    } else if (chess.isStalemate()) {
      result = "stalemate";
    } else if (chess.isInsufficientMaterial()) {
      result = "insufficient_material";
    } else if (chess.isThreefoldRepetition()) {
      result = "threefold_repetition";
    } else {
      result = "ended";
    }
  }

  db.prepare(
    `UPDATE games SET current_fen = ?, status = ?, result = ?, winner_player_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).run(fenAfter, status, result, winner, input.gameId);

  return getGameState(input.gameId);
}

export function resignGame(input: ResignInput) {
  const db = getDb();
  const game = getGame(input.gameId);
  if (!game) throw new Error(`Game ${input.gameId} not found`);
  if (game.status !== "active") throw new Error(`Game ${input.gameId} is not active`);

  const player = getPlayer({ handle: input.playerHandle });
  if (!player) throw new Error(`Player not found: ${input.playerHandle}`);
  const color = assertPlayerAuth(game, player.id, input.secret);

  const winner = color === "w" ? game.black_player_id : game.white_player_id;
  const result = color === "w" ? "black_wins_by_resign" : "white_wins_by_resign";

  db.prepare(
    `UPDATE games SET status = 'completed', result = ?, winner_player_id = ?, draw_offer_by = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).run(result, winner, input.gameId);

  return getGameState(input.gameId);
}

export function offerDraw(input: DrawOfferInput) {
  const db = getDb();
  const game = getGame(input.gameId);
  if (!game) throw new Error(`Game ${input.gameId} not found`);
  if (game.status !== "active") throw new Error(`Game ${input.gameId} is not active`);

  const player = getPlayer({ handle: input.playerHandle });
  if (!player) throw new Error(`Player not found: ${input.playerHandle}`);
  assertPlayerAuth(game, player.id, input.secret);

  db.prepare(
    `UPDATE games SET draw_offer_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).run(player.id, input.gameId);

  return getGameState(input.gameId);
}

export function acceptDraw(input: DrawOfferInput) {
  const db = getDb();
  const game = getGame(input.gameId);
  if (!game) throw new Error(`Game ${input.gameId} not found`);
  if (game.status !== "active") throw new Error(`Game ${input.gameId} is not active`);

  const player = getPlayer({ handle: input.playerHandle });
  if (!player) throw new Error(`Player not found: ${input.playerHandle}`);
  assertPlayerAuth(game, player.id, input.secret);
  if (!game.draw_offer_by) throw new Error(`No draw offer is pending for game ${input.gameId}`);
  if (game.draw_offer_by === player.id) throw new Error(`You cannot accept your own draw offer`);

  db.prepare(
    `UPDATE games SET status = 'completed', result = 'draw', winner_player_id = NULL, draw_offer_by = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).run(input.gameId);

  return getGameState(input.gameId);
}

export function undoLastMove(input: UndoMoveInput) {
  const db = getDb();
  const game = getGame(input.gameId);
  if (!game) throw new Error(`Game ${input.gameId} not found`);

  const requester = getPlayer({ handle: input.requesterHandle });
  if (!requester) throw new Error(`Requester not found: ${input.requesterHandle}`);
  assertPlayerAuth(game, requester.id, input.secret);

  if (input.confirmByOpponent) {
    if (!input.opponentConfirmed) {
      return {
        pendingConfirmation: true,
        message: "Opponent confirmation required. Call again with opponentConfirmed=true.",
      };
    }
    if (input.opponentHandle) {
      const opponent = getPlayer({ handle: input.opponentHandle });
      if (!opponent) throw new Error(`Opponent not found: ${input.opponentHandle}`);
      const opponentColor = determinePlayerColor(game, opponent.id);
      if (!opponentColor) throw new Error(`Opponent ${input.opponentHandle} not in game ${input.gameId}`);
    }
  }

  const lastMove = db
    .query(
      `SELECT * FROM moves WHERE game_id = ? ORDER BY ply_number DESC LIMIT 1`
    )
    .get(input.gameId) as MoveRecord | undefined;

  if (!lastMove) throw new Error(`No moves to undo for game ${input.gameId}`);

  // Roll back board to state before last move.
  db.prepare(`DELETE FROM moves WHERE id = ?`).run(lastMove.id);

  const remainingMoves = getMoves(input.gameId);
  const newFen = lastMove.fen_before;

  let status: GameStatus = game.status;
  let result: string | null = game.result;
  let winner: number | null = game.winner_player_id;

  if (game.status === "completed") {
    status = "active";
    result = null;
    winner = null;
  }

  db.prepare(
    `UPDATE games SET current_fen = ?, status = ?, result = ?, winner_player_id = ?, draw_offer_by = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).run(newFen, status, result, winner, input.gameId);

  return {
    ...getGameState(input.gameId),
    remainingPly: remainingMoves.length,
  };
}

export function listOpenGames(): Game[] {
  const db = getDb();
  const games = db
    .query(`SELECT * FROM games WHERE status = 'pending' ORDER BY updated_at DESC`)
    .all() as Game[];
  return games.map(redactSecrets);
}

export function listActiveGames(): Game[] {
  const db = getDb();
  const games = db
    .query(`SELECT * FROM games WHERE status = 'active' ORDER BY updated_at DESC`)
    .all() as Game[];
  return games.map(redactSecrets);
}

function determinePlayerColor(game: Game, playerId: number): "w" | "b" | null {
  if (game.white_player_id === playerId) return "w";
  if (game.black_player_id === playerId) return "b";
  return null;
}

function getMoves(gameId: number): MoveRecord[] {
  const db = getDb();
  return db
    .query("SELECT * FROM moves WHERE game_id = ? ORDER BY ply_number ASC")
    .all(gameId) as MoveRecord[];
}

function assertPlayerAuth(game: Game, playerId: number, secret: string): "w" | "b" {
  const color = determinePlayerColor(game, playerId);
  if (!color) {
    throw new Error(`Player not assigned to game ${game.id}`);
  }
  const hashed = hashSecret(secret);
  if (color === "w" && game.white_secret !== hashed) {
    throw new Error("Secret mismatch for white");
  }
  if (color === "b" && game.black_secret !== hashed) {
    throw new Error("Secret mismatch for black");
  }
  return color;
}

function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

function redactSecrets(game: Game): Game {
  const { white_secret, black_secret, ...rest } = game;
  return { ...rest, white_secret: null, black_secret: null };
}

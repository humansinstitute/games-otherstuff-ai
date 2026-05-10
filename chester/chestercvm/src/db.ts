import { Database } from "bun:sqlite";

let db: Database | null = null;

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export function getDb(): Database {
  if (!db) {
    throw new Error("Database not initialized. Call initializeDatabase() first.");
  }
  return db;
}

export function initializeDatabase(dbPath: string = "chester.db"): Database {
  db = new Database(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");

  // Players table
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      pubkey TEXT PRIMARY KEY,
      display_name TEXT,
      is_ai INTEGER DEFAULT 0,
      ai_personality TEXT,
      rating REAL DEFAULT 1500,
      rating_deviation REAL DEFAULT 350,
      rating_volatility REAL DEFAULT 0.06,
      games_played INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      draws INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      last_seen_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Games table
  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      host_pubkey TEXT NOT NULL,
      host_color_preference TEXT DEFAULT 'random',
      white_pubkey TEXT,
      black_pubkey TEXT,
      current_fen TEXT DEFAULT '${STARTING_FEN}',
      result TEXT,
      termination_type TEXT,
      opening_eco TEXT,
      draw_offer_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      started_at TEXT,
      ended_at TEXT,
      last_move_at TEXT,
      FOREIGN KEY (host_pubkey) REFERENCES players(pubkey),
      FOREIGN KEY (white_pubkey) REFERENCES players(pubkey),
      FOREIGN KEY (black_pubkey) REFERENCES players(pubkey)
    );
  `);

  // Game requests table
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_requests (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      requester_pubkey TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT,
      FOREIGN KEY (game_id) REFERENCES games(id),
      FOREIGN KEY (requester_pubkey) REFERENCES players(pubkey)
    );
  `);

  // Moves table
  db.exec(`
    CREATE TABLE IF NOT EXISTS moves (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      move_number INTEGER NOT NULL,
      ply_number INTEGER NOT NULL,
      color TEXT NOT NULL,
      player_pubkey TEXT NOT NULL,
      san TEXT NOT NULL,
      uci TEXT NOT NULL,
      fen_after TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (game_id) REFERENCES games(id),
      FOREIGN KEY (player_pubkey) REFERENCES players(pubkey)
    );
  `);

  // Indexes for common queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
    CREATE INDEX IF NOT EXISTS idx_games_white ON games(white_pubkey);
    CREATE INDEX IF NOT EXISTS idx_games_black ON games(black_pubkey);
    CREATE INDEX IF NOT EXISTS idx_games_host ON games(host_pubkey);
    CREATE INDEX IF NOT EXISTS idx_moves_game ON moves(game_id);
    CREATE INDEX IF NOT EXISTS idx_moves_game_ply ON moves(game_id, ply_number);
    CREATE INDEX IF NOT EXISTS idx_requests_game ON game_requests(game_id);
    CREATE INDEX IF NOT EXISTS idx_requests_status ON game_requests(status);
    CREATE INDEX IF NOT EXISTS idx_requests_requester ON game_requests(requester_pubkey);
  `);

  // Unique partial index: only one pending request per (game_id, requester_pubkey)
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_requests_pending_unique
      ON game_requests(game_id, requester_pubkey)
      WHERE status = 'pending';
  `);

  console.log("Database initialized successfully");
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export { STARTING_FEN };

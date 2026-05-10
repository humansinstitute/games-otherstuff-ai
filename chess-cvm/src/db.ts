import { Database } from "bun:sqlite";

let db: Database | null = null;

export function getDb() {
  if (!db) {
    throw new Error("Database not initialized. Call initializeDatabase() first.");
  }
  return db;
}

export function initializeDatabase() {
  if (db) return db;

  db = new Database("data/chess.db", { create: true, strict: true });
  db.exec("PRAGMA journal_mode=WAL;");
  db.exec("PRAGMA foreign_keys=ON;");

  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      handle TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      white_player_id INTEGER,
      black_player_id INTEGER,
      status TEXT NOT NULL DEFAULT 'pending',
      current_fen TEXT NOT NULL,
      result TEXT,
      white_secret TEXT,
      black_secret TEXT,
      draw_offer_by INTEGER,
      winner_player_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (white_player_id) REFERENCES players(id),
      FOREIGN KEY (black_player_id) REFERENCES players(id),
      FOREIGN KEY (draw_offer_by) REFERENCES players(id),
      FOREIGN KEY (winner_player_id) REFERENCES players(id)
    );

    CREATE TABLE IF NOT EXISTS moves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      ply_number INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      san TEXT NOT NULL,
      from_square TEXT NOT NULL,
      to_square TEXT NOT NULL,
      fen_before TEXT NOT NULL,
      fen_after TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players(id)
    );

    CREATE INDEX IF NOT EXISTS idx_players_handle ON players(handle);
    CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
    CREATE INDEX IF NOT EXISTS idx_moves_game_id ON moves(game_id);
  `);

  // Lightweight migration for legacy databases missing secret columns
  ensureGameColumn("white_secret", "TEXT");
  ensureGameColumn("black_secret", "TEXT");

  return db;
}

function ensureGameColumn(column: string, type: string) {
  const hasColumn = db!
    .query(
      `SELECT 1 FROM pragma_table_info('games') WHERE name = ?`
    )
    .get(column);
  if (!hasColumn) {
    db!.exec(`ALTER TABLE games ADD COLUMN ${column} ${type};`);
  }
}

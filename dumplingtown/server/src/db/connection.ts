import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as schema from './schema';
import { WriteQueue } from '../lib/write-queue';
import { mkdirSync } from 'fs';

const DB_PATH = './data/dumplingtown.db';

// Ensure data directory exists
mkdirSync('./data', { recursive: true });

const sqlite = new Database(DB_PATH);

// SQLite pragmas for performance and safety
sqlite.exec('PRAGMA journal_mode = WAL');
sqlite.exec('PRAGMA busy_timeout = 5000');
sqlite.exec('PRAGMA foreign_keys = ON');
sqlite.exec('PRAGMA synchronous = NORMAL');

export const db = drizzle(sqlite, { schema });
export const writeQueue = new WriteQueue();

/**
 * Execute a write operation through the serial queue.
 * Reads can use `db` directly since WAL allows concurrent reads.
 */
export function write<T>(fn: () => Promise<T>): Promise<T> {
  return writeQueue.enqueue(fn);
}

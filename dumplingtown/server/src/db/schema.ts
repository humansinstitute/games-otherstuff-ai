import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const players = sqliteTable('players', {
  pubkey: text('pubkey').primaryKey(),
  filling: text('filling').notNull().default('pork'),
  coins: integer('coins').notNull().default(100),
  gameTimeMinutes: integer('game_time_minutes').notNull().default(480), // 8:00 AM
  gameTimeDay: integer('game_time_day').notNull().default(1),
  gameTimePaused: integer('game_time_paused', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const inventoryItems = sqliteTable('inventory_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pubkey: text('pubkey').notNull().references(() => players.pubkey),
  itemId: text('item_id').notNull(),
  instanceId: text('instance_id').notNull().unique(),
  name: text('name').notNull(),
  price: integer('price').notNull().default(0),
  emoji: text('emoji').notNull().default(''),
  slot: text('slot').notNull().default('held'), // hat, accessory, held
  description: text('description').notNull().default(''),
  isBed: integer('is_bed', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const equippedItems = sqliteTable('equipped_items', {
  pubkey: text('pubkey').primaryKey().references(() => players.pubkey),
  hatInstanceId: text('hat_instance_id'),
  accessoryInstanceId: text('accessory_instance_id'),
  heldInstanceId: text('held_instance_id'),
});

export const homeDecorations = sqliteTable('home_decorations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pubkey: text('pubkey').notNull().references(() => players.pubkey),
  itemId: text('item_id').notNull(),
  instanceId: text('instance_id').notNull().unique(),
  name: text('name').notNull(),
  emoji: text('emoji').notNull().default(''),
  slot: text('slot').notNull().default('held'),
  description: text('description').notNull().default(''),
  isBed: integer('is_bed', { mode: 'boolean' }).notNull().default(false),
  x: real('x').notNull().default(0),
  y: real('y').notNull().default(0),
});

export const quests = sqliteTable('quests', {
  pubkey: text('pubkey').notNull().references(() => players.pubkey),
  questId: text('quest_id').notNull(),
  state: text('state').notNull().default('none'),
}, (table) => [
  uniqueIndex('quests_pk').on(table.pubkey, table.questId),
]);

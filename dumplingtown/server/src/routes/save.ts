import { db, write } from '../db/connection';
import { players, inventoryItems, equippedItems, homeDecorations, quests } from '../db/schema';
import { eq } from 'drizzle-orm';
import { BadRequestError, NotFoundError } from '../lib/errors';
import { randomUUID } from 'crypto';

/**
 * GET /api/save — Load full state snapshot (matches localStorage shape)
 */
export async function loadSave(pubkey: string): Promise<Response> {
  const player = db.select().from(players).where(eq(players.pubkey, pubkey)).get();
  if (!player) {
    throw new NotFoundError('No save found');
  }

  const inventory = db.select().from(inventoryItems).where(eq(inventoryItems.pubkey, pubkey)).all();
  const equipped = db.select().from(equippedItems).where(eq(equippedItems.pubkey, pubkey)).get();
  const decorations = db.select().from(homeDecorations).where(eq(homeDecorations.pubkey, pubkey)).all();
  const questRows = db.select().from(quests).where(eq(quests.pubkey, pubkey)).all();

  // Build quest map
  const questMap: Record<string, string> = {};
  for (const q of questRows) {
    questMap[q.questId] = q.state;
  }

  // Build equipped map matching client shape
  const equippedMap: Record<string, unknown> = {
    hat: null,
    accessory: null,
    held: null,
  };

  if (equipped) {
    if (equipped.hatInstanceId) {
      equippedMap.hat = inventory.find(i => i.instanceId === equipped.hatInstanceId) ?? null;
    }
    if (equipped.accessoryInstanceId) {
      equippedMap.accessory = inventory.find(i => i.instanceId === equipped.accessoryInstanceId) ?? null;
    }
    if (equipped.heldInstanceId) {
      equippedMap.held = inventory.find(i => i.instanceId === equipped.heldInstanceId) ?? null;
    }
  }

  // Return in localStorage-compatible shape
  const saveData = {
    version: 1,
    savedAt: player.updatedAt ? new Date(player.updatedAt).getTime() : Date.now(),
    playerFilling: player.filling,
    playerCoins: player.coins,
    playerInventory: inventory.map(i => ({
      id: i.itemId,
      instanceId: i.instanceId,
      name: i.name,
      price: i.price,
      emoji: i.emoji,
      slot: i.slot,
      description: i.description,
      isBed: i.isBed,
    })),
    equippedItems: equippedMap,
    homeDecorations: decorations.map(d => ({
      id: d.itemId,
      instanceId: d.instanceId,
      name: d.name,
      emoji: d.emoji,
      slot: d.slot,
      description: d.description,
      isBed: d.isBed,
      x: d.x,
      y: d.y,
    })),
    activeQuests: questMap,
    gameTime: {
      minutes: player.gameTimeMinutes,
      day: player.gameTimeDay,
      paused: player.gameTimePaused,
    },
  };

  return Response.json(saveData);
}

/**
 * PUT /api/save — Write full state snapshot (accepts localStorage shape)
 */
export async function writeSave(pubkey: string, req: Request): Promise<Response> {
  const body = await req.json();
  if (!body || typeof body !== 'object') {
    throw new BadRequestError('Invalid save data');
  }

  await write(async () => {
    // Upsert player
    const existing = db.select().from(players).where(eq(players.pubkey, pubkey)).get();
    if (existing) {
      db.update(players).set({
        filling: body.playerFilling ?? existing.filling,
        coins: body.playerCoins ?? existing.coins,
        gameTimeMinutes: body.gameTime?.minutes ?? existing.gameTimeMinutes,
        gameTimeDay: body.gameTime?.day ?? existing.gameTimeDay,
        gameTimePaused: body.gameTime?.paused ?? existing.gameTimePaused,
        updatedAt: new Date(),
      }).where(eq(players.pubkey, pubkey)).run();
    } else {
      db.insert(players).values({
        pubkey,
        filling: body.playerFilling ?? 'pork',
        coins: body.playerCoins ?? 100,
        gameTimeMinutes: body.gameTime?.minutes ?? 480,
        gameTimeDay: body.gameTime?.day ?? 1,
        gameTimePaused: body.gameTime?.paused ?? false,
      }).run();
      db.insert(equippedItems).values({ pubkey }).run();
    }

    // Replace inventory
    db.delete(inventoryItems).where(eq(inventoryItems.pubkey, pubkey)).run();
    if (Array.isArray(body.playerInventory)) {
      for (const item of body.playerInventory) {
        db.insert(inventoryItems).values({
          pubkey,
          itemId: item.id,
          instanceId: item.instanceId ?? randomUUID(),
          name: item.name,
          price: item.price ?? 0,
          emoji: item.emoji ?? '',
          slot: item.slot ?? 'held',
          description: item.description ?? '',
          isBed: item.isBed ?? false,
        }).run();
      }
    }

    // Update equipped
    const equip = body.equippedItems ?? {};
    db.update(equippedItems).set({
      hatInstanceId: equip.hat?.instanceId ?? null,
      accessoryInstanceId: equip.accessory?.instanceId ?? null,
      heldInstanceId: equip.held?.instanceId ?? null,
    }).where(eq(equippedItems.pubkey, pubkey)).run();

    // Replace decorations
    db.delete(homeDecorations).where(eq(homeDecorations.pubkey, pubkey)).run();
    if (Array.isArray(body.homeDecorations)) {
      for (const dec of body.homeDecorations) {
        db.insert(homeDecorations).values({
          pubkey,
          itemId: dec.id,
          instanceId: dec.instanceId ?? randomUUID(),
          name: dec.name,
          emoji: dec.emoji ?? '',
          slot: dec.slot ?? 'held',
          description: dec.description ?? '',
          isBed: dec.isBed ?? false,
          x: dec.x ?? 0,
          y: dec.y ?? 0,
        }).run();
      }
    }

    // Replace quests
    db.delete(quests).where(eq(quests.pubkey, pubkey)).run();
    if (body.activeQuests && typeof body.activeQuests === 'object') {
      for (const [questId, state] of Object.entries(body.activeQuests)) {
        db.insert(quests).values({
          pubkey,
          questId,
          state: state as string,
        }).run();
      }
    }
  });

  return Response.json({ ok: true, savedAt: Date.now() });
}

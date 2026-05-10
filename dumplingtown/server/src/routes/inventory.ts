import { db, write } from '../db/connection';
import { players, inventoryItems, equippedItems } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { BadRequestError, NotFoundError, InsufficientFundsError } from '../lib/errors';
import { randomUUID } from 'crypto';

export async function listInventory(pubkey: string): Promise<Response> {
  const items = db.select().from(inventoryItems).where(eq(inventoryItems.pubkey, pubkey)).all();
  return Response.json(items.map(i => ({
    id: i.itemId,
    instanceId: i.instanceId,
    name: i.name,
    price: i.price,
    emoji: i.emoji,
    slot: i.slot,
    description: i.description,
    isBed: i.isBed,
  })));
}

export async function buyItem(pubkey: string, req: Request): Promise<Response> {
  const body = await req.json();
  const { id, name, price, emoji, slot, description, isBed } = body;

  if (!id || !name || price === undefined) {
    throw new BadRequestError('Missing item fields: id, name, price');
  }

  const result = await write(async () => {
    const player = db.select().from(players).where(eq(players.pubkey, pubkey)).get();
    if (!player) throw new NotFoundError('Player not found');
    if (player.coins < price) throw new InsufficientFundsError();

    const instanceId = randomUUID();
    db.update(players).set({
      coins: player.coins - price,
      updatedAt: new Date(),
    }).where(eq(players.pubkey, pubkey)).run();

    db.insert(inventoryItems).values({
      pubkey,
      itemId: id,
      instanceId,
      name,
      price: price ?? 0,
      emoji: emoji ?? '',
      slot: slot ?? 'held',
      description: description ?? '',
      isBed: isBed ?? false,
    }).run();

    return { instanceId, newBalance: player.coins - price };
  });

  return Response.json(result, { status: 201 });
}

export async function equipItem(pubkey: string, req: Request): Promise<Response> {
  const body = await req.json();
  const { instanceId, slot } = body;

  if (!instanceId || !slot || !['hat', 'accessory', 'held'].includes(slot)) {
    throw new BadRequestError('Missing instanceId or invalid slot');
  }

  await write(async () => {
    const item = db.select().from(inventoryItems)
      .where(and(eq(inventoryItems.pubkey, pubkey), eq(inventoryItems.instanceId, instanceId)))
      .get();
    if (!item) throw new NotFoundError('Item not in inventory');

    const update: Record<string, string | null> = {};
    if (slot === 'hat') update.hatInstanceId = instanceId;
    else if (slot === 'accessory') update.accessoryInstanceId = instanceId;
    else update.heldInstanceId = instanceId;

    db.update(equippedItems).set(update).where(eq(equippedItems.pubkey, pubkey)).run();
  });

  return Response.json({ ok: true });
}

export async function unequipSlot(pubkey: string, req: Request): Promise<Response> {
  const body = await req.json();
  const { slot } = body;

  if (!slot || !['hat', 'accessory', 'held'].includes(slot)) {
    throw new BadRequestError('Invalid slot');
  }

  await write(async () => {
    const update: Record<string, null> = {};
    if (slot === 'hat') update.hatInstanceId = null;
    else if (slot === 'accessory') update.accessoryInstanceId = null;
    else update.heldInstanceId = null;

    db.update(equippedItems).set(update).where(eq(equippedItems.pubkey, pubkey)).run();
  });

  return Response.json({ ok: true });
}

import { db, write } from '../db/connection';
import { inventoryItems, homeDecorations } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { BadRequestError, NotFoundError } from '../lib/errors';

export async function listDecorations(pubkey: string): Promise<Response> {
  const items = db.select().from(homeDecorations).where(eq(homeDecorations.pubkey, pubkey)).all();
  return Response.json(items.map(d => ({
    id: d.itemId,
    instanceId: d.instanceId,
    name: d.name,
    emoji: d.emoji,
    slot: d.slot,
    description: d.description,
    isBed: d.isBed,
    x: d.x,
    y: d.y,
  })));
}

export async function placeDecoration(pubkey: string, req: Request): Promise<Response> {
  const body = await req.json();
  const { instanceId, x, y } = body;

  if (!instanceId || x === undefined || y === undefined) {
    throw new BadRequestError('Missing instanceId, x, or y');
  }

  await write(async () => {
    // Find item in inventory
    const item = db.select().from(inventoryItems)
      .where(and(eq(inventoryItems.pubkey, pubkey), eq(inventoryItems.instanceId, instanceId)))
      .get();
    if (!item) throw new NotFoundError('Item not in inventory');

    // Move from inventory to decorations
    db.delete(inventoryItems)
      .where(and(eq(inventoryItems.pubkey, pubkey), eq(inventoryItems.instanceId, instanceId)))
      .run();

    db.insert(homeDecorations).values({
      pubkey,
      itemId: item.itemId,
      instanceId: item.instanceId,
      name: item.name,
      emoji: item.emoji,
      slot: item.slot,
      description: item.description,
      isBed: item.isBed,
      x,
      y,
    }).run();
  });

  return Response.json({ ok: true });
}

export async function pickupDecoration(pubkey: string, req: Request): Promise<Response> {
  const body = await req.json();
  const { instanceId } = body;

  if (!instanceId) {
    throw new BadRequestError('Missing instanceId');
  }

  await write(async () => {
    const dec = db.select().from(homeDecorations)
      .where(and(eq(homeDecorations.pubkey, pubkey), eq(homeDecorations.instanceId, instanceId)))
      .get();
    if (!dec) throw new NotFoundError('Decoration not found');

    // Move from decorations to inventory
    db.delete(homeDecorations)
      .where(and(eq(homeDecorations.pubkey, pubkey), eq(homeDecorations.instanceId, instanceId)))
      .run();

    db.insert(inventoryItems).values({
      pubkey,
      itemId: dec.itemId,
      instanceId: dec.instanceId,
      name: dec.name,
      emoji: dec.emoji,
      slot: dec.slot,
      description: dec.description,
      isBed: dec.isBed,
    }).run();
  });

  return Response.json({ ok: true });
}

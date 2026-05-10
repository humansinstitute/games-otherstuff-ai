import { db, write } from '../db/connection';
import { players, equippedItems } from '../db/schema';
import { eq } from 'drizzle-orm';
import { BadRequestError, ConflictError, NotFoundError } from '../lib/errors';

export async function createPlayer(pubkey: string, req: Request): Promise<Response> {
  const body = await req.json();
  const filling = body.filling;

  if (!filling || !['pork', 'shrimp', 'veggie', 'sweet'].includes(filling)) {
    throw new BadRequestError('Invalid filling type');
  }

  const existing = db.select().from(players).where(eq(players.pubkey, pubkey)).get();
  if (existing) {
    throw new ConflictError('Player already exists');
  }

  await write(async () => {
    db.insert(players).values({ pubkey, filling }).run();
    db.insert(equippedItems).values({ pubkey }).run();
  });

  return Response.json({ pubkey, filling, coins: 100 }, { status: 201 });
}

export async function getPlayer(pubkey: string): Promise<Response> {
  const player = db.select().from(players).where(eq(players.pubkey, pubkey)).get();
  if (!player) {
    throw new NotFoundError('Player not found');
  }

  return Response.json({
    pubkey: player.pubkey,
    filling: player.filling,
    coins: player.coins,
    gameTime: {
      minutes: player.gameTimeMinutes,
      day: player.gameTimeDay,
      paused: player.gameTimePaused,
    },
    createdAt: player.createdAt,
    updatedAt: player.updatedAt,
  });
}

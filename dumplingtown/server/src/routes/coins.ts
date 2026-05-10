import { db, write } from '../db/connection';
import { players } from '../db/schema';
import { eq } from 'drizzle-orm';
import { BadRequestError, NotFoundError, InsufficientFundsError } from '../lib/errors';

export async function addCoins(pubkey: string, req: Request): Promise<Response> {
  const body = await req.json();
  const { amount, reason } = body;

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    throw new BadRequestError('Invalid amount');
  }

  const result = await write(async () => {
    const player = db.select().from(players).where(eq(players.pubkey, pubkey)).get();
    if (!player) throw new NotFoundError('Player not found');

    const newBalance = player.coins + amount;
    db.update(players).set({
      coins: newBalance,
      updatedAt: new Date(),
    }).where(eq(players.pubkey, pubkey)).run();

    return { newBalance, added: amount, reason };
  });

  return Response.json(result);
}

export async function spendCoins(pubkey: string, req: Request): Promise<Response> {
  const body = await req.json();
  const { amount, reason } = body;

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    throw new BadRequestError('Invalid amount');
  }

  const result = await write(async () => {
    const player = db.select().from(players).where(eq(players.pubkey, pubkey)).get();
    if (!player) throw new NotFoundError('Player not found');
    if (player.coins < amount) throw new InsufficientFundsError();

    const newBalance = player.coins - amount;
    db.update(players).set({
      coins: newBalance,
      updatedAt: new Date(),
    }).where(eq(players.pubkey, pubkey)).run();

    return { newBalance, spent: amount, reason };
  });

  return Response.json(result);
}

import { db, write } from '../db/connection';
import { players } from '../db/schema';
import { eq } from 'drizzle-orm';
import { BadRequestError, NotFoundError } from '../lib/errors';

export async function getTime(pubkey: string): Promise<Response> {
  const player = db.select().from(players).where(eq(players.pubkey, pubkey)).get();
  if (!player) throw new NotFoundError('Player not found');

  return Response.json({
    minutes: player.gameTimeMinutes,
    day: player.gameTimeDay,
    paused: player.gameTimePaused,
  });
}

export async function sleep(pubkey: string): Promise<Response> {
  const result = await write(async () => {
    const player = db.select().from(players).where(eq(players.pubkey, pubkey)).get();
    if (!player) throw new NotFoundError('Player not found');

    const nextDay = player.gameTimeDay + 1;
    const morningMinutes = 480; // 8:00 AM

    db.update(players).set({
      gameTimeMinutes: morningMinutes,
      gameTimeDay: nextDay,
      updatedAt: new Date(),
    }).where(eq(players.pubkey, pubkey)).run();

    return { minutes: morningMinutes, day: nextDay, paused: player.gameTimePaused };
  });

  return Response.json(result);
}

export async function updateTime(pubkey: string, req: Request): Promise<Response> {
  const body = await req.json();

  const result = await write(async () => {
    const player = db.select().from(players).where(eq(players.pubkey, pubkey)).get();
    if (!player) throw new NotFoundError('Player not found');

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (body.minutes !== undefined) {
      if (typeof body.minutes !== 'number' || body.minutes < 0 || body.minutes >= 1440) {
        throw new BadRequestError('minutes must be 0-1439');
      }
      updates.gameTimeMinutes = body.minutes;
    }
    if (body.day !== undefined) {
      if (typeof body.day !== 'number' || body.day < 1) {
        throw new BadRequestError('day must be >= 1');
      }
      updates.gameTimeDay = body.day;
    }
    if (body.paused !== undefined) {
      updates.gameTimePaused = !!body.paused;
    }

    db.update(players).set(updates).where(eq(players.pubkey, pubkey)).run();

    return {
      minutes: (updates.gameTimeMinutes ?? player.gameTimeMinutes) as number,
      day: (updates.gameTimeDay ?? player.gameTimeDay) as number,
      paused: (updates.gameTimePaused ?? player.gameTimePaused) as boolean,
    };
  });

  return Response.json(result);
}

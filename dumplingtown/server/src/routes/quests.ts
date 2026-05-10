import { db, write } from '../db/connection';
import { quests } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { BadRequestError } from '../lib/errors';

export async function listQuests(pubkey: string): Promise<Response> {
  const rows = db.select().from(quests).where(eq(quests.pubkey, pubkey)).all();
  const questMap: Record<string, string> = {};
  for (const q of rows) {
    questMap[q.questId] = q.state;
  }
  return Response.json(questMap);
}

export async function updateQuest(pubkey: string, questId: string, req: Request): Promise<Response> {
  const body = await req.json();
  const { state } = body;

  if (!state || typeof state !== 'string') {
    throw new BadRequestError('Missing or invalid state');
  }

  await write(async () => {
    const existing = db.select().from(quests)
      .where(and(eq(quests.pubkey, pubkey), eq(quests.questId, questId)))
      .get();

    if (existing) {
      db.update(quests).set({ state })
        .where(and(eq(quests.pubkey, pubkey), eq(quests.questId, questId)))
        .run();
    } else {
      db.insert(quests).values({ pubkey, questId, state }).run();
    }
  });

  return Response.json({ questId, state });
}

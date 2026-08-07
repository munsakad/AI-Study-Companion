import { prisma } from "@/lib/prisma";

// /api/generate is the one route that costs real money per call (Gemini
// usage) and previously had no cap at all. Rolling 24h window keyed off
// GenerationLog rows, one row per *successful* generation (see
// src/app/api/generate/route.ts — recordGeneration is only called after
// a successful Gemini call + deck save, so failed/invalid-key attempts
// never burn a user's quota).

export const GENERATION_DAILY_LIMIT = Number(process.env.GENERATION_DAILY_LIMIT ?? 10);

const WINDOW_MS = 24 * 60 * 60 * 1000;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
}

export async function checkGenerationLimit(userId: string, now: Date = new Date()): Promise<RateLimitResult> {
  const windowStart = new Date(now.getTime() - WINDOW_MS);
  const recent = await prisma.generationLog.findMany({
    where: { userId, createdAt: { gte: windowStart } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  const count = recent.length;
  const allowed = count < GENERATION_DAILY_LIMIT;
  // Once the oldest entry in the window ages out, a new slot opens up.
  const resetAt = count > 0 ? new Date(recent[0].createdAt.getTime() + WINDOW_MS) : now;

  return { allowed, remaining: Math.max(0, GENERATION_DAILY_LIMIT - count), resetAt, limit: GENERATION_DAILY_LIMIT };
}

export async function recordGeneration(userId: string): Promise<void> {
  await prisma.generationLog.create({ data: { userId } });
}

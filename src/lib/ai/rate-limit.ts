import { prisma } from "@/lib/prisma";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;

/**
 * Simple DB-backed rate limit for AI endpoints (Section 34 — AI cost
 * control). Counts this user's AIGeneration rows in the last 60 seconds;
 * good enough for a single-instance deployment without adding Redis.
 */
export async function assertWithinAIRateLimit(userId: string) {
  const since = new Date(Date.now() - WINDOW_MS);
  const count = await prisma.aIGeneration.count({ where: { userId, createdAt: { gte: since } } });
  if (count >= MAX_PER_WINDOW) {
    throw new Error("RATE_LIMITED: Too many AI requests — wait a minute and try again.");
  }
}

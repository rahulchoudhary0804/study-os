import { prisma } from "@/lib/prisma";
import { computeRank, type RankResult } from "@/lib/domain/rank";

/** Cheap aggregate queries (counts/sums, not the heavier per-subject analytics) feeding the rank ladder. */
export async function getUserRank(userId: string): Promise<RankResult> {
  const [completedTopics, sessions, attempts, revisions, streak] = await Promise.all([
    prisma.topicProgress.count({ where: { userId, status: "COMPLETED" } }),
    prisma.studySession.aggregate({ where: { userId }, _sum: { durationSeconds: true } }),
    prisma.questionAttempt.findMany({ where: { userId }, select: { isCorrect: true } }),
    prisma.revision.findMany({ where: { userId }, select: { status: true } }),
    prisma.streak.findUnique({ where: { userId } }),
  ]);

  const totalAttempts = attempts.length;
  const accuracyPercent = totalAttempts > 0 ? Math.round((attempts.filter((a) => a.isCorrect).length / totalAttempts) * 100) : null;
  const revisionCompletionRate =
    revisions.length > 0 ? Math.round((revisions.filter((r) => r.status === "DONE").length / revisions.length) * 100) : 0;

  return computeRank({
    completedTopics,
    totalStudyHours: Math.round(((sessions._sum.durationSeconds ?? 0) / 3600) * 10) / 10,
    accuracyPercent,
    longestStreak: streak?.longestStreak ?? 0,
    revisionCompletionRate,
  });
}

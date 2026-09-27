import { prisma } from "@/lib/prisma";
import { computeRank, type RankResult } from "@/lib/domain/rank";

/** Cheap aggregate queries (counts/sums, not the heavier per-subject analytics) feeding the rank ladder. */
export async function getUserRank(userId: string): Promise<RankResult> {
  // Pure COUNT/SUM aggregates — this runs on every page (via the app layout),
  // so it must never pull whole attempt/revision tables into memory.
  const [completedTopics, sessions, totalAttempts, correctAttempts, totalRevisions, doneRevisions, streak] =
    await Promise.all([
      prisma.topicProgress.count({ where: { userId, status: "COMPLETED" } }),
      prisma.studySession.aggregate({ where: { userId }, _sum: { durationSeconds: true } }),
      prisma.questionAttempt.count({ where: { userId } }),
      prisma.questionAttempt.count({ where: { userId, isCorrect: true } }),
      prisma.revision.count({ where: { userId } }),
      prisma.revision.count({ where: { userId, status: "DONE" } }),
      prisma.streak.findUnique({ where: { userId } }),
    ]);

  const accuracyPercent = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : null;
  const revisionCompletionRate = totalRevisions > 0 ? Math.round((doneRevisions / totalRevisions) * 100) : 0;

  return computeRank({
    completedTopics,
    totalStudyHours: Math.round(((sessions._sum.durationSeconds ?? 0) / 3600) * 10) / 10,
    accuracyPercent,
    longestStreak: streak?.longestStreak ?? 0,
    revisionCompletionRate,
  });
}

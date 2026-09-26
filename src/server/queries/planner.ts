import { prisma } from "@/lib/prisma";
import { getWeakTopics } from "./weakness";
import type { PlannerDbState } from "@/lib/ai/prompts";

export async function getPlannerDbState(userId: string, examId?: string): Promise<PlannerDbState> {
  const [completed, remaining, weak, dueRevisions, recentSessions] = await Promise.all([
    prisma.topicProgress.findMany({
      where: { userId, status: "COMPLETED" },
      select: { topic: { select: { name: true } } },
    }),
    prisma.topic.findMany({
      where: {
        isDeleted: false,
        chapter: { priority: { lte: 2 }, subject: examId ? { examId } : undefined },
        progress: { none: { userId, status: "COMPLETED" } },
      },
      select: { name: true },
      take: 40,
    }),
    getWeakTopics(userId, 8),
    prisma.revision.findMany({
      where: { userId, status: { in: ["DUE", "SNOOZED"] }, dueDate: { lte: new Date() } },
      select: { topic: { select: { name: true } } },
      take: 20,
    }),
    prisma.studySession.findMany({
      where: { userId, sessionType: "FOCUS", startedAt: { gte: new Date(Date.now() - 7 * 86400_000) } },
      select: { durationSeconds: true },
    }),
  ]);

  const recentTotalHours = recentSessions.reduce((s, x) => s + x.durationSeconds, 0) / 3600;

  return {
    completedTopics: completed.map((c) => c.topic.name),
    remainingHighPriorityTopics: remaining.map((t) => t.name),
    weakTopics: weak.map((w) => ({ name: w.name, accuracy: w.accuracyPercent ?? 0 })),
    revisionDueTopics: dueRevisions.map((r) => r.topic.name),
    recentStudyHoursPerDay: Math.round((recentTotalHours / 7) * 10) / 10,
  };
}

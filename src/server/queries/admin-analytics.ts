import { prisma } from "@/lib/prisma";

export interface AdminAnalytics {
  totalUsers: number;
  activeStreakUsers: number;
  totalStudyHours: number;
  totalQuestionsAttempted: number;
  overallAccuracy: number | null;
  completedTopicsTotal: number;
  examEnrollment: { examName: string; count: number }[];
}

/** Cross-user aggregate stats for the admin panel — admin-only, all plain count/sum queries. */
export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  const [totalUsers, activeStreakUsers, sessions, attempts, completedTopicsTotal, examGroups, exams] =
    await Promise.all([
      prisma.profile.count(),
      prisma.streak.count({ where: { currentStreak: { gt: 0 } } }),
      prisma.studySession.aggregate({ _sum: { durationSeconds: true } }),
      prisma.questionAttempt.findMany({ select: { isCorrect: true } }),
      prisma.topicProgress.count({ where: { status: "COMPLETED" } }),
      prisma.profile.groupBy({ by: ["targetExamId"], _count: { _all: true }, where: { targetExamId: { not: null } } }),
      prisma.exam.findMany({ select: { id: true, name: true } }),
    ]);

  const totalAttempts = attempts.length;
  const correctAttempts = attempts.filter((a) => a.isCorrect).length;
  const overallAccuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : null;

  const examNameById = new Map(exams.map((e) => [e.id, e.name]));
  const examEnrollment = examGroups
    .filter((g) => g.targetExamId)
    .map((g) => ({ examName: examNameById.get(g.targetExamId!) ?? "Unknown", count: g._count._all }));

  return {
    totalUsers,
    activeStreakUsers,
    totalStudyHours: Math.round(((sessions._sum.durationSeconds ?? 0) / 3600) * 10) / 10,
    totalQuestionsAttempted: totalAttempts,
    overallAccuracy,
    completedTopicsTotal,
    examEnrollment,
  };
}

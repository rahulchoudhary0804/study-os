import { prisma } from "@/lib/prisma";
import { getSubjectProgress, getChapterProgress } from "./progress";

export async function getAnalyticsData(userId: string) {
  const [sessions, attempts, revisions, subjectProgress, streak] = await Promise.all([
    prisma.studySession.findMany({
      where: { userId, sessionType: "FOCUS" },
      select: {
        durationSeconds: true,
        topic: { select: { chapter: { select: { subjectId: true, subject: { select: { name: true } } } } } },
      },
    }),
    prisma.questionAttempt.findMany({
      where: { userId },
      select: {
        isCorrect: true,
        question: { select: { topic: { select: { chapter: { select: { subjectId: true, subject: { select: { name: true } } } } } } } },
      },
    }),
    prisma.revision.findMany({ where: { userId }, select: { status: true } }),
    getSubjectProgress(userId),
    prisma.streak.findUnique({ where: { userId } }),
  ]);

  const totalStudySeconds = sessions.reduce((s, x) => s + x.durationSeconds, 0);
  const totalAttempts = attempts.length;
  const correctAttempts = attempts.filter((a) => a.isCorrect).length;
  const overallAccuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : null;
  const revisionCompletionRate =
    revisions.length > 0 ? Math.round((revisions.filter((r) => r.status === "DONE").length / revisions.length) * 100) : 0;

  const bySubject = new Map<string, { name: string; seconds: number; attempts: number; correct: number }>();
  for (const s of sessions) {
    const subjectId = s.topic?.chapter.subjectId;
    if (!subjectId) continue;
    const name = s.topic!.chapter.subject.name;
    const bucket = bySubject.get(subjectId) ?? { name, seconds: 0, attempts: 0, correct: 0 };
    bucket.seconds += s.durationSeconds;
    bySubject.set(subjectId, bucket);
  }
  for (const a of attempts) {
    const subjectId = a.question.topic.chapter.subjectId;
    const name = a.question.topic.chapter.subject.name;
    const bucket = bySubject.get(subjectId) ?? { name, seconds: 0, attempts: 0, correct: 0 };
    bucket.attempts += 1;
    if (a.isCorrect) bucket.correct += 1;
    bySubject.set(subjectId, bucket);
  }

  const subjectChart = subjectProgress.map((s) => {
    const stats = bySubject.get(s.id);
    return {
      name: s.name,
      completionPercent: s.completionPercent,
      studyHours: stats ? Math.round((stats.seconds / 3600) * 10) / 10 : 0,
      accuracy: stats && stats.attempts > 0 ? Math.round((stats.correct / stats.attempts) * 100) : 0,
      questionsSolved: stats?.attempts ?? 0,
      subjectId: s.id,
    };
  });

  const chapterBreakdown = await Promise.all(
    subjectProgress.map(async (s) => ({ subjectName: s.name, chapters: await getChapterProgress(userId, s.id) }))
  );

  return {
    overall: {
      totalStudyHours: Math.round((totalStudySeconds / 3600) * 10) / 10,
      questionsAttempted: totalAttempts,
      accuracy: overallAccuracy,
      revisionCompletionRate,
      currentStreak: streak?.currentStreak ?? 0,
    },
    subjectChart,
    chapterBreakdown,
  };
}

import { prisma } from "@/lib/prisma";
import { computeWeaknessScore, type WeaknessResult } from "@/lib/domain/weakness";
import type { ProgressStatus } from "@prisma/client";

export interface WeakTopic extends WeaknessResult {
  topicId: string;
  name: string;
  chapterName: string;
  subjectName: string;
  examSlug: string;
  subjectSlug: string;
  chapterSlug: string;
  topicSlug: string;
  accuracyPercent: number | null;
  attemptsCount: number;
  revisionGapDays: number | null;
  href: string;
}

/**
 * Computes a weakness score (Section 16) for every topic the user has
 * actually engaged with (status != NOT_STARTED, or at least one attempt).
 * Rule-based — no AI call — so this is cheap enough to run on every
 * dashboard load.
 */
export async function getWeakTopics(userId: string, limit = 10): Promise<WeakTopic[]> {
  const engaged = await prisma.topicProgress.findMany({
    where: { userId, OR: [{ status: { not: "NOT_STARTED" } }] },
    include: {
      topic: {
        include: { chapter: { include: { subject: { include: { exam: true } } } } },
      },
    },
  });

  if (engaged.length === 0) return [];

  const topicIds = engaged.map((e) => e.topicId);

  const [attempts, revisions] = await Promise.all([
    prisma.questionAttempt.findMany({
      where: { userId, question: { topicId: { in: topicIds } } },
      select: { isCorrect: true, timeTakenSeconds: true, question: { select: { topicId: true } } },
    }),
    prisma.revision.findMany({ where: { userId, topicId: { in: topicIds } } }),
  ]);

  const attemptsByTopic = new Map<string, { correct: number; total: number; timeSum: number; timeCount: number }>();
  for (const a of attempts) {
    const tid = a.question.topicId;
    const bucket = attemptsByTopic.get(tid) ?? { correct: 0, total: 0, timeSum: 0, timeCount: 0 };
    bucket.total += 1;
    if (a.isCorrect) bucket.correct += 1;
    if (a.timeTakenSeconds != null) {
      bucket.timeSum += a.timeTakenSeconds;
      bucket.timeCount += 1;
    }
    attemptsByTopic.set(tid, bucket);
  }

  const revisionByTopic = new Map(revisions.map((r) => [r.topicId, r]));
  const today = new Date();

  const results: WeakTopic[] = engaged.map((e) => {
    const t = e.topic;
    const stats = attemptsByTopic.get(t.id);
    const accuracyPercent = stats && stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : null;
    const avgTimeSeconds = stats && stats.timeCount > 0 ? Math.round(stats.timeSum / stats.timeCount) : null;

    const revision = revisionByTopic.get(t.id);
    let revisionGapDays: number | null = null;
    if (revision && (revision.status === "DUE" || revision.status === "SNOOZED")) {
      revisionGapDays = Math.floor((today.getTime() - revision.dueDate.getTime()) / 86400000);
    }

    const weakness = computeWeaknessScore({
      accuracyPercent,
      attemptsCount: stats?.total ?? 0,
      avgTimeSeconds,
      revisionGapDays,
      progressStatus: e.status as ProgressStatus,
      confidence: e.confidence ?? null,
    });

    return {
      ...weakness,
      topicId: t.id,
      name: t.name,
      chapterName: t.chapter.name,
      subjectName: t.chapter.subject.name,
      examSlug: t.chapter.subject.exam.slug,
      subjectSlug: t.chapter.subject.slug,
      chapterSlug: t.chapter.slug,
      topicSlug: t.slug,
      accuracyPercent,
      attemptsCount: stats?.total ?? 0,
      revisionGapDays,
      href: `/study/${t.chapter.subject.exam.slug}/${t.chapter.subject.slug}/${t.chapter.slug}/${t.slug}`,
    };
  });

  return results
    .filter((r) => r.level !== "strong")
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

import { prisma } from "@/lib/prisma";
import { getWeakTopics } from "./weakness";
import type { PlannerDbState } from "@/lib/ai/prompts";
import type { SchedulableTopic } from "@/lib/domain/scheduler";

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

export interface FullQueueTopic extends SchedulableTopic {
  href: string;
  chapterId: string;
  subjectId: string;
}

/**
 * Every incomplete topic for the given exam(s) (or all active exams if
 * `examId` is omitted, i.e. "Both"), ordered: revision-due first, then weak
 * topics, then remaining by chapter/topic priority — the feed for the
 * full-syllabus scheduler in `src/lib/domain/scheduler.ts`.
 */
export async function getFullSyllabusQueue(userId: string, examId?: string): Promise<FullQueueTopic[]> {
  const [incomplete, weak, dueRevisions] = await Promise.all([
    prisma.topic.findMany({
      where: {
        isDeleted: false,
        chapter: { isDeleted: false, subject: examId ? { examId } : undefined },
        progress: { none: { userId, status: "COMPLETED" } },
      },
      orderBy: [{ chapter: { priority: "asc" } }, { priority: "asc" }, { chapter: { order: "asc" } }, { order: "asc" }],
      include: { chapter: { include: { subject: { include: { exam: true } } } } },
    }),
    getWeakTopics(userId, 1000),
    prisma.revision.findMany({
      where: { userId, status: { in: ["DUE", "SNOOZED"] }, dueDate: { lte: new Date() } },
      select: { topicId: true },
    }),
  ]);

  const toRow = (t: (typeof incomplete)[number]): FullQueueTopic => ({
    id: t.id,
    name: t.name,
    priority: t.priority,
    chapterId: t.chapterId,
    subjectId: t.chapter.subjectId,
    href: `/study/${t.chapter.subject.exam.slug}/${t.chapter.subject.slug}/${t.chapter.slug}/${t.slug}`,
  });

  const dueIds = new Set(dueRevisions.map((r) => r.topicId));
  const weakIds = new Set(weak.map((w) => w.topicId));

  const ordered: FullQueueTopic[] = [];
  const seen = new Set<string>();

  for (const t of incomplete) {
    if (dueIds.has(t.id) && !seen.has(t.id)) {
      ordered.push(toRow(t));
      seen.add(t.id);
    }
  }
  for (const t of incomplete) {
    if (weakIds.has(t.id) && !seen.has(t.id)) {
      ordered.push(toRow(t));
      seen.add(t.id);
    }
  }
  for (const t of incomplete) {
    if (!seen.has(t.id)) {
      ordered.push(toRow(t));
      seen.add(t.id);
    }
  }

  return ordered;
}

export interface UpcomingScheduleDay {
  date: Date;
  generatedByAI: boolean;
  items: {
    id: string;
    label: string;
    isDone: boolean;
    topicId: string | null;
    href: string | null;
  }[];
}

/** Browsable view of already-applied future DailyTargets, for the schedule viewer. */
export async function getUpcomingSchedule(userId: string, from: Date, to: Date): Promise<UpcomingScheduleDay[]> {
  const targets = await prisma.dailyTarget.findMany({
    where: { userId, date: { gte: from, lte: to } },
    orderBy: { date: "asc" },
    include: {
      items: {
        orderBy: { order: "asc" },
        include: { topic: { include: { chapter: { include: { subject: { include: { exam: true } } } } } } },
      },
    },
  });

  return targets.map((t) => ({
    date: t.date,
    generatedByAI: t.generatedByAI,
    items: t.items.map((item) => ({
      id: item.id,
      label: item.label,
      isDone: item.isDone,
      topicId: item.topicId,
      href: item.topic
        ? `/study/${item.topic.chapter.subject.exam.slug}/${item.topic.chapter.subject.slug}/${item.topic.chapter.slug}/${item.topic.slug}`
        : null,
    })),
  }));
}

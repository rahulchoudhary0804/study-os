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

export interface PlannerCandidate {
  id: string;
  name: string;
  chapterName: string;
  subjectName: string;
  priority: number;
  reason: string;
}

/**
 * The shortlist the one-day AI planner picks from: revision-due and weak
 * topics first, then unfinished high-priority topics interleaved across
 * subjects. Giving the model real ids (instead of letting it invent topic
 * names) is what lets an applied plan link back to actual topic pages.
 */
export async function getPlannerCandidates(userId: string, examId?: string, limit = 45): Promise<PlannerCandidate[]> {
  const topicSelect = {
    id: true,
    name: true,
    priority: true,
    chapter: { select: { name: true, priority: true, subject: { select: { name: true, exam: { select: { name: true } } } } } },
  } as const;

  const [due, weak, incomplete] = await Promise.all([
    prisma.revision.findMany({
      where: { userId, status: { in: ["DUE", "SNOOZED"] }, dueDate: { lte: new Date() }, topic: examId ? { chapter: { subject: { examId } } } : undefined },
      select: { topic: { select: topicSelect } },
      take: 10,
    }),
    getWeakTopics(userId, 10),
    prisma.topic.findMany({
      where: {
        isDeleted: false,
        chapter: { isDeleted: false, priority: { lte: 2 }, subject: examId ? { examId } : undefined },
        progress: { none: { userId, status: "COMPLETED" } },
      },
      orderBy: [{ chapter: { priority: "asc" } }, { priority: "asc" }, { chapter: { order: "asc" } }, { order: "asc" }],
      select: topicSelect,
      take: 150,
    }),
  ]);

  type Row = (typeof incomplete)[number];
  const toCandidate = (t: Row, reason: string): PlannerCandidate => ({
    id: t.id,
    name: t.name,
    chapterName: t.chapter.name,
    subjectName: examId ? t.chapter.subject.name : `${t.chapter.subject.exam.name} ${t.chapter.subject.name}`,
    priority: Math.min(t.priority, t.chapter.priority),
    reason,
  });

  const out: PlannerCandidate[] = [];
  const seen = new Set<string>();
  const push = (c: PlannerCandidate) => {
    if (seen.has(c.id) || out.length >= limit) return;
    seen.add(c.id);
    out.push(c);
  };

  for (const r of due) push(toCandidate(r.topic, "revision due"));

  const weakIds = weak.map((w) => w.topicId).filter((id) => !seen.has(id));
  if (weakIds.length) {
    const weakTopics = await prisma.topic.findMany({ where: { id: { in: weakIds } }, select: topicSelect });
    for (const t of weakTopics) {
      const w = weak.find((x) => x.topicId === t.id);
      push(toCandidate(t, `weak (${w?.accuracyPercent ?? "?"}% accuracy)`));
    }
  }

  // Round-robin across subjects so the shortlist isn't all Physics.
  const bySubject = new Map<string, Row[]>();
  for (const t of incomplete) {
    const key = `${t.chapter.subject.exam.name}/${t.chapter.subject.name}`;
    (bySubject.get(key) ?? bySubject.set(key, []).get(key)!).push(t);
  }
  const queues = [...bySubject.values()];
  for (let i = 0; out.length < limit && queues.some((q) => i < q.length); i++) {
    for (const q of queues) if (q[i]) push(toCandidate(q[i], `not started · chapter P${q[i].chapter.priority}`));
  }

  return out;
}

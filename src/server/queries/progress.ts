import { prisma } from "@/lib/prisma";
import { computeWeightedCompletion } from "@/lib/domain/progress";

/** Overall weighted completion across every non-deleted topic, for a user, optionally scoped to one exam. */
export async function getOverallProgress(userId: string, examId?: string) {
  const topics = await prisma.topic.findMany({
    where: { isDeleted: false, chapter: { isDeleted: false, subject: examId ? { examId } : undefined } },
    select: {
      id: true,
      chapter: { select: { priority: true } },
      progress: { where: { userId }, select: { status: true } },
    },
  });

  const forCompletion = topics.map((t) => ({
    status: t.progress[0]?.status ?? "NOT_STARTED",
    chapterPriority: t.chapter.priority,
  }));

  return {
    totalTopics: topics.length,
    completedTopics: forCompletion.filter((t) => t.status === "COMPLETED").length,
    weightedCompletionPercent: computeWeightedCompletion(forCompletion as never),
  };
}

/** Per-subject completion, used by the Subjects page and Analytics. */
export async function getSubjectProgress(userId: string) {
  const subjects = await prisma.subject.findMany({
    include: {
      exam: true,
      chapters: {
        where: { isDeleted: false },
        select: {
          priority: true,
          topics: {
            where: { isDeleted: false },
            select: { id: true, progress: { where: { userId }, select: { status: true } } },
          },
        },
      },
    },
    orderBy: [{ exam: { order: "asc" } }, { order: "asc" }],
  });

  return subjects.map((s) => {
    const topics = s.chapters.flatMap((c) =>
      c.topics.map((t) => ({ status: t.progress[0]?.status ?? "NOT_STARTED", chapterPriority: c.priority }))
    );
    return {
      id: s.id,
      slug: s.slug,
      name: s.name,
      examSlug: s.exam.slug,
      examName: s.exam.name,
      totalTopics: topics.length,
      completionPercent: computeWeightedCompletion(topics as never),
    };
  });
}

/** Per-chapter completion within one subject — used by the chapter list page and Analytics. */
export async function getChapterProgress(userId: string, subjectId: string) {
  const chapters = await prisma.chapter.findMany({
    where: { subjectId, isDeleted: false },
    orderBy: { order: "asc" },
    include: {
      topics: {
        where: { isDeleted: false },
        select: { id: true, name: true, priority: true, progress: { where: { userId }, select: { status: true } } },
      },
    },
  });

  return chapters.map((c) => {
    const topics = c.topics.map((t) => ({ status: t.progress[0]?.status ?? "NOT_STARTED", chapterPriority: c.priority }));
    return {
      ...c,
      completionPercent: computeWeightedCompletion(topics as never),
      completedCount: topics.filter((t) => t.status === "COMPLETED").length,
      totalCount: topics.length,
    };
  });
}

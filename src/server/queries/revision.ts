import { prisma } from "@/lib/prisma";
import { revisionUrgency } from "@/lib/domain/revision";

export async function getDueRevisions(userId: string) {
  const rows = await prisma.revision.findMany({
    where: { userId, status: { in: ["DUE", "SNOOZED"] }, dueDate: { lte: new Date() } },
    include: { topic: { include: { chapter: { include: { subject: { include: { exam: true } } } } } } },
    orderBy: { dueDate: "asc" },
  });

  const grouped = { critical: [] as typeof rows, high: [] as typeof rows, medium: [] as typeof rows };
  for (const r of rows) {
    const urgency = revisionUrgency(r.dueDate);
    grouped[urgency].push(r);
  }

  const mapItem = (r: (typeof rows)[number]) => ({
    id: r.id,
    topicId: r.topicId,
    topicName: r.topic.name,
    chapterName: r.topic.chapter.name,
    subjectName: r.topic.chapter.subject.name,
    stage: r.stage,
    dueDate: r.dueDate,
    href: `/study/${r.topic.chapter.subject.exam.slug}/${r.topic.chapter.subject.slug}/${r.topic.chapter.slug}/${r.topic.slug}`,
  });

  return {
    total: rows.length,
    critical: grouped.critical.map(mapItem),
    high: grouped.high.map(mapItem),
    medium: grouped.medium.map(mapItem),
  };
}

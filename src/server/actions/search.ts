"use server";

import { prisma } from "@/lib/prisma";
import { requireUserAction } from "@/lib/auth";

export interface SearchResult {
  type: "topic" | "chapter" | "note";
  id: string;
  title: string;
  breadcrumb: string;
  href: string;
}

/** Global search across subjects/chapters/topics/notes (Section 27). */
export async function searchAction(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const { profile } = await requireUserAction();

  const [topics, chapters, notes] = await Promise.all([
    prisma.topic.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      take: 6,
      include: { chapter: { include: { subject: { include: { exam: true } } } } },
    }),
    prisma.chapter.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      take: 6,
      include: { subject: { include: { exam: true } } },
    }),
    prisma.note.findMany({
      where: { userId: profile.id, title: { contains: q, mode: "insensitive" } },
      take: 6,
    }),
  ]);

  const results: SearchResult[] = [];

  for (const t of topics) {
    results.push({
      type: "topic",
      id: t.id,
      title: t.name,
      breadcrumb: `${t.chapter.subject.exam.name} → ${t.chapter.subject.name} → ${t.chapter.name}`,
      href: `/study/${t.chapter.subject.exam.slug}/${t.chapter.subject.slug}/${t.chapter.slug}/${t.slug}`,
    });
  }
  for (const c of chapters) {
    results.push({
      type: "chapter",
      id: c.id,
      title: c.name,
      breadcrumb: `${c.subject.exam.name} → ${c.subject.name}`,
      href: `/study/${c.subject.exam.slug}/${c.subject.slug}/${c.slug}`,
    });
  }
  for (const n of notes) {
    results.push({ type: "note", id: n.id, title: n.title, breadcrumb: "My Notes", href: `/notes/${n.id}` });
  }

  return results;
}

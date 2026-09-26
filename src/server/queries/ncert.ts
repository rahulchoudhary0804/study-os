import { prisma } from "@/lib/prisma";

export interface NcertEntry {
  title: string;
  url: string;
  subjectName: string;
  appearances: { examName: string; subjectName: string; chapterName: string; href: string }[];
}

/**
 * Builds the NCERT reference library directly from live Chapter data (not a
 * separate static list) — a chapter's ncertLinks JSON is the single source
 * of truth, so this page can never drift from what's actually linked on
 * chapter pages. Same PDF referenced by both a JEE and an RBSE chapter is
 * shown once, with both "appears in" links.
 */
export async function getNcertLibrary(): Promise<Record<string, NcertEntry[]>> {
  const chapters = await prisma.chapter.findMany({
    where: { isDeleted: false },
    include: { subject: { include: { exam: true } } },
  });

  const byUrl = new Map<string, NcertEntry>();

  for (const c of chapters) {
    const links = Array.isArray(c.ncertLinks) ? (c.ncertLinks as unknown as { title: string; url: string }[]) : [];
    for (const link of links) {
      const existing = byUrl.get(link.url);
      const appearance = {
        examName: c.subject.exam.name,
        subjectName: c.subject.name,
        chapterName: c.name,
        href: `/study/${c.subject.exam.slug}/${c.subject.slug}/${c.slug}`,
      };
      if (existing) {
        existing.appearances.push(appearance);
      } else {
        byUrl.set(link.url, {
          title: link.title,
          url: link.url,
          subjectName: c.subject.name,
          appearances: [appearance],
        });
      }
    }
  }

  const grouped: Record<string, NcertEntry[]> = {};
  for (const entry of byUrl.values()) {
    (grouped[entry.subjectName] ??= []).push(entry);
  }
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => a.title.localeCompare(b.title));
  }
  return grouped;
}

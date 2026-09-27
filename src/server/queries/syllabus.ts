import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export interface SyllabusTopic {
  id: string;
  name: string;
  priority: number;
  href: string;
}

export interface SyllabusChapter {
  id: string;
  name: string;
  priority: number;
  /** Short "how many marks / questions" line, e.g. "6 marks" or "1–2 Q/shift". */
  weightage: string | null;
  ncertLinks: { title: string; url: string }[];
  topics: SyllabusTopic[];
}

export interface SyllabusSubject {
  id: string;
  name: string;
  chapters: SyllabusChapter[];
}

export interface SyllabusExam {
  id: string;
  slug: string;
  name: string;
  subjects: SyllabusSubject[];
}

/** Pulls a compact marks/frequency label out of a chapter's pyqTrend JSON. */
export function weightageLabel(pyqTrend: unknown): string | null {
  if (!pyqTrend || typeof pyqTrend !== "object") return null;
  const t = pyqTrend as { marks?: unknown; freq?: unknown };
  if (typeof t.marks === "string" && t.marks.trim()) return t.marks.trim();
  if (typeof t.freq !== "string") return null;
  const m = t.freq.match(/~?\s?\d+(?:\s*[–-]\s*\d+)?\s*(?:\/\s*\d+\s*)?marks?/i);
  if (m) return m[0].replace(/\s+/g, " ").trim();
  const q = t.freq.match(/(\d+(?:\s*[–-]\s*\d+)?)\s*questions?/i);
  return q ? `${q[1].replace(/\s+/g, "")} Q / paper` : null;
}

/**
 * The full exam → subject → chapter → topic tree (active, non-deleted rows
 * only), ordered by priority within each subject. The syllabus only changes
 * when an admin edits it, so it's cached for an hour and shared by every
 * student instead of re-queried on each page view (see getSyllabusTree).
 */
export async function loadSyllabusTree(): Promise<SyllabusExam[]> {
    const exams = await prisma.exam.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        subjects: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            slug: true,
            name: true,
            chapters: {
              where: { isDeleted: false },
              orderBy: [{ priority: "asc" }, { order: "asc" }],
              select: {
                id: true,
                slug: true,
                name: true,
                priority: true,
                pyqTrend: true,
                ncertLinks: true,
                topics: {
                  where: { isDeleted: false },
                  orderBy: [{ priority: "asc" }, { order: "asc" }],
                  select: { id: true, slug: true, name: true, priority: true },
                },
              },
            },
          },
        },
      },
    });

    return exams.map((e) => ({
      id: e.id,
      slug: e.slug,
      name: e.name,
      subjects: e.subjects
        .filter((s) => s.chapters.some((c) => c.topics.length > 0))
        .map((s) => ({
          id: s.id,
          name: s.name,
          chapters: s.chapters
            .filter((c) => c.topics.length > 0)
            .map((c) => ({
              id: c.id,
              name: c.name,
              priority: c.priority,
              weightage: weightageLabel(c.pyqTrend),
              ncertLinks: Array.isArray(c.ncertLinks) ? (c.ncertLinks as unknown as { title: string; url: string }[]) : [],
              topics: c.topics.map((t) => ({
                id: t.id,
                name: t.name,
                priority: t.priority,
                href: `/study/${e.slug}/${s.slug}/${c.slug}/${t.slug}`,
              })),
            })),
        })),
    }));
}

export const getSyllabusTree = unstable_cache(loadSyllabusTree, ["syllabus-tree-v1"], {
  revalidate: 3600,
  tags: ["syllabus"],
});

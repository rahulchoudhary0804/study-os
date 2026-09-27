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
  slug: string;
  name: string;
  priority: number;
  /** Short "how many marks / questions" line, e.g. "6 marks" or "1–2 Q/shift". */
  weightage: string | null;
  ncertLinks: { title: string; url: string }[];
  topics: SyllabusTopic[];
}

export interface SyllabusSubject {
  id: string;
  slug: string;
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
          slug: s.slug,
          name: s.name,
          chapters: s.chapters
            .filter((c) => c.topics.length > 0)
            .map((c) => ({
              id: c.id,
              slug: c.slug,
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

export const getSyllabusTree = unstable_cache(loadSyllabusTree, ["syllabus-tree-v3"], {
  revalidate: 3600,
  tags: ["syllabus"],
});

export interface PublicChapter {
  slug: string;
  name: string;
  priority: number;
  weightage: string | null;
  importance: string | null;
  pattern: string | null;
  mustKnow: string[];
  questionPatterns: string[];
  ncertLinks: { title: string; url: string }[];
  topics: { name: string; priority: number; description: string | null }[];
}

/** Everything a public (logged-out, indexable) subject syllabus page shows. */
export const getPublicSubjectSyllabus = unstable_cache(
  async (examSlug: string, subjectSlug: string) => {
    const subject = await prisma.subject.findFirst({
      where: { slug: subjectSlug, exam: { slug: examSlug, isActive: true } },
      select: {
        name: true,
        exam: { select: { name: true, slug: true } },
        chapters: {
          where: { isDeleted: false },
          orderBy: [{ priority: "asc" }, { order: "asc" }],
          select: {
            slug: true, name: true, priority: true, importance: true, pyqTrend: true, mustKnow: true,
            questionPatterns: true, ncertLinks: true,
            topics: { where: { isDeleted: false }, orderBy: [{ priority: "asc" }, { order: "asc" }], select: { name: true, priority: true, description: true } },
          },
        },
      },
    });
    if (!subject) return null;
    const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]).filter((x) => typeof x === "string") : []);
    return {
      examName: subject.exam.name,
      examSlug: subject.exam.slug,
      subjectName: subject.name,
      chapters: subject.chapters.map<PublicChapter>((c) => ({
        slug: c.slug,
        name: c.name,
        priority: c.priority,
        weightage: weightageLabel(c.pyqTrend),
        importance: c.importance,
        pattern: (c.pyqTrend as { pattern?: string } | null)?.pattern ?? null,
        mustKnow: arr(c.mustKnow),
        questionPatterns: arr(c.questionPatterns),
        ncertLinks: Array.isArray(c.ncertLinks) ? (c.ncertLinks as unknown as { title: string; url: string }[]) : [],
        topics: c.topics,
      })),
    };
  },
  ["public-subject-syllabus-v1"],
  { revalidate: 3600, tags: ["syllabus"] }
);

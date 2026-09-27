import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityBadge, StatusBadge } from "@/components/priority-badge";
import { BookOpen, ExternalLink } from "lucide-react";

function JsonList({ value }: { value: unknown }) {
  const arr = Array.isArray(value) ? (value as string[]) : [];
  if (arr.length === 0) return <p className="text-sm text-muted-foreground">—</p>;
  return (
    <ul className="list-disc pl-5 space-y-1 text-sm">
      {arr.map((v, i) => (
        <li key={i}>{v}</li>
      ))}
    </ul>
  );
}

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ examSlug: string; subjectSlug: string; chapterSlug: string }>;
}) {
  const { examSlug, subjectSlug, chapterSlug } = await params;
  const { profile } = await requireUser();

  const chapter = await prisma.chapter.findFirst({
    where: { slug: chapterSlug, subject: { slug: subjectSlug, exam: { slug: examSlug } } },
    include: {
      subject: { include: { exam: true } },
      topics: {
        where: { isDeleted: false },
        orderBy: { order: "asc" },
        include: { progress: { where: { userId: profile.id } } },
      },
    },
  });
  if (!chapter) notFound();

  const pyq = chapter.pyqTrend as { marks?: string; freq?: string; historical?: string; pattern?: string; difficulty?: string } | null;
  const ncertLinks = (chapter.ncertLinks as { title: string; url: string }[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/study" className="hover:underline">
            Study
          </Link>{" "}
          /{" "}
          <Link href={`/study/${examSlug}`} className="hover:underline">
            {chapter.subject.exam.name}
          </Link>{" "}
          /{" "}
          <Link href={`/study/${examSlug}/${subjectSlug}`} className="hover:underline">
            {chapter.subject.name}
          </Link>{" "}
          / {chapter.name}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-2xl font-semibold tracking-tight">{chapter.name}</h1>
          <PriorityBadge priority={chapter.priority} />
        </div>
        {chapter.importance && <p className="text-sm text-muted-foreground mt-2 max-w-3xl">{chapter.importance}</p>}
      </div>

      {ncertLinks.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/40">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-blue-800">
              <BookOpen className="size-4" /> NCERT Textbook
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {ncertLinks.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm bg-white border border-blue-200 rounded-md px-3 py-1.5 hover:bg-blue-100 text-blue-800"
              >
                {link.title} <ExternalLink className="size-3" />
              </a>
            ))}
          </CardContent>
        </Card>
      )}

      {pyq && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {chapter.subject.exam.slug.includes("rbse") ? "Board Marks & Question Pattern" : "PYQ Trend"}
              {pyq.marks && (
                <span className="rounded-full bg-primary text-primary-foreground px-2.5 py-0.5 text-xs font-semibold">
                  {pyq.marks}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase">
                {pyq.marks ? "Marks weightage" : "Frequency"}
              </span>
              <p>{pyq.freq}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase">Historical importance</span>
              <p>{pyq.historical}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase">Question pattern</span>
              <p>{pyq.pattern}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase">Difficulty trend</span>
              <p>{pyq.difficulty}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Must Know</CardTitle>
          </CardHeader>
          <CardContent>
            <JsonList value={chapter.mustKnow} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Common Mistakes</CardTitle>
          </CardHeader>
          <CardContent>
            <JsonList value={chapter.commonMistakes} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Topics</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {chapter.topics.map((t) => (
            <Link
              key={t.id}
              href={`/study/${examSlug}/${subjectSlug}/${chapterSlug}/${t.slug}`}
              className="flex items-center justify-between py-3 hover:opacity-80"
            >
              <div>
                <p className="text-sm font-medium">{t.name}</p>
                {t.description && <p className="text-xs text-muted-foreground line-clamp-1 max-w-md">{t.description}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <PriorityBadge priority={t.priority} />
                <StatusBadge status={t.progress[0]?.status ?? "NOT_STARTED"} />
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getChapterProgress } from "@/server/queries/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PriorityBadge } from "@/components/priority-badge";
import { BookOpen } from "lucide-react";
import { weightageLabel } from "@/server/queries/syllabus";

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ examSlug: string; subjectSlug: string }>;
}) {
  const { examSlug, subjectSlug } = await params;
  const { profile } = await requireUser();

  const subject = await prisma.subject.findFirst({
    where: { slug: subjectSlug, exam: { slug: examSlug } },
    include: { exam: true },
  });
  if (!subject) notFound();

  const chapters = await getChapterProgress(profile.id, subject.id);
  const groups: Record<number, typeof chapters> = { 1: [], 2: [], 3: [], 4: [] };
  for (const c of chapters) groups[c.priority]?.push(c);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/study" className="hover:underline">
            Study
          </Link>{" "}
          /{" "}
          <Link href={`/study/${examSlug}`} className="hover:underline">
            {subject.exam.name}
          </Link>{" "}
          / {subject.name}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">{subject.name}</h1>
      </div>

      {[1, 2, 3, 4].map(
        (p) =>
          groups[p].length > 0 && (
            <div key={p} className="space-y-2">
              <PriorityBadge priority={p} />
              <div className="grid gap-3 sm:grid-cols-2">
                {groups[p].map((c) => (
                  <Link key={c.id} href={`/study/${examSlug}/${subjectSlug}/${c.slug}`}>
                    <Card className="hover:border-primary/50 transition-colors h-full">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-sm">{c.name}</p>
                          {Array.isArray(c.ncertLinks) && c.ncertLinks.length > 0 && (
                            <BookOpen className="size-3.5 text-blue-500 shrink-0" aria-label="NCERT PDF available" />
                          )}
                          {weightageLabel(c.pyqTrend) && (
                            <span className="ml-auto shrink-0 rounded-full border-2 border-border px-2 py-0.5 text-[11px] font-semibold">
                              {weightageLabel(c.pyqTrend)}
                            </span>
                          )}
                        </div>
                        {c.importance && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.importance}</p>
                        )}
                        <div className="flex items-center justify-between text-xs mt-3 mb-1">
                          <span className="text-muted-foreground">
                            {c.completedCount}/{c.totalCount} topics
                          </span>
                          <span className="font-medium">{c.completionPercent}%</span>
                        </div>
                        <Progress value={c.completionPercent} className="h-1.5" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )
      )}
    </div>
  );
}

import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityBadge } from "@/components/priority-badge";
import { Badge } from "@/components/ui/badge";

export default async function PracticePage() {
  const { profile } = await requireUser();

  const [priorityTopics, recentQuestions, totalQuestions] = await Promise.all([
    prisma.topic.findMany({
      where: { isDeleted: false, priority: 1, chapter: { isDeleted: false } },
      take: 24,
      orderBy: { name: "asc" },
      include: { chapter: { include: { subject: { include: { exam: true } } } } },
    }),
    prisma.question.findMany({
      where: { createdByUserId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { topic: { include: { chapter: { include: { subject: { include: { exam: true } } } } } } },
    }),
    prisma.question.count(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Practice</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {totalQuestions} questions in the shared question bank. Open any topic to generate AI practice
          questions or answer saved ones.
        </p>
      </div>

      {recentQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Continue where you left off</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {recentQuestions.map((q) => (
              <Link
                key={q.id}
                href={`/study/${q.topic.chapter.subject.exam.slug}/${q.topic.chapter.subject.slug}/${q.topic.chapter.slug}/${q.topic.slug}`}
                className="flex items-center justify-between py-2.5 hover:opacity-80"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{q.topic.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{q.questionText}</p>
                </div>
                <Badge variant="outline" className="shrink-0 ml-2">
                  {q.difficulty}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-2">🔴 Priority 1 topics — start here</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {priorityTopics.map((t) => (
            <Link key={t.id} href={`/study/${t.chapter.subject.exam.slug}/${t.chapter.subject.slug}/${t.chapter.slug}/${t.slug}`}>
              <Card className="hover:border-primary/50 transition-colors h-full">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{t.name}</p>
                    <PriorityBadge priority={t.priority} className="shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t.chapter.subject.exam.name} · {t.chapter.subject.name}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

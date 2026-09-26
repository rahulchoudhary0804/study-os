import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getOverallProgress } from "@/server/queries/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowRight } from "lucide-react";

export default async function StudyPage() {
  const { profile } = await requireUser();
  const exams = await prisma.exam.findMany({ where: { isActive: true }, orderBy: { order: "asc" } });

  const withProgress = await Promise.all(
    exams.map(async (e) => ({ ...e, progress: await getOverallProgress(profile.id, e.id) }))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Study</h1>
        <p className="text-sm text-muted-foreground mt-1">Pick an exam to browse its subjects, chapters and topics.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {withProgress.map((exam) => (
          <Link key={exam.id} href={`/study/${exam.slug}`}>
            <Card className="hover:border-primary/50 transition-colors h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg">
                  {exam.name}
                  <ArrowRight className="size-4 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                {exam.description && <p className="text-sm text-muted-foreground mb-3">{exam.description}</p>}
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Progress</span>
                  <span className="font-medium">{exam.progress.weightedCompletionPercent}%</span>
                </div>
                <Progress value={exam.progress.weightedCompletionPercent} className="h-1.5" />
                <p className="text-xs text-muted-foreground mt-2">
                  {exam.progress.completedTopics}/{exam.progress.totalTopics} topics completed
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

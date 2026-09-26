import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getSubjectProgress } from "@/server/queries/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default async function SubjectsPage() {
  const { profile } = await requireUser();
  const subjects = await getSubjectProgress(profile.id);
  const byExam = subjects.reduce<Record<string, typeof subjects>>((acc, s) => {
    (acc[s.examName] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Subjects</h1>
        <p className="text-sm text-muted-foreground mt-1">Every subject across both exams, at a glance.</p>
      </div>
      {Object.entries(byExam).map(([examName, list]) => (
        <div key={examName} className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">{examName}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((s) => (
              <Link key={s.id} href={`/study/${s.examSlug}/${s.slug}`}>
                <Card className="hover:border-primary/50 transition-colors h-full">
                  <CardContent className="pt-5">
                    <p className="font-medium text-sm">{s.name}</p>
                    <div className="flex items-center justify-between text-xs mt-3 mb-1">
                      <span className="text-muted-foreground">{s.totalTopics} topics</span>
                      <span className="font-medium">{s.completionPercent}%</span>
                    </div>
                    <Progress value={s.completionPercent} className="h-1.5" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

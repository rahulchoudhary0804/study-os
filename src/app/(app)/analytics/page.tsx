import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getAnalyticsData } from "@/server/queries/analytics";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { SubjectCharts } from "@/components/analytics/subject-charts";
import { BarChart3, ArrowRight } from "lucide-react";

export default async function AnalyticsPage() {
  const { profile } = await requireUser();
  const data = await getAnalyticsData(profile.id);

  const hasNoData =
    data.overall.totalStudyHours === 0 &&
    data.overall.questionsAttempted === 0 &&
    data.subjectChart.every((s) => s.studyHours === 0 && s.questionsSolved === 0);

  if (hasNoData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Computed from your real study sessions, attempts and revisions.</p>
        </div>
        <Card>
          <CardContent className="pt-10 pb-10 text-center space-y-3">
            <div className="flex items-center justify-center size-12 rounded-full bg-primary/10 text-primary mx-auto">
              <BarChart3 className="size-6" />
            </div>
            <p className="text-sm font-medium">Nothing to show yet</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Study a topic or two and log a few practice attempts — your analytics will fill in
              automatically from there.
            </p>
            <Button asChild size="sm">
              <Link href="/study">
                Start studying <ArrowRight className="size-3.5 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Computed from your real study sessions, attempts and revisions.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-semibold">{data.overall.totalStudyHours}h</p>
            <p className="text-xs text-muted-foreground mt-1">Total study hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-semibold">{data.overall.questionsAttempted}</p>
            <p className="text-xs text-muted-foreground mt-1">Questions attempted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-semibold">{data.overall.accuracy !== null ? `${data.overall.accuracy}%` : "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">Overall accuracy</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-semibold">{data.overall.revisionCompletionRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">Revision completion</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-semibold">{data.overall.currentStreak}</p>
            <p className="text-xs text-muted-foreground mt-1">Current streak</p>
          </CardContent>
        </Card>
      </div>

      <SubjectCharts data={data.subjectChart} />

      <div className="space-y-5">
        <h2 className="text-lg font-semibold">Chapter-wise progress</h2>
        {data.chapterBreakdown.map((s) => (
          <Card key={s.subjectName}>
            <CardContent className="pt-6 space-y-3">
              <p className="text-sm font-medium">{s.subjectName}</p>
              {s.chapters.map((c) => (
                <div key={c.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span>{c.name}</span>
                    <span className="font-medium">{c.completionPercent}%</span>
                  </div>
                  <Progress value={c.completionPercent} className="h-1.5" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

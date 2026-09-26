import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminAnalytics } from "@/server/queries/admin-analytics";
import { Users, Flame, Clock, Target, CheckCircle2 } from "lucide-react";

export default async function AdminOverviewPage() {
  const analytics = await getAdminAnalytics();

  const stats = [
    { icon: Users, label: "Total users", value: analytics.totalUsers, color: "text-blue-600 bg-blue-500/10" },
    { icon: Flame, label: "Active streaks", value: analytics.activeStreakUsers, color: "text-orange-600 bg-orange-500/10" },
    { icon: Clock, label: "Total study hours", value: `${analytics.totalStudyHours}h`, color: "text-violet-600 bg-violet-500/10" },
    { icon: Target, label: "Questions attempted", value: analytics.totalQuestionsAttempted, color: "text-primary bg-primary/10" },
    {
      icon: CheckCircle2,
      label: "Overall accuracy",
      value: analytics.overallAccuracy !== null ? `${analytics.overallAccuracy}%` : "—",
      color: "text-green-600 bg-green-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Cross-user analytics, computed live from real activity.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className={`flex items-center justify-center size-9 rounded-lg mb-3 ${s.color}`}>
                <s.icon className="size-4.5" />
              </div>
              <div className="text-2xl font-semibold">{s.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {analytics.examEnrollment.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Exam enrollment</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            {analytics.examEnrollment.map((e) => (
              <div key={e.examName}>
                <p className="text-xl font-semibold">{e.count}</p>
                <p className="text-xs text-muted-foreground">{e.examName}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

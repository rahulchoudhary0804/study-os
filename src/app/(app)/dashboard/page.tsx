import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/server/queries/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TargetItemRow } from "@/components/dashboard/target-item-row";
import { TimeGreeting } from "@/components/dashboard/time-greeting";
import { DashboardRobotCue } from "@/components/study-robot/robot-cue";
import {
  Flame,
  Target,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  Bot,
  Clock,
  TrendingUp,
  CalendarClock,
} from "lucide-react";

const LEVEL_BADGE: Record<string, { label: string; className: string }> = {
  critical: { label: "🔴 Critical", className: "bg-red-100 text-red-700" },
  weak: { label: "🟠 Weak", className: "bg-orange-100 text-orange-700" },
  needs_practice: { label: "🟡 Needs Practice", className: "bg-yellow-100 text-yellow-700" },
  strong: { label: "🟢 Strong", className: "bg-green-100 text-green-700" },
};

export default async function DashboardPage() {
  const { profile, email } = await requireUser();
  const data = await getDashboardData(profile);
  const name = profile.fullName || email.split("@")[0];

  return (
    <div className="space-y-6">
      <DashboardRobotCue
        streak={data.streak.current}
        revisionDue={data.revisionDueTotal}
        weakTopic={data.weakTopics[0]?.name ?? null}
        missedYesterday={data.missedYesterday}
        todayDone={data.todayTarget?.items.filter((i) => i.isDone).length ?? 0}
        todayTotal={data.todayTarget?.items.length ?? 0}
      />
      <div>
        <TimeGreeting name={name} />
        <p className="text-sm text-muted-foreground mt-1">Here&apos;s where things stand today.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <div className="absolute -right-4 -top-4 size-20 rounded-full bg-orange-500/10" aria-hidden />
          <CardContent className="pt-6 relative">
            <div className="flex items-center justify-center size-9 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 mb-3">
              <Flame className="size-4.5" />
            </div>
            <div className="text-2xl font-semibold">{data.streak.current}</div>
            <p className="text-xs text-muted-foreground mt-1">Day streak · longest {data.streak.longest}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute -right-4 -top-4 size-20 rounded-full bg-blue-500/10" aria-hidden />
          <CardContent className="pt-6 relative">
            <div className="flex items-center justify-center size-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-3">
              <Clock className="size-4.5" />
            </div>
            <div className="text-2xl font-semibold">
              {Math.floor(data.todayMinutes / 60)}h {data.todayMinutes % 60}m
              <span className="text-sm text-muted-foreground font-normal"> / {Math.floor(data.goalMinutes / 60)}h</span>
            </div>
            <Progress value={Math.min(100, (data.todayMinutes / Math.max(1, data.goalMinutes)) * 100)} className="mt-2 h-1.5" />
            <p className="text-xs text-muted-foreground mt-1">Today&apos;s study time</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute -right-4 -top-4 size-20 rounded-full bg-primary/10" aria-hidden />
          <CardContent className="pt-6 relative">
            <div className="flex items-center justify-center size-9 rounded-lg bg-primary/10 text-primary mb-3">
              <TrendingUp className="size-4.5" />
            </div>
            <div className="text-2xl font-semibold">{data.overallProgress.weightedCompletionPercent}%</div>
            <Progress value={data.overallProgress.weightedCompletionPercent} className="mt-2 h-1.5" />
            <p className="text-xs text-muted-foreground mt-1">
              Overall progress · {data.overallProgress.completedTopics}/{data.overallProgress.totalTopics} topics
            </p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute -right-4 -top-4 size-20 rounded-full bg-violet-500/10" aria-hidden />
          <CardContent className="pt-6 relative">
            <div className="flex items-center justify-center size-9 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 mb-3">
              <CalendarClock className="size-4.5" />
            </div>
            <div className="text-2xl font-semibold">
              {data.examCountdown !== null ? data.examCountdown : "—"}
              {data.examCountdown !== null && <span className="text-sm font-normal text-muted-foreground"> days</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.examCountdown !== null ? "Until your target exam" : "Set your exam date in Settings"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/30 bg-gradient-to-r from-primary/[0.06] to-transparent">
        <CardContent className="pt-6 flex items-start gap-3">
          <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary shrink-0">
            <Sparkles className="size-4" />
          </div>
          <div>
            <p className="text-sm font-medium">Recommended focus</p>
            <p className="text-sm text-muted-foreground mt-1">{data.recommendation}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className={data.todayTarget?.generatedByAI ? "border-primary/30 bg-primary/[0.02]" : undefined}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="size-4" /> Today&apos;s Targets
              {data.todayTarget?.generatedByAI && (
                <Badge variant="secondary" className="bg-primary/10 text-primary ml-1">
                  <Bot className="size-3 mr-1" /> AI Generated
                </Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/plan">
                Manage <ArrowRight className="size-3.5 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="divide-y">
            {data.todayTarget?.generatedByAI && data.todayTarget.aiRationale && (
              <p className="text-xs text-muted-foreground pb-3 mb-1 border-b italic">
                &ldquo;{data.todayTarget.aiRationale}&rdquo;
              </p>
            )}
            {!data.todayTarget || data.todayTarget.items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No targets set for today yet.{" "}
                <Link href="/plan" className="underline">
                  Add some
                </Link>{" "}
                or let the AI Planner build your day.
              </p>
            ) : (
              data.todayTarget.items.map((item) => (
                <TargetItemRow
                  key={item.id}
                  id={item.id}
                  label={item.label}
                  subLabel={item.topic ? `${item.topic.chapter.subject.name} → ${item.topic.chapter.name}` : undefined}
                  isDone={item.isDone}
                  topicId={item.topicId ?? undefined}
                  href={
                    item.topic
                      ? `/study/${item.topic.chapter.subject.exam.slug}/${item.topic.chapter.subject.slug}/${item.topic.chapter.slug}/${item.topic.slug}`
                      : undefined
                  }
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="size-4" /> Needs Attention
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/analytics">
                See all <ArrowRight className="size-3.5 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="divide-y">
            {data.weakTopics.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No weak topics detected yet — practice a few questions to start tracking accuracy.
              </p>
            ) : (
              data.weakTopics.map((t) => (
                <Link key={t.topicId} href={t.href} className="flex items-center justify-between py-2.5 hover:opacity-80">
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.accuracyPercent !== null ? `Accuracy ${t.accuracyPercent}%` : "No attempts yet"} · {t.chapterName}
                    </p>
                  </div>
                  <Badge variant="secondary" className={LEVEL_BADGE[t.level].className}>
                    {LEVEL_BADGE[t.level].label}
                  </Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="size-4" /> Revision Due
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/revision">
              Go to revision <ArrowRight className="size-3.5 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{data.revisionDueTotal}</p>
          <p className="text-xs text-muted-foreground">topics due for revision today</p>
        </CardContent>
      </Card>
    </div>
  );
}

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { subDays, startOfDay, format } from "date-fns";
import { Flame } from "lucide-react";

export default async function StreakPage() {
  const { profile } = await requireUser();
  const since = startOfDay(subDays(new Date(), 90));

  const [streak, logs] = await Promise.all([
    prisma.streak.findUnique({ where: { userId: profile.id } }),
    prisma.studyDayLog.findMany({ where: { userId: profile.id, date: { gte: since } } }),
  ]);

  const logByDate = new Map(logs.map((l) => [format(l.date, "yyyy-MM-dd"), l]));
  const days: { date: Date; minutes: number; met: boolean }[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = startOfDay(subDays(new Date(), i));
    const log = logByDate.get(format(d, "yyyy-MM-dd"));
    days.push({ date: d, minutes: log?.totalMinutes ?? 0, met: log?.targetMet ?? false });
  }

  const last7 = days.slice(-7);
  const last30 = days.slice(-30);
  const weeklyConsistency = Math.round((last7.filter((d) => d.met).length / 7) * 100);
  const monthlyConsistency = Math.round((last30.filter((d) => d.met).length / 30) * 100);

  const intensity = (minutes: number) => {
    if (minutes === 0) return "bg-muted";
    if (minutes < 30) return "bg-orange-200";
    if (minutes < 60) return "bg-orange-400";
    if (minutes < 120) return "bg-orange-500";
    return "bg-orange-600";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Streak</h1>
        <p className="text-sm text-muted-foreground mt-1">
          A day only counts once you cross your configured minimum focus time — see Settings.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-orange-600 text-2xl font-semibold">
              <Flame className="size-5" /> {streak?.currentStreak ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Current streak</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-semibold">{streak?.longestStreak ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Longest streak</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-semibold">{weeklyConsistency}%</p>
            <p className="text-xs text-muted-foreground mt-1">Weekly consistency</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-semibold">{monthlyConsistency}%</p>
            <p className="text-xs text-muted-foreground mt-1">Monthly consistency</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Last 90 days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto pb-2">
            {days.map((d, i) => (
              <div
                key={i}
                title={`${format(d.date, "d MMM yyyy")} — ${d.minutes} min`}
                className={`size-3.5 rounded-sm ${intensity(d.minutes)}`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Darker = more study time that day. Today is {format(new Date(), "d MMM yyyy")}, minimum for a streak day
            is {profile.minStreakMinutes} minutes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

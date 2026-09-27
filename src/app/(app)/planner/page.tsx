import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addAppDays, appToday } from "@/lib/dates";
import { AIPlannerPanel } from "@/components/planner/ai-planner-panel";
import { UpcomingScheduleBrowser } from "@/components/planner/upcoming-schedule-browser";
import { getUpcomingSchedule } from "@/server/queries/planner";

export default async function PlannerPage() {
  const { profile } = await requireUser();
  const exams = await prisma.exam.findMany({ where: { isActive: true }, orderBy: { order: "asc" } });
  const today = appToday();
  const upcoming = await getUpcomingSchedule(profile.id, today, addAppDays(today, 90));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Study Planner</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Builds a plan from your actual completed topics, weak topics, revision backlog and recent study
          hours — not a generic template. Apply it to today&apos;s targets, or generate a full schedule
          all the way to your exam date.
        </p>
      </div>
      <AIPlannerPanel exams={exams} hasExamDate={!!profile.examDate} />
      {upcoming.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Your upcoming schedule</h2>
          <UpcomingScheduleBrowser days={upcoming} />
        </div>
      )}
    </div>
  );
}

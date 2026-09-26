import { startOfDay } from "date-fns";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TargetItemRow } from "@/components/dashboard/target-item-row";
import { AddTargetForm } from "@/components/plan/add-target-form";
import { AIPlannerPanel } from "@/components/planner/ai-planner-panel";

export default async function PlanPage() {
  const { profile } = await requireUser();
  const today = startOfDay(new Date());

  const [target, exams] = await Promise.all([
    prisma.dailyTarget.findUnique({
      where: { userId_date: { userId: profile.id, date: today } },
      include: {
        items: {
          orderBy: { order: "asc" },
          include: { topic: { include: { chapter: { include: { subject: { include: { exam: true } } } } } } },
        },
      },
    }),
    prisma.exam.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Today&apos;s Plan</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Targets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 divide-y">
          {target?.items.length ? (
            target.items.map((item) => (
              <TargetItemRow
                key={item.id}
                id={item.id}
                label={item.label}
                subLabel={
                  item.topic
                    ? `${item.topic.chapter.subject.name} → ${item.topic.chapter.name}`
                    : item.startTime
                    ? `${item.startTime}${item.endTime ? `–${item.endTime}` : ""}`
                    : undefined
                }
                isDone={item.isDone}
                href={
                  item.topic
                    ? `/study/${item.topic.chapter.subject.exam.slug}/${item.topic.chapter.subject.slug}/${item.topic.chapter.slug}/${item.topic.slug}`
                    : undefined
                }
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground py-2">No targets yet — add one below or generate a plan.</p>
          )}
          <div className="pt-4">
            <AddTargetForm />
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-3">Generate today&apos;s plan with AI</h2>
        <AIPlannerPanel exams={exams} />
      </div>
    </div>
  );
}

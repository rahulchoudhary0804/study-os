import Link from "next/link";
import { startOfDay } from "date-fns";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TargetItemRow } from "@/components/dashboard/target-item-row";
import { AddTargetForm } from "@/components/plan/add-target-form";
import { Bot, ArrowRight } from "lucide-react";

export default async function PlanPage() {
  const { profile } = await requireUser();
  const today = startOfDay(new Date());

  const target = await prisma.dailyTarget.findUnique({
    where: { userId_date: { userId: profile.id, date: today } },
    include: {
      items: {
        orderBy: { order: "asc" },
        include: { topic: { include: { chapter: { include: { subject: { include: { exam: true } } } } } } },
      },
    },
  });

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
                topicId={item.topicId ?? undefined}
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

      <Card className="border-primary/30 bg-primary/[0.03]">
        <CardContent className="pt-6 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary shrink-0">
              <Bot className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium">Let AI build your day</p>
              <p className="text-sm text-muted-foreground">
                Or generate a full schedule all the way to your exam date.
              </p>
            </div>
          </div>
          <Button asChild size="sm">
            <Link href="/planner">
              Open AI Planner <ArrowRight className="size-3.5 ml-1" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

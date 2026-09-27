import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { appToday, formatAppDate } from "@/lib/dates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TargetItemRow } from "@/components/dashboard/target-item-row";
import { AddTargetForm } from "@/components/plan/add-target-form";
import { PlanTopicPicker } from "@/components/plan/plan-topic-picker";
import { ClearPlanButton } from "@/components/plan/clear-plan-button";
import { getSyllabusTree } from "@/server/queries/syllabus";
import { ncertLinksForTopic } from "@/lib/ncert";
import type { SwapOption } from "@/components/plan/swap-topic-button";
import type { NcertLink } from "@/components/dashboard/target-item-row";
import { Bot, ArrowRight, ListChecks, Target } from "lucide-react";

export default async function PlanPage() {
  const { profile } = await requireUser();
  const today = appToday();

  const [target, tree] = await Promise.all([
    prisma.dailyTarget.findUnique({
      where: { userId_date: { userId: profile.id, date: today } },
      include: {
        items: {
          orderBy: { order: "asc" },
          include: {
            topic: {
              select: {
                slug: true,
                chapter: { select: { slug: true, name: true, subject: { select: { slug: true, name: true, exam: { select: { slug: true } } } } } },
              },
            },
          },
        },
      },
    }),
    getSyllabusTree(),
  ]);

  // topicId → NCERT links of its chapter + same-subject topics to swap with.
  const ncertByTopic = new Map<string, NcertLink[]>();
  const swapByTopic = new Map<string, SwapOption[]>();
  for (const exam of tree) {
    for (const subject of exam.subjects) {
      const subjectTopics: SwapOption[] = subject.chapters.flatMap((c) =>
        c.topics.map((t) => ({ id: t.id, name: t.name, chapterName: c.name }))
      );
      for (const chapter of subject.chapters) {
        for (const t of chapter.topics) {
          // Only the NCERT chapter this topic is actually in (combined chapters span 2+ PDFs).
          ncertByTopic.set(t.id, ncertLinksForTopic(t.name, chapter.ncertLinks));
          swapByTopic.set(t.id, subjectTopics);
        }
      }
    }
  }

  const items = target?.items ?? [];
  const doneCount = items.filter((i) => i.isDone).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Today&apos;s Plan</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {formatAppDate(today, { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="size-4" /> Targets
            {items.length > 0 && (
              <Badge variant="outline" className="ml-1">
                {doneCount}/{items.length} done
              </Badge>
            )}
            {target?.generatedByAI && (
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                <Bot className="size-3 mr-1" /> AI
              </Badge>
            )}
          </CardTitle>
          {items.length > 0 && <ClearPlanButton />}
        </CardHeader>
        <CardContent className="space-y-1 divide-y">
          {target?.generatedByAI && target.aiRationale && (
            <p className="text-xs text-muted-foreground pb-3 italic">&ldquo;{target.aiRationale}&rdquo;</p>
          )}
          {items.length ? (
            items.map((item) => (
              <TargetItemRow
                key={item.id}
                id={item.id}
                label={item.label}
                subLabel={
                  item.topic
                    ? `${item.topic.chapter.subject.name} → ${item.topic.chapter.name}${item.startTime ? ` · ${item.startTime}${item.endTime ? `–${item.endTime}` : ""}` : ""}`
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
                ncertLinks={item.topicId ? ncertByTopic.get(item.topicId) : undefined}
                swapOptions={item.topicId ? swapByTopic.get(item.topicId)?.filter((o) => o.id !== item.topicId) : undefined}
                showActions
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              Nothing planned yet — pick chapters and topics below, or let the AI Planner build your day.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="size-4" /> Add from syllabus
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Choose a subject, tick whole chapters or individual topics (sorted by priority), then add them.
          </p>
        </CardHeader>
        <CardContent>
          <PlanTopicPicker
            exams={tree}
            defaultExamId={profile.targetExamId ?? undefined}
            plannedTopicIds={items.map((i) => i.topicId).filter((x): x is string => !!x)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Custom task</CardTitle>
        </CardHeader>
        <CardContent>
          <AddTargetForm />
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

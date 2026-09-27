import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { appToday } from "@/lib/dates";
import { AssistantClient, type AssistantTopic } from "./assistant-client";

const topicSelect = {
  id: true,
  name: true,
  chapter: { select: { name: true, subject: { select: { name: true, exam: { select: { name: true } } } } } },
} as const;

function toAssistantTopic(t: {
  id: string;
  name: string;
  chapter: { name: string; subject: { name: string; exam: { name: string } } };
}): AssistantTopic {
  return { id: t.id, title: t.name, breadcrumb: `${t.chapter.subject.exam.name} → ${t.chapter.subject.name} → ${t.chapter.name}` };
}

export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ topicId?: string }> }) {
  const { profile } = await requireUser();
  const { topicId } = await searchParams;
  const validTopicId = topicId && /^[0-9a-f-]{36}$/i.test(topicId) ? topicId : undefined;

  const [planItems, initial] = await Promise.all([
    prisma.dailyTargetItem.findMany({
      where: { dailyTarget: { userId: profile.id, date: appToday() }, topicId: { not: null } },
      orderBy: { order: "asc" },
      select: { isDone: true, topic: { select: topicSelect } },
    }),
    validTopicId ? prisma.topic.findUnique({ where: { id: validTopicId }, select: topicSelect }) : null,
  ]);

  const planTopics = planItems
    .filter((i) => i.topic)
    .map((i) => ({ ...toAssistantTopic(i.topic!), isDone: i.isDone }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Study Assistant</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pick a topic from today&apos;s plan (or search any other), then ask as many questions as you like.
        </p>
      </div>
      <AssistantClient planTopics={planTopics} initialTopic={initial ? toAssistantTopic(initial) : null} />
    </div>
  );
}

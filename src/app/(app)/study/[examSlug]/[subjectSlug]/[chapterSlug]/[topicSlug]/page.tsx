import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PriorityBadge } from "@/components/priority-badge";
import { ProgressSelector } from "@/components/topic/progress-selector";
import { LearnTab } from "@/components/topic/learn-tab";
import { PracticeTab } from "@/components/topic/practice-tab";
import { RevisionActions } from "@/components/topic/revision-actions";
import { AIChatTab } from "@/components/topic/ai-chat-tab";
import { TopicInsight } from "@/components/topic/topic-insight";
import { StudyTimer } from "@/components/timer/study-timer";
import { format } from "date-fns";
import { RobotCue } from "@/components/study-robot/robot-cue";

function JsonList({ value, empty = "None listed" }: { value: unknown; empty?: string }) {
  const arr = Array.isArray(value) ? (value as string[]) : [];
  if (arr.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="list-disc pl-5 space-y-1 text-sm">
      {arr.map((v, i) => (
        <li key={i}>{v}</li>
      ))}
    </ul>
  );
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ examSlug: string; subjectSlug: string; chapterSlug: string; topicSlug: string }>;
}) {
  const { examSlug, subjectSlug, chapterSlug, topicSlug } = await params;
  const { profile } = await requireUser();

  const topic = await prisma.topic.findFirst({
    where: {
      slug: topicSlug,
      chapter: { slug: chapterSlug, subject: { slug: subjectSlug, exam: { slug: examSlug } } },
    },
    include: {
      chapter: { include: { subject: { include: { exam: true } } } },
      progress: { where: { userId: profile.id } },
      questions: { orderBy: { createdAt: "desc" } },
      revisions: { where: { userId: profile.id } },
    },
  });
  if (!topic) notFound();

  const attempts = await prisma.questionAttempt.findMany({
    where: { userId: profile.id, question: { topicId: topic.id } },
    orderBy: { attemptedAt: "desc" },
  });
  const totalAttempts = attempts.length;
  const correctAttempts = attempts.filter((a) => a.isCorrect).length;
  const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : null;
  const timedAttempts = attempts.filter((a) => a.timeTakenSeconds != null);
  const avgTime =
    timedAttempts.length > 0
      ? Math.round(timedAttempts.reduce((s, a) => s + (a.timeTakenSeconds ?? 0), 0) / timedAttempts.length)
      : null;

  const revision = topic.revisions[0];
  const status = topic.progress[0]?.status ?? "NOT_STARTED";

  return (
    <div className="space-y-5">
      <RobotCue state="studying" message={`Let's study ${topic.name} 📖`} duration={3000} />
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/study" className="hover:underline">
            Study
          </Link>{" "}
          /{" "}
          <Link href={`/study/${examSlug}`} className="hover:underline">
            {topic.chapter.subject.exam.name}
          </Link>{" "}
          /{" "}
          <Link href={`/study/${examSlug}/${subjectSlug}`} className="hover:underline">
            {topic.chapter.subject.name}
          </Link>{" "}
          /{" "}
          <Link href={`/study/${examSlug}/${subjectSlug}/${chapterSlug}`} className="hover:underline">
            {topic.chapter.name}
          </Link>{" "}
          / {topic.name}
        </p>
        <div className="flex flex-wrap items-center gap-3 mt-1">
          <h1 className="text-2xl font-semibold tracking-tight">{topic.name}</h1>
          <PriorityBadge priority={topic.priority} />
        </div>
        <div className="mt-3">
          <ProgressSelector topicId={topic.id} initialStatus={status} />
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="learn">Learn</TabsTrigger>
          <TabsTrigger value="practice">Practice</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="revision">Revision</TabsTrigger>
          <TabsTrigger value="ai">AI Assistant</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">About this topic</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <TopicInsight topicId={topic.id} />
                <p>{topic.description || "No description yet."}</p>
                <div className="grid sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Prerequisites</p>
                    <JsonList value={topic.chapter.prerequisites} empty="No prerequisites — foundational" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Connected chapters</p>
                    <JsonList value={topic.chapter.connectedChapters} empty="Not mapped yet" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <StudyTimer
              subjectId={topic.chapter.subjectId}
              chapterId={topic.chapterId}
              topicId={topic.id}
              contextLabel={topic.name}
            />
          </div>
        </TabsContent>

        <TabsContent value="learn" className="mt-4">
          <LearnTab topicId={topic.id} topicName={topic.name} />
        </TabsContent>

        <TabsContent value="practice" className="mt-4">
          <PracticeTab
            topicId={topic.id}
            savedQuestions={topic.questions.map((q) => ({
              id: q.id,
              questionText: q.questionText,
              questionType: q.questionType,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              difficulty: q.difficulty,
              source: q.source,
            }))}
          />
        </TabsContent>

        <TabsContent value="performance" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-semibold">{accuracy !== null ? `${accuracy}%` : "—"}</p>
                <p className="text-xs text-muted-foreground mt-1">Accuracy</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-semibold">{totalAttempts}</p>
                <p className="text-xs text-muted-foreground mt-1">Questions attempted</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-semibold">{avgTime !== null ? `${avgTime}s` : "—"}</p>
                <p className="text-xs text-muted-foreground mt-1">Average time</p>
              </CardContent>
            </Card>
          </div>
          {totalAttempts === 0 && (
            <p className="text-sm text-muted-foreground mt-4">
              No attempts recorded yet — head to the Practice tab and answer a few questions.
            </p>
          )}
        </TabsContent>

        <TabsContent value="revision" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revision schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {revision ? (
                <>
                  <p>
                    Status: <span className="font-medium">{revision.status}</span> · Due{" "}
                    <span className="font-medium">{format(revision.dueDate, "d MMM yyyy")}</span> · Stage {revision.stage}
                  </p>
                  {revision.lastRevisedAt && (
                    <p className="text-muted-foreground">Last revised {format(revision.lastRevisedAt, "d MMM yyyy")}</p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">
                  Not yet in your revision schedule — mark this topic Completed or click below to start tracking it.
                </p>
              )}
              <RevisionActions topicId={topic.id} revisionId={revision?.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <AIChatTab topicId={topic.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

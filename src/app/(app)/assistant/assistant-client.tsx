"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AIChatTab } from "@/components/topic/ai-chat-tab";
import { searchAction } from "@/server/actions/search";
import { CalendarCheck, CheckCircle2, MessageCircle, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { StudyRobot } from "@/components/study-robot/study-robot";
import { useRobot } from "@/components/study-robot/robot-store";

export interface AssistantTopic {
  id: string;
  title: string;
  breadcrumb: string;
  isDone?: boolean;
}

const GENERAL: AssistantTopic = { id: "general", title: "General doubt", breadcrumb: "Any subject — no specific topic" };

export function AssistantClient({
  planTopics,
  initialTopic,
}: {
  planTopics: AssistantTopic[];
  initialTopic: AssistantTopic | null;
}) {
  const [selected, setSelected] = useState<AssistantTopic | null>(initialTopic ?? planTopics[0] ?? null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AssistantTopic[]>([]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const handle = setTimeout(async () => {
      const r = await searchAction(q);
      setResults(r.filter((x) => x.type === "topic").map((x) => ({ id: x.id, title: x.title, breadcrumb: x.breadcrumb })));
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  const showResults = query.trim().length >= 2;

  function pick(t: AssistantTopic) {
    setSelected(t);
    setQuery("");
    setResults([]);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_1fr] items-start">
      <div className="space-y-4 lg:sticky lg:top-4">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarCheck className="size-4" /> From today&apos;s plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {planTopics.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No topics planned today.{" "}
                <Link href="/plan" className="underline">
                  Add some
                </Link>{" "}
                to see them here first.
              </p>
            ) : (
              planTopics.map((t) => (
                <TopicButton key={t.id} topic={t} active={selected?.id === t.id} onClick={() => pick(t)} />
              ))
            )}
            <TopicButton topic={GENERAL} active={selected?.id === GENERAL.id} onClick={() => pick(GENERAL)} />
          </CardContent>
        </Card>

        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search any other topic…"
              className="pl-8"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {showResults && (
            <Card size="sm">
              <CardContent className="p-0 divide-y">
                {results.length === 0 && <p className="px-3 py-2.5 text-xs text-muted-foreground">No topics found</p>}
                {results.map((r) => (
                  <button key={r.id} className="w-full text-left px-3 py-2.5 hover:bg-muted text-sm" onClick={() => pick(r)}>
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.breadcrumb}</p>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="min-w-0">
        {selected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <AssistantRobot />
              <div className="min-w-0">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <Sparkles className="size-4 text-primary shrink-0" /> {selected.title}
                </p>
                <p className="text-xs text-muted-foreground">{selected.breadcrumb}</p>
              </div>
            </div>
            {/* Keyed by topic so switching topics starts a fresh conversation. */}
            <AIChatTab key={selected.id} topicId={selected.id === GENERAL.id ? undefined : selected.id} />
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground space-y-3">
              <MessageCircle className="size-8 mx-auto opacity-50" />
              <p>Pick a topic on the left — or ask a general doubt.</p>
              <Button size="sm" variant="outline" onClick={() => pick(GENERAL)}>
                Ask a general doubt
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function TopicButton({ topic, active, onClick }: { topic: AssistantTopic; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-muted",
        active && "bg-primary/10 ring-2 ring-primary/40"
      )}
    >
      <p className="font-medium flex items-center gap-1.5">
        {topic.isDone && <CheckCircle2 className="size-3.5 text-green-600 shrink-0" />}
        <span className="truncate">{topic.title}</span>
      </p>
      <p className="text-xs text-muted-foreground truncate">{topic.breadcrumb}</p>
    </button>
  );
}

/** The same study robot, shown next to the chat — it thinks while the AI answers. */
function AssistantRobot() {
  const { state, tick } = useRobot();
  return <StudyRobot state={state} size={52} animationKey={tick} className="shrink-0" />;
}

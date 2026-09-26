"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AIContent } from "@/components/ai/ai-content";
import { Skeleton } from "@/components/ui/skeleton";
import { generateTopicInsightAction } from "@/server/actions/ai";
import type { AITopicInsight } from "@/lib/ai/schemas";
import { Lightbulb, Clock } from "lucide-react";

const HARDNESS_STYLE: Record<AITopicInsight["hardnessLevel"], { label: string; className: string }> = {
  EASY: { label: "🟢 Easy", className: "bg-green-100 text-green-700" },
  MEDIUM: { label: "🟡 Medium", className: "bg-yellow-100 text-yellow-700" },
  HARD: { label: "🟠 Hard", className: "bg-orange-100 text-orange-700" },
  VERY_HARD: { label: "🔴 Very Hard", className: "bg-red-100 text-red-700" },
};

export function TopicInsight({ topicId }: { topicId: string }) {
  const [insight, setInsight] = useState<AITopicInsight | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    generateTopicInsightAction({ topicId })
      .then((result) => {
        if (!cancelled) setInsight(result as AITopicInsight);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [topicId]);

  if (failed) return null;

  if (!insight) {
    return (
      <div className="space-y-2 pb-2 border-b mb-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  const hardness = HARDNESS_STYLE[insight.hardnessLevel];

  return (
    <div className="space-y-2 pb-3 mb-1 border-b">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className={hardness.className}>
          {hardness.label}
        </Badge>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="size-3" /> {insight.estimatedTimeToMaster}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{insight.hardnessReason}</p>
      <div className="flex items-start gap-1.5 text-sm">
        <Lightbulb className="size-4 text-primary shrink-0 mt-0.5" />
        <AIContent text={insight.easiestApproach} />
      </div>
    </div>
  );
}

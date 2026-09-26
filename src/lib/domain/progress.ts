import type { ProgressStatus } from "@prisma/client";

export interface TopicForProgress {
  status: ProgressStatus;
  chapterPriority: number; // 1 (highest) .. 4 (lowest)
}

/**
 * Weighted completion: a Priority-1 chapter's topics count more toward the
 * headline percentage than Priority-4 topics, so finishing the highest-value
 * material moves the number more than padding out low-priority chapters.
 * This is deliberately NOT a flat average — see Section 10 of the spec.
 */
export function computeWeightedCompletion(topics: TopicForProgress[]): number {
  if (topics.length === 0) return 0;
  const weightOf = (priority: number) => 5 - Math.min(Math.max(priority, 1), 4); // 1->4 .. 4->1

  let earned = 0;
  let total = 0;
  for (const t of topics) {
    const w = weightOf(t.chapterPriority);
    total += w;
    if (t.status === "COMPLETED") earned += w;
    else if (t.status === "PRACTICING") earned += w * 0.6;
    else if (t.status === "LEARNING") earned += w * 0.3;
    else if (t.status === "NEEDS_REVISION") earned += w * 0.75;
  }
  return total === 0 ? 0 : Math.round((earned / total) * 100);
}

export function computeSimpleCompletion(topics: { status: ProgressStatus }[]): number {
  if (topics.length === 0) return 0;
  const completed = topics.filter((t) => t.status === "COMPLETED").length;
  return Math.round((completed / topics.length) * 100);
}

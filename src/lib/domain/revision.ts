import { addDays, startOfDay } from "date-fns";

/** Days-from-last-review at each stage. Stage 0 = just learned (due immediately / same day). */
export const REVISION_INTERVALS_DAYS = [0, 1, 3, 7, 14, 30, 30] as const;
export const MAX_REVISION_STAGE = REVISION_INTERVALS_DAYS.length - 1;

/**
 * Adaptive spaced repetition: accuracy on the review session shifts the next
 * stage up (longer gap) or down (sooner review) instead of blindly following
 * the fixed 0/1/3/7/14/30 sequence.
 */
export function nextRevisionStage(currentStage: number, accuracyPercent: number | null): number {
  if (accuracyPercent === null) return Math.min(currentStage + 1, MAX_REVISION_STAGE);
  if (accuracyPercent < 50) return Math.max(currentStage - 1, 0);
  if (accuracyPercent < 75) return currentStage;
  return Math.min(currentStage + 1, MAX_REVISION_STAGE);
}

export function computeDueDate(stage: number, from: Date = new Date()): Date {
  const days = REVISION_INTERVALS_DAYS[Math.min(stage, MAX_REVISION_STAGE)];
  return startOfDay(addDays(from, days));
}

export function revisionUrgency(dueDate: Date, now: Date = new Date()): "critical" | "high" | "medium" {
  const overdueDays = Math.floor((startOfDay(now).getTime() - startOfDay(dueDate).getTime()) / 86400000);
  if (overdueDays >= 3) return "critical";
  if (overdueDays >= 0) return "high";
  return "medium";
}

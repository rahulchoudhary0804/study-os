import type { ProgressStatus } from "@prisma/client";

export interface WeaknessInput {
  accuracyPercent: number | null; // null = no attempts yet
  attemptsCount: number;
  avgTimeSeconds: number | null;
  revisionGapDays: number | null; // days overdue on revision (negative/0 = not overdue)
  progressStatus: ProgressStatus;
  confidence: number | null; // 1-5 self-rating
}

export interface WeaknessResult {
  score: number; // 0-100, higher = weaker
  level: "critical" | "weak" | "needs_practice" | "strong";
  recommendations: string[];
}

const PROGRESS_COMPONENT: Record<ProgressStatus, number> = {
  NOT_STARTED: 100,
  LEARNING: 70,
  NEEDS_REVISION: 80,
  PRACTICING: 40,
  COMPLETED: 10,
};

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

/**
 * Rule-based weakness score (NOT an AI call) — combines accuracy, time-per-
 * question, revision gap, progress state and self-rated confidence into a
 * single 0-100 score. Every component that has real data contributes;
 * missing components are simply left out and the remaining weights are
 * renormalized, so a brand-new topic with zero attempts isn't unfairly
 * flagged as "critical" just because it hasn't been started.
 */
export function computeWeaknessScore(input: WeaknessInput): WeaknessResult {
  const components: { weight: number; value: number }[] = [];

  if (input.accuracyPercent !== null) {
    components.push({ weight: 0.35, value: clamp(100 - input.accuracyPercent) });
  }
  if (input.avgTimeSeconds !== null) {
    // 90s/question treated as a reasonable baseline; double that maxes this component out.
    components.push({ weight: 0.15, value: clamp((input.avgTimeSeconds / 90 - 1) * 50) });
  }
  if (input.revisionGapDays !== null) {
    components.push({ weight: 0.2, value: clamp(input.revisionGapDays * 5) });
  }
  components.push({ weight: 0.15, value: PROGRESS_COMPONENT[input.progressStatus] });
  if (input.confidence !== null) {
    components.push({ weight: 0.15, value: clamp((5 - input.confidence) * 20) });
  }

  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  const score = Math.round(
    components.reduce((s, c) => s + (c.weight / totalWeight) * c.value, 0)
  );

  const level: WeaknessResult["level"] =
    score >= 75 ? "critical" : score >= 55 ? "weak" : score >= 35 ? "needs_practice" : "strong";

  const recommendations: string[] = [];
  if (input.accuracyPercent !== null && input.accuracyPercent < 60) recommendations.push("Review notes for this topic");
  if (input.attemptsCount < 10) recommendations.push("Solve 10 more practice questions");
  if (input.revisionGapDays !== null && input.revisionGapDays > 0) recommendations.push("Revise this topic today");
  if (recommendations.length === 0) recommendations.push("Keep it in your normal revision rotation");

  return { score, level, recommendations };
}

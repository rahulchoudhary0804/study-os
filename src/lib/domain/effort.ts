export interface EffortAttempt {
  isCorrect: boolean;
  difficulty: "EASY" | "MEDIUM" | "HARD";
}

export interface EffortVerdict {
  accuracyPercent: number;
  verdict: string;
  focusAreas: string[];
}

/**
 * Deterministic, rule-based read on how much more practice a topic needs —
 * no extra AI call, so it's instant and free after a practice batch.
 */
export function computeEffortNeeded(attempts: EffortAttempt[]): EffortVerdict {
  if (attempts.length === 0) {
    return { accuracyPercent: 0, verdict: "No attempts yet.", focusAreas: [] };
  }

  const correct = attempts.filter((a) => a.isCorrect).length;
  const accuracyPercent = Math.round((correct / attempts.length) * 100);

  const byDifficulty: Record<EffortAttempt["difficulty"], { total: number; correct: number }> = {
    EASY: { total: 0, correct: 0 },
    MEDIUM: { total: 0, correct: 0 },
    HARD: { total: 0, correct: 0 },
  };
  for (const a of attempts) {
    byDifficulty[a.difficulty].total += 1;
    if (a.isCorrect) byDifficulty[a.difficulty].correct += 1;
  }

  const focusAreas = (Object.keys(byDifficulty) as EffortAttempt["difficulty"][]).filter((d) => {
    const b = byDifficulty[d];
    return b.total > 0 && b.correct / b.total < 0.6;
  });

  let verdict: string;
  if (accuracyPercent < 50) {
    verdict = `${accuracyPercent}% accuracy — this topic needs significant practice before it's exam-ready. Aim for ~20 more attempts this week, starting with easy/medium questions to rebuild the basics.`;
  } else if (accuracyPercent < 75) {
    verdict = `${accuracyPercent}% accuracy — getting there. Keep practicing, with extra focus on ${
      focusAreas.length > 0 ? focusAreas.join(" and ").toLowerCase() + " questions" : "your weaker question types"
    }.`;
  } else {
    verdict = `${accuracyPercent}% accuracy — exam-ready. Light revision only; revisit this topic closer to the exam to keep it sharp.`;
  }

  return { accuracyPercent, verdict, focusAreas };
}

export type RankTierName = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Heroic" | "Grandmaster";

export interface RankInput {
  completedTopics: number;
  totalStudyHours: number;
  accuracyPercent: number | null;
  longestStreak: number;
  revisionCompletionRate: number;
}

export interface RankResult {
  xp: number;
  tier: RankTierName;
  subLevel: number | null; // 1-3 within a tier, null for Grandmaster (single tier)
  label: string; // e.g. "Gold II"
  colorClassName: string;
  xpIntoLevel: number;
  xpForNextLevel: number | null; // total XP span of the current level; null at Grandmaster
  xpNeededForNext: number | null; // xpForNextLevel - xpIntoLevel; null at Grandmaster
  nextLabel: string | null;
}

export interface RankLevelDef {
  tier: RankTierName;
  subLevel: number | null;
  label: string;
  colorClassName: string;
  xpThreshold: number; // XP required to reach this level
}

export const RANK_TIERS: { tier: RankTierName; colorClassName: string }[] = [
  { tier: "Bronze", colorClassName: "text-amber-800 dark:text-amber-600" },
  { tier: "Silver", colorClassName: "text-slate-500 dark:text-slate-300" },
  { tier: "Gold", colorClassName: "text-yellow-500" },
  { tier: "Platinum", colorClassName: "text-blue-700 dark:text-blue-400" },
  { tier: "Diamond", colorClassName: "text-purple-600 dark:text-purple-400" },
  { tier: "Heroic", colorClassName: "text-red-600 dark:text-red-500" },
];

export const GRANDMASTER_COLOR_CLASS =
  "bg-clip-text text-transparent bg-gradient-to-r from-neutral-900 dark:from-neutral-100 via-neutral-700 dark:via-neutral-300 to-yellow-500";

const ROMAN = ["I", "II", "III"];

/**
 * The full Bronze -> Grandmaster ladder as a flat, ordered list of levels
 * (6 tiers x 3 sub-levels, then Grandmaster) with the XP threshold required
 * to reach each one. Shared by `computeRank` and the rank-list UI so they
 * can never drift out of sync.
 */
export function getFullRankLadder(): RankLevelDef[] {
  const ladder: RankLevelDef[] = [];
  let threshold = 0;
  let step = 40;
  for (const { tier, colorClassName } of RANK_TIERS) {
    for (let s = 1; s <= 3; s++) {
      ladder.push({ tier, subLevel: s, label: `${tier} ${ROMAN[s - 1]}`, colorClassName, xpThreshold: threshold });
      threshold += step;
      step = Math.round(step * 1.4);
    }
  }
  ladder.push({
    tier: "Grandmaster",
    subLevel: null,
    label: "Grandmaster",
    colorClassName: GRANDMASTER_COLOR_CLASS,
    xpThreshold: threshold,
  });
  return ladder;
}

/**
 * Free-Fire-style rank ladder, computed from real activity — no separate XP
 * column to keep in sync, just derived on read from the same stats already
 * shown on the dashboard/analytics pages.
 */
export function computeRank(input: RankInput): RankResult {
  const xp = Math.round(
    input.completedTopics * 10 +
      input.totalStudyHours * 5 +
      input.longestStreak * 8 +
      (input.accuracyPercent ?? 0) * 2 +
      input.revisionCompletionRate * 1
  );

  const ladder = getFullRankLadder();

  let currentIndex = 0;
  for (let i = 0; i < ladder.length; i++) {
    if (xp >= ladder[i].xpThreshold) currentIndex = i;
    else break;
  }
  const current = ladder[currentIndex];
  const next = ladder[currentIndex + 1] ?? null;

  const xpIntoLevel = xp - current.xpThreshold;
  const xpForNextLevel = next ? next.xpThreshold - current.xpThreshold : null;
  const xpNeededForNext = next ? next.xpThreshold - xp : null;

  return {
    xp,
    tier: current.tier,
    subLevel: current.subLevel,
    label: current.label,
    colorClassName: current.colorClassName,
    xpIntoLevel,
    xpForNextLevel,
    xpNeededForNext,
    nextLabel: next?.label ?? null,
  };
}

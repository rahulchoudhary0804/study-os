import type { RankTierName } from "@/lib/domain/rank";
import { cn } from "@/lib/utils";

// Original artwork — a shared pennant/banner silhouette (rod + ribbon with a
// swallowtail notch) with a per-tier gradient and stacked chevrons for the
// sub-level, giving each rank a distinct look without reproducing any
// specific game's actual icons or textures.
const TIER_GRADIENTS: Record<RankTierName, [string, string]> = {
  Bronze: ["#c58a4a", "#7a4a20"],
  Silver: ["#e8edf3", "#8f9bb0"],
  Gold: ["#ffe066", "#d19a1a"],
  Platinum: ["#5b7fe0", "#1e3a8a"],
  Diamond: ["#d8b4fe", "#7e22ce"],
  Heroic: ["#fca5a5", "#b91c1c"],
  Grandmaster: ["#3a3a3a", "#0a0a0a"],
};

const ROD_PATH = "M3 2.5 H21 C21.8 2.5 22 2.9 22 3.4 V4.4 C22 4.9 21.8 5.3 21 5.3 H3 C2.2 5.3 2 4.9 2 4.4 V3.4 C2 2.9 2.2 2.5 3 2.5 Z";
const BANNER_PATH = "M4.5 6.3 H19.5 V24 L12 19.6 L4.5 24 Z";

function Chevrons({ count, color }: { count: number; color: string }) {
  const rows = Array.from({ length: count });
  return (
    <g>
      {rows.map((_, i) => {
        const y = 12.5 + i * 3.4;
        return (
          <path
            key={i}
            d={`M8.3 ${y} L12 ${y - 2.4} L15.7 ${y}`}
            fill="none"
            stroke={color}
            strokeWidth={1.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
    </g>
  );
}

function WingFlares({ color }: { color: string }) {
  return (
    <g fill={color} fillOpacity={0.9}>
      <path d="M4.5 9 L-1.5 11.5 L4.5 12.5 Z" />
      <path d="M19.5 9 L25.5 11.5 L19.5 12.5 Z" />
    </g>
  );
}

export function RankBadgeIcon({
  tier,
  subLevel,
  size = 32,
  className,
}: {
  tier: RankTierName;
  subLevel?: number | null;
  size?: number;
  className?: string;
}) {
  const [from, to] = TIER_GRADIENTS[tier];
  const gradientId = `rank-grad-${tier}`;
  const chevronCount = subLevel ?? 4; // Grandmaster (no sub-level) shows 4 — the max

  return (
    <svg width={size} height={size * (30 / 24)} viewBox="0 0 24 30" className={cn("shrink-0", className)} aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      {tier === "Grandmaster" && <WingFlares color="#d19a1a" />}
      <path d={ROD_PATH} fill={tier === "Grandmaster" ? "#d19a1a" : to} />
      <path d={BANNER_PATH} fill={`url(#${gradientId})`} stroke={tier === "Grandmaster" ? "#d19a1a" : to} strokeWidth={tier === "Grandmaster" ? 1 : 0.6} />
      <Chevrons count={chevronCount} color={tier === "Grandmaster" ? "#ffd966" : "white"} />
    </svg>
  );
}

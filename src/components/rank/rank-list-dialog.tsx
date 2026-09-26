"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RankBadgeIcon } from "@/components/rank/rank-badge-icon";
import { cn } from "@/lib/utils";
import { getFullRankLadder, type RankResult } from "@/lib/domain/rank";

export function RankBadgeButton({ rank }: { rank: RankResult }) {
  const [open, setOpen] = useState(false);
  const ladder = getFullRankLadder();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "hidden sm:flex items-center gap-1.5 text-xs font-semibold rounded-full px-2 py-1 hover:bg-muted transition-colors",
          rank.colorClassName
        )}
        aria-label={`Rank: ${rank.label}. Click to see the full rank list.`}
      >
        <RankBadgeIcon tier={rank.tier} subLevel={rank.subLevel} size={18} />
        {rank.label}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rank</DialogTitle>
            <DialogDescription>
              Earned from real activity — completed topics, study hours, streak, accuracy and
              revision completion.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3 rounded-lg bg-yellow-500/10 ring-2 ring-yellow-500 p-3">
            <RankBadgeIcon tier={rank.tier} subLevel={rank.subLevel} size={36} />
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm font-semibold", rank.colorClassName)}>{rank.label}</p>
              {rank.nextLabel ? (
                <p className="text-xs text-muted-foreground">
                  {rank.xpNeededForNext} XP to {rank.nextLabel}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Top rank reached</p>
              )}
            </div>
            <span className="text-xs font-medium text-muted-foreground shrink-0">{rank.xp} XP total</span>
          </div>

          {rank.nextLabel && rank.xpForNextLevel !== null && (
            <div className="space-y-1">
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, (rank.xpIntoLevel / rank.xpForNextLevel) * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground text-right">
                {rank.xpIntoLevel}/{rank.xpForNextLevel} XP in this rank
              </p>
            </div>
          )}

          <div className="max-h-72 overflow-y-auto -mx-1 px-1 space-y-0.5">
            {ladder.map((level) => {
              const isCurrent = level.label === rank.label;
              return (
                <div
                  key={level.label}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm",
                    isCurrent && "bg-yellow-500/10 ring-2 ring-yellow-500"
                  )}
                >
                  <RankBadgeIcon tier={level.tier} subLevel={level.subLevel} size={22} />
                  <span className={cn("flex-1", level.colorClassName, isCurrent && "font-semibold")}>{level.label}</span>
                  <span className="text-xs text-muted-foreground">{level.xpThreshold} XP</span>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

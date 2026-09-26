import Link from "next/link";
import { Flame } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { signOutAction } from "@/server/actions/auth";
import { SearchBox } from "@/components/search/search-box";
import { ThemeToggle } from "@/components/theme-toggle";
import type { RankResult } from "@/lib/domain/rank";
import { RankBadgeIcon } from "@/components/rank/rank-badge-icon";
import { RankBadgeButton } from "@/components/rank/rank-list-dialog";
import { cn } from "@/lib/utils";

export function Topbar({
  email,
  currentStreak,
  rank,
}: {
  email: string;
  currentStreak: number;
  rank: RankResult;
}) {
  const initial = email?.[0]?.toUpperCase() ?? "?";

  return (
    <header className="h-14 border-b-2 border-border flex items-center gap-3 px-4 md:px-6 shrink-0 sticky top-0 z-30 bg-background/70 backdrop-blur-lg">
      <div className="flex-1 max-w-md">
        <SearchBox />
      </div>
      <RankBadgeButton rank={rank} />
      <Link
        href="/streak"
        className="flex items-center gap-1.5 text-sm font-medium text-orange-600 dark:text-orange-400 bg-orange-500/10 hover:bg-orange-500/15 transition-colors rounded-full px-2.5 py-1"
      >
        <Flame className="size-4" />
        {currentStreak}
      </Link>
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded-full" aria-label="Account menu">
            <Avatar className="size-8">
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">{email}</div>
          <div className={cn("px-2 pb-1.5 text-xs font-semibold flex items-center gap-1.5", rank.colorClassName)}>
            <RankBadgeIcon tier={rank.tier} subLevel={rank.subLevel} size={16} />
            {rank.label}
            {rank.xpForNextLevel !== null && (
              <span className="text-muted-foreground font-normal">
                · {rank.xpIntoLevel}/{rank.xpForNextLevel} XP
              </span>
            )}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings">Settings</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <form action={signOutAction}>
            <button type="submit" className="w-full">
              <DropdownMenuItem asChild>
                <span>Log out</span>
              </DropdownMenuItem>
            </button>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

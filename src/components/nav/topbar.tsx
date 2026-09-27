import Link from "next/link";
import { Flame, GraduationCap } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SearchBox } from "@/components/search/search-box";
import { ThemeToggle } from "@/components/theme-toggle";
import { StylePicker } from "@/components/theme-style";
import type { RankResult } from "@/lib/domain/rank";
import { RankBadgeIcon } from "@/components/rank/rank-badge-icon";
import { RankBadgeButton } from "@/components/rank/rank-list-dialog";
import { LogoutMenuItem, MobileSearch, MobileThemeMenuItems } from "@/components/nav/mobile-topbar-parts";
import { cn } from "@/lib/utils";

/**
 * Mobile:  [logo · Study OS] ………… [search] [streak] [avatar ▾ (theme, settings)]
 * Desktop: [search ……………]  ………… [rank] [streak] [style] [light/dark] [avatar ▾]
 * (On desktop the app name lives in the sidebar.)
 */
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
    <header className="h-14 border-b-2 border-border flex items-center gap-2 md:gap-3 px-3 md:px-6 shrink-0 sticky top-0 z-30 bg-background/95 backdrop-blur-lg">
      <Link href="/dashboard" className="md:hidden flex items-center gap-2 min-w-0 mr-auto">
        <span className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shrink-0 border-2 border-border shadow-nb-sm">
          <GraduationCap className="size-4.5" />
        </span>
        <span className="font-semibold tracking-tight truncate">Study OS</span>
      </Link>

      <div className="hidden md:block flex-1 max-w-md">
        <SearchBox />
      </div>
      <div className="hidden md:block flex-1" />

      <div className="md:hidden">
        <MobileSearch />
      </div>
      <div className="hidden md:block">
        <RankBadgeButton rank={rank} />
      </div>
      <Link
        href="/streak"
        aria-label={`${currentStreak} day streak`}
        className="flex items-center gap-1 text-sm font-medium text-orange-600 dark:text-orange-400 bg-orange-500/10 hover:bg-orange-500/15 transition-colors rounded-full px-2.5 py-1 shrink-0"
      >
        <Flame className="size-4" />
        {currentStreak}
      </Link>
      <div className="hidden md:flex items-center gap-1">
        <StylePicker />
        <ThemeToggle />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded-full shrink-0" aria-label="Account menu">
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
          <div className="md:hidden">
            <MobileThemeMenuItems />
            <DropdownMenuSeparator />
          </div>
          <DropdownMenuItem asChild>
            <Link href="/settings">Settings</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <LogoutMenuItem />
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

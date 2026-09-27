"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { LogOut, Moon, Palette, Search, Sun, X } from "lucide-react";
import { signOutAction } from "@/server/actions/auth";
import { setRobotState } from "@/components/study-robot/robot-store";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { SearchBox } from "@/components/search/search-box";

/** Search icon for small screens — expands into a full-width search bar over the top bar. */
export function MobileSearch() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="icon" aria-label="Search" onClick={() => setOpen(true)}>
        <Search className="size-4.5" />
      </Button>
      {open && (
        <div className="absolute inset-0 z-40 flex items-center gap-2 px-3 bg-background border-b-2 border-border">
          <div className="flex-1">
            <SearchBox autoFocus onNavigate={() => setOpen(false)} />
          </div>
          <Button variant="ghost" size="icon" aria-label="Close search" onClick={() => setOpen(false)}>
            <X className="size-4.5" />
          </Button>
        </div>
      )}
    </>
  );
}

/** Theme controls moved into the account menu on small screens to keep the top bar uncluttered. */
export function MobileThemeMenuItems() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <>
      <DropdownMenuItem onSelect={() => setTheme(isDark ? "light" : "dark")}>
        {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        {isDark ? "Light mode" : "Dark mode"}
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/settings">
          <Palette className="size-4" /> Theme style
        </Link>
      </DropdownMenuItem>
    </>
  );
}

/** Log out with a goodbye wave from the robot before the redirect. */
export function LogoutMenuItem() {
  const [leaving, startTransition] = useTransition();
  return (
    <DropdownMenuItem
      disabled={leaving}
      onSelect={(e) => {
        e.preventDefault();
        setRobotState("waving", { message: "Bye! See you soon 👋", duration: 0 });
        startTransition(async () => {
          await new Promise((r) => setTimeout(r, 900));
          await signOutAction();
        });
      }}
    >
      <LogOut className="size-4" /> {leaving ? "Logging out…" : "Log out"}
    </DropdownMenuItem>
  );
}

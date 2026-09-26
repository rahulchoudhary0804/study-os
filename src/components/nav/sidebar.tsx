"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";
import { cn } from "@/lib/utils";
import { ShieldCheck, GraduationCap } from "lucide-react";

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="h-14 flex items-center gap-2.5 px-5 border-b border-sidebar-border">
        <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shrink-0">
          <GraduationCap className="size-4" />
        </div>
        <Link href="/dashboard" className="font-semibold tracking-tight">
          Study OS
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-primary font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-sidebar-primary" aria-hidden />
              )}
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors mt-2 border-t border-sidebar-border pt-3",
              pathname.startsWith("/admin")
                ? "text-sidebar-primary font-medium"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            )}
          >
            <ShieldCheck className="size-4 shrink-0" />
            Admin
          </Link>
        )}
      </nav>
    </aside>
  );
}

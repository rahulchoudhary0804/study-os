"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BarChart3, ListTree } from "lucide-react";

const TABS = [
  { href: "/admin", label: "Overview", icon: BarChart3 },
  { href: "/admin/content", label: "Content Management", icon: ListTree },
];

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 mt-3">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border-2 px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "border-border bg-primary text-primary-foreground shadow-nb-sm"
                : "border-transparent text-muted-foreground hover:bg-muted"
            )}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

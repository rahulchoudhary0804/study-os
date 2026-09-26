"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((i) => i.mobile);

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/90 backdrop-blur-md">
      <div className="grid grid-cols-6">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2 text-[10px] transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

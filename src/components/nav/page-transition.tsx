"use client";

import { usePathname } from "next/navigation";

/**
 * A tiny, CSS-only page transition (no animation library) — keying on the
 * pathname forces a remount on navigation so the tw-animate-css utility
 * classes replay each time, giving a subtle fade/slide without shipping a
 * JS animation runtime.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div
      key={pathname}
      className="animate-in fade-in slide-in-from-bottom-1 duration-300 ease-out motion-reduce:animate-none"
    >
      {children}
    </div>
  );
}

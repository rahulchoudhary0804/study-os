"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BotMessageSquare, Sparkles } from "lucide-react";

/**
 * Floating, gently levitating AI-bot button that opens the AI Assistant — the
 * assistant's entry point on every screen (it isn't in the bottom nav).
 * Hidden on the assistant page itself.
 */
export function AIPencilFab() {
  const pathname = usePathname();
  if (pathname.startsWith("/assistant")) return null;

  return (
    <Link
      href="/assistant"
      aria-label="Open AI Assistant"
      title="Ask the AI Assistant"
      className="group fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-6 md:right-6 z-40"
    >
      <span className="pencil-levitate relative flex items-center justify-center size-14 rounded-full bg-primary text-primary-foreground border-2 border-border shadow-nb">
        <BotMessageSquare className="size-6 pencil-wiggle" />
        <Sparkles className="absolute -top-1 -right-1 size-4 text-yellow-400 pencil-sparkle" aria-hidden />
        <span className="pencil-glow absolute inset-0 rounded-full" aria-hidden />
      </span>
      <span className="pencil-shadow mx-auto mt-1 block h-1.5 w-8 rounded-full bg-foreground/20 blur-[2px]" aria-hidden />
    </Link>
  );
}

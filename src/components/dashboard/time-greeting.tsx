"use client";

import { useEffect, useState } from "react";

// Uses the viewer's device clock (the server runs in UTC, so it can't decide this).
function greetingFor(h: number) {
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 21) return "Good evening";
  return "Good night";
}

export function TimeGreeting({ name }: { name: string }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setText(greetingFor(new Date().getHours()));
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <h1 className="text-2xl font-semibold tracking-tight">
      {text ?? "Hello"}, {name} 👋
    </h1>
  );
}

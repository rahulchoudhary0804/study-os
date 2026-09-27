"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { StudyRobot } from "./study-robot";
import { getRobotBase, oncePerSession, setRobotBase, setRobotState, useRobot } from "./robot-store";
import type { RobotState } from "./robot-states";

const SLEEPY_AFTER_MS = 3 * 60_000; // gets drowsy after 3 idle minutes…
const LOOK_AROUND_EVERY_MS = 60_000; // …and blinks / looks around every minute after that

/**
 * The floating study companion — tap it to open the AI Assistant. It reacts
 * to what the student does (see setRobotState calls across the app), waves on
 * the first visit of the session and gets sleepy when nobody's around.
 */
export function RobotFab() {
  const pathname = usePathname();
  const { state, message, tick } = useRobot();

  // Welcome wave once per session.
  useEffect(() => {
    oncePerSession("welcome", () => setRobotState("waving", { duration: 3500 }));
  }, []);

  // Inactivity → sleepy; any interaction wakes it up again.
  useEffect(() => {
    let sleepTimer: ReturnType<typeof setTimeout>;
    let lookTimer: ReturnType<typeof setInterval> | undefined;
    let awakeBase: RobotState = getRobotBase();

    function goSleepy() {
      awakeBase = getRobotBase();
      if (awakeBase === "studying") return; // a running timer counts as busy
      setRobotBase("sleepy");
      lookTimer = setInterval(() => setRobotState("curious", { duration: 1800, message: null }), LOOK_AROUND_EVERY_MS);
    }
    function onActivity() {
      clearTimeout(sleepTimer);
      if (lookTimer) clearInterval(lookTimer);
      lookTimer = undefined;
      if (getRobotBase() === "sleepy") {
        setRobotBase(awakeBase === "sleepy" ? "idle" : awakeBase);
        setRobotState("waving", { duration: 1600, message: "Oh, you're back! 👋" });
      }
      sleepTimer = setTimeout(goSleepy, SLEEPY_AFTER_MS);
    }

    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true, capture: true }));
    sleepTimer = setTimeout(goSleepy, SLEEPY_AFTER_MS);
    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity, { capture: true }));
      clearTimeout(sleepTimer);
      if (lookTimer) clearInterval(lookTimer);
    };
  }, []);

  // The assistant page shows its own robot next to the chat.
  if (pathname.startsWith("/assistant")) return null;

  return (
    <div className="fixed right-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-5 md:right-6 z-40 flex items-end gap-1.5 pointer-events-none">
      {message && (
        <div
          key={tick}
          className="robot-bubble pointer-events-auto max-w-[200px] mb-10 rounded-2xl rounded-br-sm border-2 border-border bg-popover px-3 py-2 text-xs font-medium shadow-nb-sm"
          role="status"
        >
          {message}
        </div>
      )}
      <Link
        href="/assistant"
        aria-label="Open AI Study Assistant"
        title="Ask your AI study buddy"
        className="pointer-events-auto rounded-full outline-none focus-visible:ring-4 focus-visible:ring-ring/50 active:scale-95 transition-transform"
      >
        <StudyRobot state={state} size={68} animationKey={tick} />
      </Link>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { oncePerSession, setRobotState } from "./robot-store";
import type { RobotState } from "./robot-states";

/**
 * Drop into any (server-rendered) page to make the robot react when the page
 * opens, e.g. <RobotCue state="curious" message="Ooh, your notes!" />.
 * With `sessionKey`, the reaction plays only once per browser session.
 */
export function RobotCue({
  state,
  message,
  duration,
  sessionKey,
  delay = 400,
}: {
  state: RobotState;
  message?: string;
  duration?: number;
  sessionKey?: string;
  delay?: number;
}) {
  useEffect(() => {
    const t = setTimeout(() => {
      const play = () => setRobotState(state, { message, duration });
      if (sessionKey) oncePerSession(sessionKey, play);
      else play();
    }, delay);
    return () => clearTimeout(t);
  }, [state, message, duration, sessionKey, delay]);
  return null;
}

/** Picks the single most relevant dashboard reaction (priority order) for today. */
export function DashboardRobotCue({
  streak,
  revisionDue,
  weakTopic,
  missedYesterday,
  todayDone,
  todayTotal,
}: {
  streak: number;
  revisionDue: number;
  weakTopic: string | null;
  missedYesterday: number;
  todayDone: number;
  todayTotal: number;
}) {
  let cue: { state: RobotState; message: string } | null = null;
  if (todayTotal > 0 && todayDone === todayTotal) cue = { state: "celebrating", message: "Today's target complete! 🥳" };
  else if (missedYesterday > 0) cue = { state: "concerned", message: `${missedYesterday} left from yesterday — we'll catch up 💪` };
  else if (revisionDue > 0) cue = { state: "alert", message: `${revisionDue} topic${revisionDue > 1 ? "s" : ""} due for revision 👀` };
  else if (weakTopic) cue = { state: "thinking", message: `Let's strengthen “${weakTopic}” 🤔` };
  else if (streak >= 3) cue = { state: "proud", message: `${streak}-day streak! 🔥` };

  // Let the welcome wave finish first, and only nudge once per session per cue.
  if (!cue) return null;
  return <RobotCue state={cue.state} message={cue.message} duration={4500} delay={4200} sessionKey={`dash-${cue.state}`} />;
}

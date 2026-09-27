"use client";

import { useSyncExternalStore } from "react";
import { ROBOT_LINES, type RobotState } from "./robot-states";

/**
 * Tiny global store for the study robot's mood — any component can call
 * `setRobotState("celebrating")` without prop drilling or a context provider.
 *
 * Two layers:
 *  - base state: what the robot is doing "right now" (idle, studying while a
 *    timer runs, sleepy after inactivity) — set with setRobotBase().
 *  - reaction: a short-lived state + speech bubble on top of the base
 *    (happy after a correct answer…) — set with setRobotState(); it falls
 *    back to the base state after `duration` ms.
 */
interface Snapshot {
  state: RobotState;
  message: string | null;
  /** Increments on every reaction so the same state can re-trigger its animation. */
  tick: number;
}

let base: RobotState = "idle";
let snapshot: Snapshot = { state: "idle", message: null, tick: 0 };
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function emit(next: Snapshot) {
  snapshot = next;
  listeners.forEach((l) => l());
}

export function setRobotState(
  state: RobotState,
  opts: { duration?: number; message?: string | null; then?: RobotState } = {}
) {
  if (timer) clearTimeout(timer);
  const message = opts.message === undefined ? ROBOT_LINES[state] ?? null : opts.message;
  emit({ state, message, tick: snapshot.tick + 1 });
  const duration = opts.duration ?? 3200;
  if (duration > 0) {
    timer = setTimeout(() => {
      timer = null;
      if (opts.then) setRobotState(opts.then);
      else emit({ state: base, message: null, tick: snapshot.tick + 1 });
    }, duration);
  }
}

/** Sets the resting state (no bubble). Doesn't interrupt a reaction that's still playing. */
export function setRobotBase(state: RobotState) {
  base = state;
  if (!timer) emit({ state, message: null, tick: snapshot.tick });
}

export function getRobotBase() {
  return base;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const SERVER_SNAPSHOT: Snapshot = { state: "idle", message: null, tick: 0 };

export function useRobot(): Snapshot {
  return useSyncExternalStore(subscribe, () => snapshot, () => SERVER_SNAPSHOT);
}

/** Runs `fn` once per browser session per key (e.g. one welcome wave per day). */
export function oncePerSession(key: string, fn: () => void) {
  try {
    const k = `study-robot:${key}`;
    if (sessionStorage.getItem(k)) return;
    sessionStorage.setItem(k, "1");
  } catch {
    // storage blocked — just run it
  }
  fn();
}

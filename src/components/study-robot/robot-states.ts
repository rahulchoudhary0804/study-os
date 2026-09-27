/**
 * One robot, many moods. Every state below reuses the SAME character (body,
 * face screen, antenna, ear modules, arms) — a state only changes the eyes,
 * mouth, arm pose, a small prop and the motion.
 */
export type RobotState =
  | "idle"
  | "waving"
  | "studying"
  | "focused"
  | "thinking"
  | "happy"
  | "excited"
  | "celebrating"
  | "proud"
  | "confused"
  | "encouraging"
  | "concerned"
  | "sleepy"
  | "curious"
  | "alert"
  | "writing"
  | "document";

export type EyeKind = "open" | "happy" | "closed" | "down" | "up" | "confused" | "sad" | "wide" | "curious";
export type MouthKind = "none" | "smile" | "grin" | "flat" | "wavy" | "frown" | "o";
export type PropKind = "book" | "pencil" | "confetti" | "zzz" | "question" | "exclaim" | "document" | "dots" | "flame" | "heart";
export type ArmPose = "rest" | "wave" | "up" | "hold";

export interface RobotLook {
  eyes: EyeKind;
  mouth: MouthKind;
  arms: ArmPose;
  prop?: PropKind;
  /** CSS motion class applied to the whole robot (see robot.css). */
  motion: "breathe" | "bounce" | "hop" | "droop" | "tilt" | "shake" | "nod";
  /** Brighter antenna/face glow for big moments. */
  glow?: boolean;
}

export const ROBOT_LOOKS: Record<RobotState, RobotLook> = {
  idle: { eyes: "open", mouth: "smile", arms: "rest", motion: "breathe" },
  waving: { eyes: "happy", mouth: "grin", arms: "wave", motion: "breathe" },
  studying: { eyes: "down", mouth: "flat", arms: "hold", prop: "book", motion: "nod" },
  focused: { eyes: "down", mouth: "flat", arms: "rest", motion: "breathe" },
  thinking: { eyes: "up", mouth: "flat", arms: "rest", prop: "dots", motion: "tilt" },
  happy: { eyes: "happy", mouth: "smile", arms: "rest", prop: "heart", motion: "bounce" },
  excited: { eyes: "wide", mouth: "grin", arms: "up", motion: "hop", glow: true },
  celebrating: { eyes: "happy", mouth: "grin", arms: "up", prop: "confetti", motion: "hop", glow: true },
  proud: { eyes: "happy", mouth: "grin", arms: "up", prop: "flame", motion: "bounce", glow: true },
  confused: { eyes: "confused", mouth: "wavy", arms: "rest", prop: "question", motion: "tilt" },
  encouraging: { eyes: "happy", mouth: "smile", arms: "up", motion: "nod" },
  concerned: { eyes: "sad", mouth: "frown", arms: "rest", motion: "droop" },
  sleepy: { eyes: "closed", mouth: "o", arms: "rest", prop: "zzz", motion: "droop" },
  curious: { eyes: "curious", mouth: "o", arms: "rest", motion: "tilt" },
  alert: { eyes: "wide", mouth: "o", arms: "rest", prop: "exclaim", motion: "shake" },
  writing: { eyes: "down", mouth: "smile", arms: "hold", prop: "pencil", motion: "nod" },
  document: { eyes: "down", mouth: "smile", arms: "hold", prop: "document", motion: "breathe" },
};

/** Default speech-bubble lines, used when a trigger doesn't pass its own message. */
export const ROBOT_LINES: Partial<Record<RobotState, string>> = {
  waving: "Hi! Ready to study? 👋",
  studying: "Let's focus 📖",
  thinking: "Hmm, let me think…",
  happy: "Correct! 😄",
  excited: "Nice work! ✨",
  celebrating: "Task done! 🎉",
  proud: "Look at that streak! 🔥",
  confused: "Hmm, not quite…",
  encouraging: "You've got this! 💪",
  concerned: "Let's catch up today 🙂",
  sleepy: "Zzz… still there?",
  curious: "Ooh, your notes!",
  alert: "Revision time! 👀",
  writing: "Writing it down ✍️",
  document: "Your PDF is ready 📄",
};

"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import { ROBOT_LOOKS, type ArmPose, type EyeKind, type MouthKind, type PropKind, type RobotState } from "./robot-states";

const EYE = "#7dd3fc";
const GLOW = "#38bdf8";
const L = 48; // left eye centre x
const R = 72; // right eye centre x

/**
 * The Study OS companion robot — small glossy white body, dark glass face,
 * glowing blue eyes, antenna with a blue tip, black/blue ear modules and tiny
 * arms. Pure SVG + CSS animation (see themes.css "STUDY ROBOT"), so it's a
 * few KB and costs nothing to animate.
 *
 *   <StudyRobot state="studying" size={64} />
 */
export function StudyRobot({
  state = "idle",
  size = 64,
  className,
  animationKey,
}: {
  state?: RobotState;
  size?: number;
  className?: string;
  /** Change it to replay the state's animation (e.g. two correct answers in a row). */
  animationKey?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const look = ROBOT_LOOKS[state];

  return (
    <svg
      key={animationKey}
      viewBox="0 0 120 132"
      width={size}
      height={(size * 132) / 120}
      role="img"
      aria-label={`Study robot — ${state}`}
      className={cn("robot overflow-visible", `robot--${look.motion}`, look.glow && "robot--glow", className)}
    >
      <defs>
        <linearGradient id={`shell-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.7" stopColor="#eef2f7" />
          <stop offset="1" stopColor="#d5dde8" />
        </linearGradient>
        <linearGradient id={`screen-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e293b" />
          <stop offset="1" stopColor="#020617" />
        </linearGradient>
        <radialGradient id={`warm-${uid}`} cx="0.3" cy="0.2" r="0.9">
          <stop offset="0" stopColor="#fff7ed" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff7ed" stopOpacity="0" />
        </radialGradient>
        <filter id={`glow-${uid}`} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="1.8" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g className="robot-all">
        {/* soft floor shadow */}
        <ellipse className="robot-floor" cx="60" cy="126" rx="22" ry="3.5" fill="#0f172a" opacity="0.18" />

        {/* body */}
        <g className="robot-torso">
          <rect x="38" y="84" width="44" height="34" rx="16" fill={`url(#shell-${uid})`} stroke="#cbd5e1" strokeWidth="1.5" />
          <ellipse cx="50" cy="92" rx="6" ry="3" fill="#ffffff" opacity="0.9" />
          <circle className="robot-chest" cx="60" cy="101" r="4" fill={GLOW} filter={`url(#glow-${uid})`} />
        </g>

        {/* tiny arms, in front of the torso */}
        <Arm side="left" pose={look.arms} fill={`url(#shell-${uid})`} />
        <Arm side="right" pose={look.arms} fill={`url(#shell-${uid})`} />

        {/* head (antenna + ears + shell + face) */}
        <g className="robot-head">
          <rect x="58.5" y="9" width="3" height="15" rx="1.5" fill="#111827" />
          <circle className="robot-antenna" cx="60" cy="8" r="4.5" fill={GLOW} filter={`url(#glow-${uid})`} />

          <rect x="12" y="39" width="13" height="26" rx="6.5" fill="#0f172a" />
          <rect className="robot-ear" x="15.5" y="45" width="6" height="14" rx="3" fill={GLOW} opacity="0.85" />
          <rect x="95" y="39" width="13" height="26" rx="6.5" fill="#0f172a" />
          <rect className="robot-ear" x="98.5" y="45" width="6" height="14" rx="3" fill={GLOW} opacity="0.85" />

          <rect x="22" y="22" width="76" height="62" rx="28" fill={`url(#shell-${uid})`} stroke="#cbd5e1" strokeWidth="1.5" />
          <rect x="22" y="22" width="76" height="62" rx="28" fill={`url(#warm-${uid})`} />
          <ellipse cx="44" cy="30" rx="13" ry="4" fill="#ffffff" opacity="0.95" />

          <rect x="30" y="33" width="60" height="41" rx="17" fill={`url(#screen-${uid})`} stroke={GLOW} strokeOpacity="0.35" strokeWidth="1.2" />
          <path d="M38 38 q8 -3 18 -2" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="2.5" strokeLinecap="round" fill="none" />

          <g filter={`url(#glow-${uid})`}>
            <Eyes kind={look.eyes} />
            <Mouth kind={look.mouth} />
          </g>
        </g>

        {look.prop && <Prop kind={look.prop} />}
      </g>
    </svg>
  );
}

function Arm({ side, pose, fill }: { side: "left" | "right"; pose: ArmPose; fill: string }) {
  const left = side === "left";
  const angle = {
    rest: left ? 14 : -14,
    wave: left ? 14 : -118,
    up: left ? 118 : -118,
    hold: left ? -38 : 38,
  }[pose];
  const x = left ? 29 : 82;
  return (
    <g
      className={cn("robot-arm", pose === "wave" && !left && "robot-arm--wave")}
      style={{ transformOrigin: `${left ? 37 : 83}px 91px`, transform: `rotate(${angle}deg)` }}
    >
      <rect x={x} y="88" width="9" height="20" rx="4.5" fill={fill} stroke="#cbd5e1" strokeWidth="1.2" />
      <circle cx={x + 4.5} cy="109" r="4.5" fill="#1e293b" />
      <circle cx={x + 4.5} cy="109" r="1.6" fill={GLOW} />
    </g>
  );
}

function Eyes({ kind }: { kind: EyeKind }) {
  const stroke = { stroke: EYE, strokeWidth: 3.5, strokeLinecap: "round" as const, fill: "none" };
  switch (kind) {
    case "happy":
      return (
        <g>
          <path d={`M${L - 6} 56 Q${L} 46 ${L + 6} 56`} {...stroke} />
          <path d={`M${R - 6} 56 Q${R} 46 ${R + 6} 56`} {...stroke} />
        </g>
      );
    case "closed":
      return (
        <g>
          <path d={`M${L - 6} 54 Q${L} 58 ${L + 6} 54`} {...stroke} />
          <path d={`M${R - 6} 54 Q${R} 58 ${R + 6} 54`} {...stroke} />
        </g>
      );
    case "down":
      return (
        <g className="robot-eyes robot-eyes--read">
          <rect x={L - 5} y="52" width="10" height="9" rx="4.5" fill={EYE} />
          <rect x={R - 5} y="52" width="10" height="9" rx="4.5" fill={EYE} />
        </g>
      );
    case "up":
      return (
        <g className="robot-eyes">
          <rect x={L - 3} y="42" width="10" height="11" rx="5" fill={EYE} />
          <rect x={R - 3} y="42" width="10" height="11" rx="5" fill={EYE} />
        </g>
      );
    case "confused":
      return (
        <g>
          <rect x={L - 5} y="46" width="10" height="13" rx="5" fill={EYE} />
          <rect x={R - 4} y="50" width="8" height="7" rx="3.5" fill={EYE} />
          <path d={`M${R - 6} 45 L${R + 6} 42`} {...stroke} strokeWidth={2.5} />
        </g>
      );
    case "sad":
      return (
        <g>
          <rect x={L - 5} y="49" width="10" height="11" rx="5" fill={EYE} />
          <rect x={R - 5} y="49" width="10" height="11" rx="5" fill={EYE} />
          <path d={`M${L - 7} 45 L${L + 5} 42`} {...stroke} strokeWidth={2.5} />
          <path d={`M${R - 5} 42 L${R + 7} 45`} {...stroke} strokeWidth={2.5} />
        </g>
      );
    case "wide":
      return (
        <g>
          <circle cx={L} cy="52" r="7" fill={EYE} />
          <circle cx={R} cy="52" r="7" fill={EYE} />
          <circle cx={L + 2} cy="50" r="2" fill="#ffffff" />
          <circle cx={R + 2} cy="50" r="2" fill="#ffffff" />
        </g>
      );
    case "curious":
      return (
        <g className="robot-eyes">
          <circle cx={L} cy="52" r="7" fill={EYE} />
          <circle cx={L + 2} cy="50" r="2" fill="#ffffff" />
          <rect x={R - 4} y="48" width="8" height="10" rx="4" fill={EYE} />
        </g>
      );
    default:
      return (
        <g className="robot-eyes robot-eyes--blink">
          <rect x={L - 5} y="46" width="10" height="13" rx="5" fill={EYE} />
          <rect x={R - 5} y="46" width="10" height="13" rx="5" fill={EYE} />
        </g>
      );
  }
}

function Mouth({ kind }: { kind: MouthKind }) {
  const stroke = { stroke: EYE, strokeWidth: 2.5, strokeLinecap: "round" as const, fill: "none" };
  switch (kind) {
    case "smile":
      return <path d="M54 64 Q60 69 66 64" {...stroke} />;
    case "grin":
      return <path d="M52 63 Q60 72 68 63 Z" fill={EYE} />;
    case "flat":
      return <path d="M55 66 L65 66" {...stroke} />;
    case "wavy":
      return <path d="M52 66 q2 -2.5 4 0 t4 0 t4 0 t4 0" {...stroke} strokeWidth={2} />;
    case "frown":
      return <path d="M54 68 Q60 63 66 68" {...stroke} />;
    case "o":
      return <circle cx="60" cy="66" r="2.6" {...stroke} strokeWidth={2} />;
    default:
      return null;
  }
}

function Prop({ kind }: { kind: PropKind }) {
  switch (kind) {
    case "book":
      return (
        <g className="robot-prop robot-prop--book">
          <path d="M60 98 L40 94 L40 116 L60 120 Z" fill="#fef3c7" stroke="#1d4ed8" strokeWidth="2" strokeLinejoin="round" />
          <path d="M60 98 L80 94 L80 116 L60 120 Z" fill="#fffbeb" stroke="#1d4ed8" strokeWidth="2" strokeLinejoin="round" />
          <path className="robot-page" d="M60 98 L78 95 L78 115 L60 119 Z" fill="#ffffff" stroke="#93c5fd" strokeWidth="1" />
          <path d="M44 100 l12 2 M44 105 l12 2 M44 110 l12 2" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      );
    case "pencil":
      return (
        <g className="robot-prop robot-prop--pencil">
          <rect x="36" y="100" width="28" height="18" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
          <path d="M40 112 h18" stroke="#94a3b8" strokeWidth="1.4" strokeLinecap="round" />
          <path className="robot-scribble" d="M39 106 q3 -3 6 0 t6 0 t6 0" stroke="#1d4ed8" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <g className="robot-pencil-tool">
            <rect x="60" y="100" width="22" height="5" rx="1.5" fill="#facc15" stroke="#a16207" strokeWidth="1" transform="rotate(-35 60 102)" />
          </g>
        </g>
      );
    case "document":
      return (
        <g className="robot-prop">
          <path d="M46 94 h22 l6 6 v22 h-28 Z" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M68 94 v6 h6" fill="#dbeafe" stroke="#1d4ed8" strokeWidth="1.5" />
          <text x="52" y="116" fontSize="8" fontWeight="700" fill="#dc2626" fontFamily="sans-serif">PDF</text>
          <path d="M50 102 h14 M50 107 h18" stroke="#94a3b8" strokeWidth="1.3" strokeLinecap="round" />
        </g>
      );
    case "confetti":
      return (
        <g className="robot-confetti">
          {[
            [18, 18, "#f43f5e"],
            [100, 14, "#facc15"],
            [30, 6, "#22c55e"],
            [92, 30, "#38bdf8"],
            [10, 44, "#a855f7"],
            [110, 50, "#fb923c"],
          ].map(([x, y, c], i) => (
            <rect key={i} x={x as number} y={y as number} width="5" height="3" rx="1" fill={c as string} style={{ animationDelay: `${i * 0.12}s` }} />
          ))}
        </g>
      );
    case "zzz":
      return (
        <g className="robot-zzz" fill={GLOW} fontFamily="sans-serif" fontWeight="800">
          <text x="92" y="24" fontSize="11">z</text>
          <text x="100" y="14" fontSize="14" style={{ animationDelay: "0.6s" }}>Z</text>
        </g>
      );
    case "question":
      return (
        <text className="robot-pop" x="98" y="26" fontSize="22" fontWeight="800" fill={GLOW} fontFamily="sans-serif">?</text>
      );
    case "exclaim":
      return (
        <text className="robot-pop" x="100" y="26" fontSize="22" fontWeight="800" fill="#f59e0b" fontFamily="sans-serif">!</text>
      );
    case "dots":
      return (
        <g className="robot-dots" fill={GLOW}>
          <circle cx="94" cy="22" r="2.5" />
          <circle cx="101" cy="16" r="3" style={{ animationDelay: "0.2s" }} />
          <circle cx="109" cy="9" r="3.5" style={{ animationDelay: "0.4s" }} />
        </g>
      );
    case "flame":
      return <text className="robot-pop" x="92" y="24" fontSize="18">🔥</text>;
    case "heart":
      return <text className="robot-pop" x="94" y="24" fontSize="15">💙</text>;
  }
}

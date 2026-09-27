"use client";

import { useSyncExternalStore } from "react";
import { Palette, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const STYLE_STORAGE_KEY = "study-os-style";

export const VISUAL_STYLES = [
  { id: "neo", label: "Neo-Brutalism", hint: "Bold borders, hard shadows", swatch: ["#4338ca", "#111827", "#f5f3ff"] },
  { id: "glass", label: "Glassmorphism", hint: "Frosted glass over colour", swatch: ["#a78bfa", "#f472b6", "#60a5fa"] },
  { id: "neu", label: "Neumorphism", hint: "Soft extruded surfaces", swatch: ["#e0e5ec", "#b8c0cc", "#ffffff"] },
  { id: "clay", label: "Claymorphism", hint: "Puffy pastel clay", swatch: ["#f9a8d4", "#a5f3fc", "#fde68a"] },
  { id: "vector", label: "Vector Art", hint: "Flat, bright & playful", swatch: ["#14b8a6", "#f97316", "#facc15"] },
  { id: "pixel", label: "Retro Pixel Art", hint: "8-bit, square & chunky", swatch: ["#e11d48", "#22c55e", "#1e1b4b"] },
] as const;

export type VisualStyleId = (typeof VISUAL_STYLES)[number]["id"];

/**
 * Inline, render-blocking snippet for <head>: applies the saved style before
 * first paint so there's no flash of the default theme on load.
 */
export const STYLE_BOOT_SCRIPT = `try{var s=localStorage.getItem("${STYLE_STORAGE_KEY}");if(s&&s!=="neo")document.documentElement.setAttribute("data-style",s)}catch(e){}`;

function applyStyle(id: VisualStyleId) {
  const root = document.documentElement;
  if (id === "neo") root.removeAttribute("data-style");
  else root.setAttribute("data-style", id);
  try {
    localStorage.setItem(STYLE_STORAGE_KEY, id);
  } catch {
    // private mode etc. — the choice just won't persist
  }
}

// The <html data-style> attribute is the source of truth (set before paint by
// STYLE_BOOT_SCRIPT); components subscribe to it so every picker stays in sync.
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
const readStyle = () => (document.documentElement.getAttribute("data-style") as VisualStyleId | null) ?? "neo";

export function useVisualStyle(): [VisualStyleId, (id: VisualStyleId) => void] {
  const style = useSyncExternalStore(subscribe, readStyle, () => "neo" as VisualStyleId);
  return [
    style,
    (id) => {
      applyStyle(id);
      listeners.forEach((l) => l());
    },
  ];
}

function Swatch({ colors }: { colors: readonly string[] }) {
  return (
    <span className="flex -space-x-1.5 shrink-0" aria-hidden>
      {colors.map((c) => (
        <span key={c} className="size-4 rounded-full border border-black/20" style={{ background: c }} />
      ))}
    </span>
  );
}

/** Topbar palette button → dropdown of the six visual styles. */
export function StylePicker() {
  const [style, setStyle] = useVisualStyle();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Change theme style" title="Theme style">
          <Palette className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Theme style</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {VISUAL_STYLES.map((s) => (
          <DropdownMenuItem key={s.id} onSelect={() => setStyle(s.id)} className="gap-2.5">
            <Swatch colors={s.swatch} />
            <span className="flex-1">
              <span className="block text-sm">{s.label}</span>
              <span className="block text-xs text-muted-foreground">{s.hint}</span>
            </span>
            {style === s.id && <Check className="size-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Larger card grid for the Settings page. */
export function StyleGrid() {
  const [style, setStyle] = useVisualStyle();
  return (
    <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3">
      {VISUAL_STYLES.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => setStyle(s.id)}
          className={cn(
            "text-left rounded-lg border-2 border-border p-3 transition-colors hover:bg-muted",
            style === s.id && "ring-2 ring-primary bg-primary/5"
          )}
        >
          <div className="flex items-center justify-between">
            <Swatch colors={s.swatch} />
            {style === s.id && <Check className="size-4 text-primary" />}
          </div>
          <p className="text-sm font-medium mt-2">{s.label}</p>
          <p className="text-xs text-muted-foreground">{s.hint}</p>
        </button>
      ))}
    </div>
  );
}

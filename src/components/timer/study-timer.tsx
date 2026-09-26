"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, RotateCcw, Timer as TimerIcon } from "lucide-react";
import { saveStudySessionAction } from "@/server/actions/sessions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Mode = "FOCUS" | "SHORT_BREAK" | "LONG_BREAK";

const DURATIONS: Record<Mode, number> = { FOCUS: 25 * 60, SHORT_BREAK: 5 * 60, LONG_BREAK: 15 * 60 };
const MODE_LABEL: Record<Mode, string> = { FOCUS: "Focus", SHORT_BREAK: "Short Break", LONG_BREAK: "Long Break" };

export function StudyTimer({
  subjectId,
  chapterId,
  topicId,
  contextLabel,
}: {
  subjectId?: string;
  chapterId?: string;
  topicId?: string;
  contextLabel?: string;
}) {
  const [mode, setMode] = useState<Mode>("FOCUS");
  const [secondsLeft, setSecondsLeft] = useState(DURATIONS.FOCUS);
  const [running, setRunning] = useState(false);
  const startedAtRef = useRef<Date | null>(null);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          finishSession(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  function switchMode(next: Mode) {
    setRunning(false);
    setMode(next);
    setSecondsLeft(DURATIONS[next]);
    startedAtRef.current = null;
  }

  function start() {
    startedAtRef.current = new Date();
    setRunning(true);
  }

  async function finishSession(completed: boolean) {
    setRunning(false);
    const startedAt = startedAtRef.current;
    startedAtRef.current = null;
    if (!startedAt) return;

    const endedAt = new Date();
    const elapsed = Math.round((endedAt.getTime() - startedAt.getTime()) / 1000);
    if (elapsed < 10) return; // ignore accidental instant stops

    try {
      await saveStudySessionAction({ subjectId, chapterId, topicId, sessionType: mode, startedAt, endedAt });
      if (mode === "FOCUS") {
        toast.success(completed ? "Focus session logged" : "Session saved", {
          description: `${Math.round(elapsed / 60)} min logged${contextLabel ? ` on ${contextLabel}` : ""}.`,
        });
      }
    } catch {
      toast.error("Couldn't save this session — check your connection.");
    }
    setSecondsLeft(DURATIONS[mode]);
  }

  function stop() {
    finishSession(false);
  }

  const mins = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const secs = (secondsLeft % 60).toString().padStart(2, "0");

  return (
    <Card>
      <CardContent className="pt-6 flex flex-col items-center">
        <div className="flex gap-1.5 mb-4">
          {(Object.keys(DURATIONS) as Mode[]).map((m) => (
            <Button
              key={m}
              size="sm"
              variant={mode === m ? "default" : "outline"}
              disabled={running}
              onClick={() => switchMode(m)}
            >
              {MODE_LABEL[m]}
            </Button>
          ))}
        </div>
        <div className={cn("text-5xl font-semibold tabular-nums", running && "text-primary")}>
          {mins}:{secs}
        </div>
        {contextLabel && <p className="text-xs text-muted-foreground mt-1">{contextLabel}</p>}
        <div className="flex gap-2 mt-5">
          {!running ? (
            <Button onClick={start}>
              <Play className="size-4 mr-1.5" /> Start
            </Button>
          ) : (
            <Button variant="secondary" onClick={stop}>
              <Pause className="size-4 mr-1.5" /> Stop &amp; Save
            </Button>
          )}
          <Button
            variant="ghost"
            aria-label="Reset timer"
            onClick={() => {
              setRunning(false);
              setSecondsLeft(DURATIONS[mode]);
              startedAtRef.current = null;
            }}
          >
            <RotateCcw className="size-4" />
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-4 flex items-center gap-1">
          <TimerIcon className="size-3" /> Only Focus sessions count toward your streak and daily goal.
        </p>
      </CardContent>
    </Card>
  );
}

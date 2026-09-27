"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, CalendarCheck, CalendarRange, AlertTriangle } from "lucide-react";
import {
  generatePlanAction,
  applyPlanToTodayAction,
  generateFullPlanAction,
  applyFullPlanAction,
  type FullScheduleDayPayload,
} from "@/server/actions/ai";
import type { AIPlan } from "@/lib/ai/schemas";
import { AIContent } from "@/components/ai/ai-content";
import { cn } from "@/lib/utils";

type Mode = "today" | "full";

type PlannedDay = Omit<AIPlan, "dailyPlan"> & {
  dailyPlan: (AIPlan["dailyPlan"][number] & { topicId?: string })[];
};

interface FullPlanResult {
  rationale: string;
  weeklyFocus: string[];
  priorityOrder: string[];
  schedule: FullScheduleDayPayload[];
  horizonNote: string | null;
}

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

export function AIPlannerPanel({ exams, hasExamDate }: { exams: { id: string; name: string }[]; hasExamDate: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("today");
  const [examId, setExamId] = useState(exams[0]?.id ?? "");
  const [hours, setHours] = useState(4);
  const [level, setLevel] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [priorities, setPriorities] = useState("");
  const [plan, setPlan] = useState<PlannedDay | null>(null);
  const [fullPlan, setFullPlan] = useState<FullPlanResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [applied, setApplied] = useState(false);
  const [applying, setApplying] = useState(false);

  function generate() {
    if (!examId) return;
    startTransition(async () => {
      try {
        if (mode === "today") {
          const result = (await generatePlanAction({
            examId,
            availableHoursPerDay: hours,
            preparationLevel: level || undefined,
            preferredStudyTime: preferredTime || undefined,
            priorities: priorities || undefined,
          })) as PlannedDay;
          setPlan(result);
          setFullPlan(null);
        } else {
          const result = (await generateFullPlanAction({ examId, hoursPerDay: hours })) as FullPlanResult;
          setFullPlan(result);
          setPlan(null);
        }
        setApplied(false);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "AI_FAILED";
        toast.error(
          msg.includes("AI_NOT_CONFIGURED")
            ? "AI isn't configured — add GEMINI_API_KEY."
            : msg.includes("RATE_LIMITED")
            ? "Too many AI requests — wait a minute and try again."
            : "Couldn't generate a plan right now — please try again."
        );
      }
    });
  }

  async function apply() {
    setApplying(true);
    try {
      if (mode === "today" && plan) {
        await applyPlanToTodayAction({
          rationale: plan.rationale,
          items: plan.dailyPlan.map((i) => ({
            label: i.label,
            startTime: i.startTime || undefined,
            endTime: i.endTime || undefined,
            topicId: i.topicId,
          })),
        });
        setApplied(true);
        toast.success("Applied to today's plan", { action: { label: "Open", onClick: () => router.push("/plan") } });
        router.refresh();
      } else if (mode === "full" && fullPlan) {
        await applyFullPlanAction({ rationale: fullPlan.rationale, schedule: fullPlan.schedule });
        setApplied(true);
        toast.success(`Applied ${fullPlan.schedule.length} days to your schedule`);
        router.refresh();
      }
    } catch {
      toast.error("Couldn't save the plan — please try again.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={mode === "today" ? "default" : "outline"}
          onClick={() => {
            setMode("today");
            setPlan(null);
            setFullPlan(null);
          }}
        >
          Today only
        </Button>
        <Button
          size="sm"
          variant={mode === "full" ? "default" : "outline"}
          onClick={() => {
            setMode("full");
            setPlan(null);
            setFullPlan(null);
          }}
          title={!hasExamDate ? "Set your exam date in Settings for a full-syllabus schedule" : undefined}
        >
          <CalendarRange className="size-3.5 mr-1.5" /> Full schedule to exam date
        </Button>
      </div>
      {mode === "full" && !hasExamDate && (
        <p className="text-xs text-amber-600 flex items-center gap-1.5">
          <AlertTriangle className="size-3.5" /> No exam date set — this will default to a 30-day
          schedule. Set your exam date in Settings for the full syllabus coverage.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your inputs</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Target exam</Label>
            <Select value={examId} onValueChange={setExamId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {exams.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
                {exams.length > 1 && <SelectItem value="BOTH">Both (JEE Main + RBSE Class 12)</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Available hours {mode === "today" ? "today" : "per day"}</Label>
            <Input type="number" min={0.5} max={16} step={0.5} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
          </div>
          {mode === "today" && (
            <>
              <div className="space-y-1.5">
                <Label>Preparation level (optional)</Label>
                <Input placeholder="e.g. beginner, revising, near-final" value={level} onChange={(e) => setLevel(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Preferred study time (optional)</Label>
                <Input placeholder="e.g. morning, evening" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Anything else to prioritize? (optional)</Label>
                <Textarea placeholder="e.g. focus more on Chemistry this week" value={priorities} onChange={(e) => setPriorities(e.target.value)} />
              </div>
            </>
          )}
          <div className="sm:col-span-2">
            <Button onClick={generate} disabled={isPending || !examId}>
              <Sparkles className="size-4 mr-1.5" /> {isPending ? "Generating your plan…" : "Generate Plan"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {plan && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              <Sparkles className="size-3 mr-1" /> AI Generated — based on your real progress data
            </Badge>
            <Button size="sm" onClick={apply} disabled={applied || applying}>
              <CalendarCheck className="size-3.5 mr-1.5" /> {applied ? "Applied" : "Apply to Today's Targets"}
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Why this plan</CardTitle>
            </CardHeader>
            <CardContent>
              <AIContent text={plan.rationale} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Today&apos;s schedule</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {plan.dailyPlan.map((item, i) => (
                <div key={i} className="py-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      {item.chapterName && (
                        <p className="text-xs text-muted-foreground">
                          {item.subjectName ? `${item.subjectName} → ` : ""}
                          {item.chapterName}
                        </p>
                      )}
                    </div>
                    {(item.startTime || item.endTime) && (
                      <span className="text-xs text-muted-foreground">
                        {item.startTime}–{item.endTime}
                      </span>
                    )}
                  </div>
                  <AIContent text={item.reason} className="text-xs text-muted-foreground" />
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Weekly focus</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {plan.weeklyFocus.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Priority order</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal pl-5 space-y-1 text-sm">
                  {plan.priorityOrder.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {fullPlan && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              <Sparkles className="size-3 mr-1" /> AI Generated — {fullPlan.schedule.length} days scheduled
            </Badge>
            <Button size="sm" onClick={apply} disabled={applied || applying}>
              <CalendarCheck className="size-3.5 mr-1.5" /> {applied ? "Applied" : `Apply all ${fullPlan.schedule.length} days`}
            </Button>
          </div>

          {fullPlan.horizonNote && (
            <p className="text-xs text-amber-600 flex items-center gap-1.5">
              <AlertTriangle className="size-3.5" /> {fullPlan.horizonNote}
            </p>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Why this schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <AIContent text={fullPlan.rationale} />
            </CardContent>
          </Card>

          <FullScheduleCollapsedPreview schedule={fullPlan.schedule} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Weekly focus</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {fullPlan.weeklyFocus.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Priority order</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal pl-5 space-y-1 text-sm">
                  {fullPlan.priorityOrder.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function FullScheduleCollapsedPreview({ schedule }: { schedule: FullScheduleDayPayload[] }) {
  const weeks: FullScheduleDayPayload[][] = [];
  for (let i = 0; i < schedule.length; i += 7) weeks.push(schedule.slice(i, i + 7));
  const [openWeek, setOpenWeek] = useState(0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Day-by-day preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {weeks.map((_, i) => (
            <Button
              key={i}
              size="sm"
              variant={openWeek === i ? "default" : "outline"}
              onClick={() => setOpenWeek(i)}
              className="rounded-full"
            >
              Week {i + 1}
            </Button>
          ))}
        </div>
        <div className="divide-y">
          {weeks[openWeek]?.map((day) => (
            <div key={day.date} className="py-2.5">
              <p className="text-xs font-medium text-muted-foreground mb-1">{formatDate(day.date)}</p>
              <div className="flex flex-wrap gap-1.5">
                {day.items.map((it) => (
                  <span key={it.topicId} className={cn("text-xs rounded-full border px-2.5 py-1")}>
                    {it.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

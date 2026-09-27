"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { PriorityBadge } from "@/components/priority-badge";
import { ChevronDown, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { addTopicsToTodayAction } from "@/server/actions/targets";
import type { SyllabusExam } from "@/server/queries/syllabus";
import { setRobotState } from "@/components/study-robot/robot-store";

/**
 * Exam → Subject → Chapter → Topic checkbox picker for Today's Plan. Ticking
 * a chapter selects all of its topics; selections survive switching subjects
 * (and exams), so a student can pick from Physics, Chemistry and Maths and add
 * them all at once — or add subject by subject.
 */
export function PlanTopicPicker({
  exams,
  defaultExamId,
  plannedTopicIds,
}: {
  exams: SyllabusExam[];
  defaultExamId?: string;
  plannedTopicIds: string[];
}) {
  const router = useRouter();
  const [examId, setExamId] = useState(
    exams.find((e) => e.id === defaultExamId)?.id ?? exams[0]?.id ?? ""
  );
  const exam = exams.find((e) => e.id === examId);
  const [subjectId, setSubjectId] = useState(exam?.subjects[0]?.id ?? "");
  const subject = exam?.subjects.find((s) => s.id === subjectId) ?? exam?.subjects[0];
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openChapters, setOpenChapters] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const planned = useMemo(() => new Set(plannedTopicIds), [plannedTopicIds]);

  const topicLookup = useMemo(() => {
    const map = new Map<string, { subject: string }>();
    for (const e of exams) for (const s of e.subjects) for (const c of s.chapters) for (const t of c.topics) map.set(t.id, { subject: s.name });
    return map;
  }, [exams]);

  const q = query.trim().toLowerCase();
  const chapters = (subject?.chapters ?? [])
    .map((c) => {
      if (!q) return c;
      if (c.name.toLowerCase().includes(q)) return c;
      return { ...c, topics: c.topics.filter((t) => t.name.toLowerCase().includes(q)) };
    })
    .filter((c) => c.topics.length > 0);

  function toggle(ids: string[], on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (planned.has(id)) continue;
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  function toggleOpen(id: string) {
    setOpenChapters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function add() {
    const ids = [...selected];
    if (ids.length === 0) return;
    startTransition(async () => {
      try {
        const { added, skipped } = await addTopicsToTodayAction({ topicIds: ids });
        toast.success(
          `${added} topic${added === 1 ? "" : "s"} added to today's plan${skipped ? ` (${skipped} already there)` : ""}`
        );
        setSelected(new Set());
        if (added > 0) setRobotState("encouraging", { message: `${added} topic${added === 1 ? "" : "s"} planned — let's go! 💪` });
        router.refresh();
      } catch {
        toast.error("Couldn't add those topics — try again.");
      }
    });
  }

  const selectedBySubject = useMemo(() => {
    const counts = new Map<string, number>();
    for (const id of selected) {
      const s = topicLookup.get(id)?.subject ?? "Other";
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    return [...counts.entries()];
  }, [selected, topicLookup]);

  if (!exam) return <p className="text-sm text-muted-foreground">No syllabus available yet.</p>;

  return (
    <div className="space-y-3">
      {exams.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {exams.map((e) => (
            <Button
              key={e.id}
              size="sm"
              variant={e.id === examId ? "default" : "outline"}
              onClick={() => {
                setExamId(e.id);
                setSubjectId(e.subjects[0]?.id ?? "");
              }}
            >
              {e.name}
            </Button>
          ))}
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {exam.subjects.map((s) => {
          const count = s.chapters.reduce((n, c) => n + c.topics.filter((t) => selected.has(t.id)).length, 0);
          return (
            <Button
              key={s.id}
              size="sm"
              variant={s.id === subject?.id ? "secondary" : "ghost"}
              className={cn("shrink-0", s.id === subject?.id && "ring-2 ring-primary/40")}
              onClick={() => setSubjectId(s.id)}
            >
              {s.name}
              {count > 0 && <span className="ml-1 rounded-full bg-primary text-primary-foreground px-1.5 text-[10px]">{count}</span>}
            </Button>
          );
        })}
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          placeholder={`Filter ${subject?.name ?? ""} chapters or topics…`}
          className="pl-8 h-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="rounded-lg border-2 border-border divide-y max-h-[460px] overflow-y-auto overscroll-contain">
        {chapters.length === 0 && <p className="p-3 text-sm text-muted-foreground">Nothing matches that filter.</p>}
        {chapters.map((c) => {
          const selectable = c.topics.filter((t) => !planned.has(t.id));
          const pickedCount = c.topics.filter((t) => selected.has(t.id)).length;
          const allPicked = selectable.length > 0 && selectable.every((t) => selected.has(t.id));
          const somePicked = pickedCount > 0 && !allPicked;
          const isOpen = openChapters.has(c.id) || !!q;
          return (
            <div key={c.id}>
              <div className="flex items-center gap-2.5 px-3 py-2.5">
                <Checkbox
                  aria-label={`Select all topics in ${c.name}`}
                  checked={allPicked ? true : somePicked ? "indeterminate" : false}
                  disabled={selectable.length === 0}
                  onCheckedChange={(v) => toggle(c.topics.map((t) => t.id), v === true)}
                />
                <button className="flex-1 min-w-0 text-left" onClick={() => toggleOpen(c.id)}>
                  <p className="text-sm font-medium leading-snug">{c.name}</p>
                  <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 mt-0.5">
                    <span>{c.topics.length} topics</span>
                    {c.weightage && <span className="font-medium text-foreground/80">· {c.weightage}</span>}
                    {pickedCount > 0 && <span className="text-primary font-medium">· {pickedCount} selected</span>}
                  </p>
                </button>
                <PriorityBadge priority={c.priority} className="shrink-0 hidden sm:inline-flex" />
                <button
                  onClick={() => toggleOpen(c.id)}
                  aria-label={isOpen ? "Collapse" : "Expand"}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <ChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} />
                </button>
              </div>
              {isOpen && (
                <div className="pb-2 pl-9 pr-3 space-y-0.5">
                  {c.topics.map((t) => {
                    const already = planned.has(t.id);
                    return (
                      <label
                        key={t.id}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-muted",
                          already && "opacity-60 cursor-default"
                        )}
                      >
                        <Checkbox
                          checked={already || selected.has(t.id)}
                          disabled={already}
                          onCheckedChange={(v) => toggle([t.id], v === true)}
                        />
                        <span className="flex-1">{t.name}</span>
                        {already ? (
                          <span className="text-[11px] text-muted-foreground">in plan</span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">P{t.priority}</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-20 md:bottom-2 z-10 flex flex-wrap items-center gap-2 rounded-lg border-2 border-border bg-popover p-2.5 shadow-nb-sm">
        <div className="flex-1 min-w-0 text-xs text-muted-foreground">
          {selected.size === 0
            ? "Tick chapters or topics to add them."
            : selectedBySubject.map(([s, n]) => `${s}: ${n}`).join(" · ")}
        </div>
        {selected.size > 0 && (
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            <X className="size-3.5" /> Clear
          </Button>
        )}
        <Button size="sm" onClick={add} disabled={isPending || selected.size === 0}>
          <Plus className="size-4" />
          {isPending ? "Adding…" : `Add ${selected.size || ""} to Today's Plan`}
        </Button>
      </div>
    </div>
  );
}

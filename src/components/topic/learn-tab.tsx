"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Save, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { generateNotesAction, saveAINotesAsNoteAction } from "@/server/actions/ai";
import { setRobotState } from "@/components/study-robot/robot-store";
import type { AINotes } from "@/lib/ai/schemas";
import { AIContent } from "@/components/ai/ai-content";

function List({ items }: { items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <ul className="list-disc pl-5 space-y-1 text-sm">
      {items.map((it, i) => (
        <li key={i}>
          <AIContent text={it} className="inline" />
        </li>
      ))}
    </ul>
  );
}

function notesToMarkdown(n: AINotes, topicName: string): string {
  return `# ${topicName}

## Concept
${n.conceptExplanation}

## Important Definitions
${n.importantDefinitions.map((d) => `- ${d}`).join("\n")}

## Important Formulas
${n.importantFormulas.map((f) => `- ${f}`).join("\n")}

## Derivations
${n.derivations.map((d) => `- ${d}`).join("\n")}

## Important Conditions
${n.importantConditions.map((c) => `- ${c}`).join("\n")}

## Common Mistakes
${n.commonMistakes.map((m) => `- ${m}`).join("\n")}

## Typical Question Patterns
${n.typicalQuestionPatterns.map((q) => `- ${q}`).join("\n")}

## JEE Focus
${n.jeeFocus.conceptualUnderstanding}
Numerical approach: ${n.jeeFocus.numericalApproach}
Traps: ${n.jeeFocus.traps.join("; ")}

## RBSE Focus
${n.rbseFocus.boardOrientedExplanation}
Derivations: ${n.rbseFocus.importantDerivations.join("; ")}
Answer-writing points: ${n.rbseFocus.answerWritingPoints.join("; ")}

## Quick Revision Summary
${n.quickRevisionSummary}
`;
}

export function LearnTab({ topicId, topicName }: { topicId: string; topicName: string }) {
  const [notes, setNotes] = useState<AINotes | null>(null);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function generate(force = false) {
    setRobotState("thinking", { message: "Writing your notes…", duration: 0 });
    startTransition(async () => {
      try {
        const result = (await generateNotesAction({ topicId, force })) as AINotes;
        setNotes(result);
        setSaved(false);
        setRobotState("excited", { message: "Notes ready! 📚" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "AI_FAILED";
        setRobotState("concerned", { message: "Couldn't write notes — try again?" });
        if (msg.includes("AI_NOT_CONFIGURED")) {
          toast.error("AI isn't configured yet — add GEMINI_API_KEY to .env.local");
        } else if (msg.includes("RATE_LIMITED")) {
          toast.error("Too many AI requests — wait a minute and try again.");
        } else {
          toast.error("Couldn't generate notes right now.");
        }
      }
    });
  }

  async function saveAsNote() {
    if (!notes) return;
    await saveAINotesAsNoteAction(topicId, notesToMarkdown(notes, topicName), `${topicName} — AI Notes`);
    setSaved(true);
    setRobotState("writing", { message: "Saved to your notes ✍️" });
    toast.success("Saved to My Notes");
  }

  return (
    <div className="space-y-4">
      {!notes && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Sparkles className="size-6 text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-4">
              Generate structured notes for this topic — concept explanation, formulas, derivations, common
              mistakes, and separate JEE / RBSE focus sections.
            </p>
            <Button onClick={() => generate(false)} disabled={isPending}>
              {isPending ? "Generating…" : "Generate Notes"}
            </Button>
          </CardContent>
        </Card>
      )}

      {notes && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              <Sparkles className="size-3 mr-1" /> AI Generated
            </Badge>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => generate(true)} disabled={isPending}>
                <RotateCw className="size-3.5 mr-1.5" /> Regenerate
              </Button>
              <Button size="sm" onClick={saveAsNote} disabled={saved}>
                <Save className="size-3.5 mr-1.5" /> {saved ? "Saved" : "Save to My Notes"}
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Concept</CardTitle>
            </CardHeader>
            <CardContent>
              <AIContent text={notes.conceptExplanation} />
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Definitions</CardTitle>
              </CardHeader>
              <CardContent>
                <List items={notes.importantDefinitions} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Formulas</CardTitle>
              </CardHeader>
              <CardContent>
                <List items={notes.importantFormulas} />
              </CardContent>
            </Card>
          </div>

          {notes.derivations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Derivations</CardTitle>
              </CardHeader>
              <CardContent>
                <List items={notes.derivations} />
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Important Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <List items={notes.importantConditions} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Common Mistakes</CardTitle>
              </CardHeader>
              <CardContent>
                <List items={notes.commonMistakes} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Typical Question Patterns</CardTitle>
            </CardHeader>
            <CardContent>
              <List items={notes.typicalQuestionPatterns} />
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="text-base text-blue-700">JEE Main Focus</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <AIContent text={notes.jeeFocus.conceptualUnderstanding} />
                <AIContent text={notes.jeeFocus.numericalApproach} className="text-muted-foreground" />
                <List items={notes.jeeFocus.traps} />
              </CardContent>
            </Card>
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-base text-red-700">RBSE Board Focus</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <AIContent text={notes.rbseFocus.boardOrientedExplanation} />
                <List items={notes.rbseFocus.importantDerivations} />
                <List items={notes.rbseFocus.answerWritingPoints} />
              </CardContent>
            </Card>
          </div>

          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-base">Quick Revision Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <AIContent text={notes.quickRevisionSummary} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

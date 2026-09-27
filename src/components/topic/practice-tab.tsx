"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { generateQuestionsAction, saveGeneratedQuestionsAction } from "@/server/actions/ai";
import { recordAttemptAction } from "@/server/actions/questions";
import type { AIQuestion } from "@/lib/ai/schemas";
import { Sparkles, CheckCircle2, XCircle, Gauge } from "lucide-react";
import { AIContent } from "@/components/ai/ai-content";
import { computeEffortNeeded, type EffortAttempt } from "@/lib/domain/effort";
import { Progress } from "@/components/ui/progress";
import { setRobotState } from "@/components/study-robot/robot-store";

export interface SavedQuestion {
  id: string;
  questionText: string;
  questionType: string;
  options: unknown;
  correctAnswer: string | null;
  explanation: string | null;
  difficulty: string;
  source: string;
}

function QuestionCard({
  question,
  options,
  correctAnswer,
  explanation,
  difficulty,
  badge,
  onAttempt,
}: {
  question: string;
  options?: string[];
  correctAnswer?: string | null;
  explanation?: string | null;
  difficulty: string;
  badge: React.ReactNode;
  onAttempt?: (isCorrect: boolean) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  return (
    <Card>
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-center justify-between">
          {badge}
          <Badge variant="outline">{difficulty}</Badge>
        </div>
        <div className="text-sm font-medium">
          <AIContent text={question} />
        </div>
        {options && options.length > 0 && (
          <div className="grid gap-1.5">
            {options.map((opt, i) => {
              const isCorrect = revealed && opt === correctAnswer;
              const isWrongPick = revealed && selected === opt && opt !== correctAnswer;
              return (
                <button
                  key={i}
                  onClick={() => !revealed && setSelected(opt)}
                  className={`flex items-center gap-1 text-left text-sm rounded-md border px-3 py-2.5 transition-colors overflow-x-auto ${
                    selected === opt ? "border-primary" : "border-muted"
                  } ${isCorrect ? "bg-green-50 border-green-400 dark:bg-green-500/15" : ""} ${isWrongPick ? "bg-red-50 border-red-400 dark:bg-red-500/15" : ""}`}
                >
                  <span className="font-semibold mr-1.5">{String.fromCharCode(65 + i)}.</span>
                  <AIContent text={opt} inline />
                </button>
              );
            })}
          </div>
        )}
        {!revealed ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setRevealed(true);
              if (options && options.length > 0) {
                if (selected === correctAnswer) setRobotState("happy");
                else
                  setRobotState("confused", {
                    message: selected ? "Hmm, not quite…" : "Peeked at the answer? 👀",
                    duration: 1600,
                    then: "encouraging",
                  });
              }
              if (onAttempt) onAttempt(selected === correctAnswer);
            }}
          >
            Reveal Answer
          </Button>
        ) : (
          <div className="text-sm rounded-md bg-muted/60 p-3 space-y-1">
            <p className="flex items-center gap-1.5 font-medium">
              {selected === correctAnswer || !options ? (
                <CheckCircle2 className="size-4 text-green-600" />
              ) : (
                <XCircle className="size-4 text-red-500" />
              )}
              <span>
                Answer: <AIContent text={correctAnswer ?? ""} inline />
              </span>
            </p>
            {explanation && <AIContent text={explanation} className="text-muted-foreground" />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PracticeTab({ topicId, savedQuestions }: { topicId: string; savedQuestions: SavedQuestion[] }) {
  const [examTarget, setExamTarget] = useState<"RBSE" | "JEE_MAIN" | "MIXED">("MIXED");
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD" | "MIXED">("MIXED");
  const [count, setCount] = useState(5);
  const [generated, setGenerated] = useState<AIQuestion[] | null>(null);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [batchAttempts, setBatchAttempts] = useState<EffortAttempt[]>([]);

  const effort = useMemo(() => computeEffortNeeded(batchAttempts), [batchAttempts]);

  function generate() {
    setRobotState("thinking", { message: "Cooking up questions…", duration: 0 });
    startTransition(async () => {
      try {
        const result = (await generateQuestionsAction({ topicId, examTarget, difficulty, count })) as AIQuestion[];
        setGenerated(result);
        setRobotState("excited", { message: `${result.length} questions ready! ✨` });
        setSaved(false);
        setBatchAttempts([]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "AI_FAILED";
        setRobotState("concerned", { message: "That didn't work — try again?" });
        toast.error(
          msg.includes("AI_NOT_CONFIGURED")
            ? "AI isn't configured — add GEMINI_API_KEY."
            : msg.includes("RATE_LIMITED")
            ? "Too many AI requests in a minute — wait a moment and try again."
            : "Couldn't generate questions — please try again."
        );
      }
    });
  }

  async function saveAll() {
    if (!generated) return;
    await saveGeneratedQuestionsAction({ topicId, questions: generated });
    setSaved(true);
    toast.success("Saved to your question bank");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="size-4" /> Generate Practice Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            AI-generated original practice questions — not real past papers.
          </p>
          <div className="flex flex-wrap gap-3">
            <Select value={examTarget} onValueChange={(v) => setExamTarget(v as never)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RBSE">RBSE Board style</SelectItem>
                <SelectItem value="JEE_MAIN">JEE Main style</SelectItem>
                <SelectItem value="MIXED">Mixed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as never)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EASY">Easy</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HARD">Hard</SelectItem>
                <SelectItem value="MIXED">Mixed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={String(count)} onValueChange={(v) => setCount(Number(v))}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[3, 5, 10, 25, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} questions
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={generate} disabled={isPending}>
              {isPending ? "Generating…" : "Generate"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {generated && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{generated.length} generated questions</p>
            <Button size="sm" onClick={saveAll} disabled={saved}>
              {saved ? "Saved" : "Save all to question bank"}
            </Button>
          </div>

          {batchAttempts.length > 0 && (
            <Card className="border-primary/30 bg-primary/[0.03]">
              <CardContent className="pt-5 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <Gauge className="size-4 text-primary" /> Effort check
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {batchAttempts.length} of {generated.length} answered
                  </span>
                </div>
                <Progress value={(batchAttempts.length / generated.length) * 100} className="h-1.5" />
                <p className="text-sm text-muted-foreground">{effort.verdict}</p>
              </CardContent>
            </Card>
          )}

          {generated.map((q, i) => (
            <QuestionCard
              key={i}
              question={q.question}
              options={q.options}
              correctAnswer={q.correctAnswer}
              explanation={q.explanation}
              difficulty={q.difficulty}
              badge={
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  <Sparkles className="size-3 mr-1" /> AI Generated
                </Badge>
              }
              onAttempt={(isCorrect) => setBatchAttempts((prev) => [...prev, { isCorrect, difficulty: q.difficulty }])}
            />
          ))}
        </div>
      )}

      <div className="space-y-3">
        <p className="text-sm font-medium">Saved question bank ({savedQuestions.length})</p>
        {savedQuestions.length === 0 && (
          <p className="text-sm text-muted-foreground">No saved questions for this topic yet.</p>
        )}
        {savedQuestions.map((q) => (
          <QuestionCard
            key={q.id}
            question={q.questionText}
            options={Array.isArray(q.options) ? (q.options as string[]) : undefined}
            correctAnswer={q.correctAnswer}
            explanation={q.explanation}
            difficulty={q.difficulty}
            badge={
              <Badge variant="outline">{q.source === "AI_GENERATED" ? "AI Generated" : q.source === "PYQ_METADATA" ? "PYQ" : "User Created"}</Badge>
            }
            onAttempt={(isCorrect) => recordAttemptAction({ questionId: q.id, isCorrect })}
          />
        ))}
      </div>
    </div>
  );
}

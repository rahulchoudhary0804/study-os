"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { explainAction } from "@/server/actions/ai";
import { Bot, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { AIContent } from "@/components/ai/ai-content";
import { setRobotState } from "@/components/study-robot/robot-store";

type Mode = "default" | "simple" | "hinglish" | "hint";
interface Msg {
  role: "USER" | "ASSISTANT";
  content: string;
  followUps?: string[];
}

const MODES: { value: Mode; label: string }[] = [
  { value: "default", label: "Explain" },
  { value: "simple", label: "Explain Simply" },
  { value: "hinglish", label: "Hinglish" },
  { value: "hint", label: "Give Hint" },
];

export function AIChatTab({ topicId }: { topicId?: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("default");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, isPending]);

  function send(message: string) {
    if (!message.trim() || isPending) return;
    setMessages((m) => [...m, { role: "USER", content: message }]);
    setInput("");
    setRobotState("thinking", { duration: 0 });
    startTransition(async () => {
      try {
        const result = await explainAction({ topicId, message, mode, conversationId });
        if (!result) return;
        setConversationId(result.conversationId);
        setRobotState("happy", { message: null, duration: 1800 });
        setMessages((m) => [...m, { role: "ASSISTANT", content: result.answer, followUps: result.followUpSuggestions }]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "AI_FAILED";
        setRobotState("confused", { message: null, duration: 2000 });
        toast.error(
          msg.includes("AI_NOT_CONFIGURED")
            ? "AI isn't configured — add GEMINI_API_KEY."
            : msg.includes("RATE_LIMITED")
            ? "Too many questions in a minute — wait a moment and ask again."
            : "The assistant couldn't respond — please ask again."
        );
        setMessages((m) => m.slice(0, -1));
        setInput(message);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {MODES.map((m) => (
          <Button key={m.value} size="sm" variant={mode === m.value ? "default" : "outline"} onClick={() => setMode(m.value)}>
            {m.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent ref={scrollRef} className="pt-6 space-y-4 min-h-[240px] max-h-[60vh] overflow-y-auto overscroll-contain">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {topicId ? "Ask anything about this topic" : "Ask any doubt"} — and keep asking follow-ups in the same chat.
              For problem-solving I&apos;ll give a hint first unless you ask for the full solution.
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={cn("flex gap-2.5", m.role === "USER" && "justify-end")}>
              {m.role === "ASSISTANT" && (
                <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="size-4 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "rounded-lg px-3.5 py-2.5 text-sm max-w-[80%]",
                  m.role === "USER" ? "bg-primary text-primary-foreground whitespace-pre-wrap" : "bg-muted"
                )}
              >
                {m.role === "ASSISTANT" ? <AIContent text={m.content} /> : m.content}
                {m.followUps && m.followUps.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.followUps.map((f, j) => (
                      <button
                        key={j}
                        onClick={() => send(f)}
                        className="text-xs rounded-full border px-2.5 py-1 hover:bg-background/60"
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {m.role === "USER" && (
                <div className="size-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="size-4" />
                </div>
              )}
            </div>
          ))}
          {isPending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="size-3.5 animate-pulse" /> Thinking…
            </div>
          )}
        </CardContent>
      </Card>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2"
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={messages.length ? "Ask a follow-up question…" : "Ask a question…"}
          className="min-h-10 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        <Button type="submit" disabled={isPending || !input.trim()}>
          Send
        </Button>
      </form>
      <Badge variant="secondary" className="bg-primary/10 text-primary">
        <Sparkles className="size-3 mr-1" /> AI Generated responses
      </Badge>
    </div>
  );
}

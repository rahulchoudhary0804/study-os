"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown } from "lucide-react";
import { toast } from "sonner";

interface Option {
  id: string;
  name: string;
}

const SCOPES = [
  { value: "exam", label: "Full Exam Guide (JEE Main or RBSE)" },
  { value: "subject", label: "Subject Guide" },
  { value: "chapter", label: "Chapter Guide" },
  { value: "topic", label: "Topic Notes (from your saved AI notes)" },
  { value: "weak-topics", label: "Weak Topic Report" },
  { value: "weekly-report", label: "Weekly Study Report" },
] as const;

type Scope = (typeof SCOPES)[number]["value"];

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  return res.json();
}

/**
 * Fallback when the server can't render a PDF (e.g. headless Chrome is
 * unavailable on the host): load the same print-ready HTML into a hidden
 * iframe and open the browser's print dialog, where "Save as PDF" produces
 * the identical document.
 */
function printHtml(html: string) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();
  const go = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => iframe.remove(), 60_000);
  };
  if (doc.readyState === "complete") setTimeout(go, 300);
  else iframe.onload = () => setTimeout(go, 300);
}

export function ExportForm({ exams }: { exams: Option[] }) {
  const [scope, setScope] = useState<Scope>("exam");
  const [examId, setExamId] = useState(exams[0]?.id ?? "");
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [chapters, setChapters] = useState<Option[]>([]);
  const [chapterId, setChapterId] = useState("");
  const [topics, setTopics] = useState<Option[]>([]);
  const [topicId, setTopicId] = useState("");
  const [isPending, startTransition] = useTransition();

  // Each level resets (and pre-selects the first option of) the level below it,
  // so a stale subject/chapter from a different exam can never be exported.
  useEffect(() => {
    if (!examId || (scope !== "subject" && scope !== "chapter" && scope !== "topic")) return;
    fetchJson<Option[]>(`/api/pdf/options?type=subjects&examId=${examId}`).then((list) => {
      setSubjects(list);
      setSubjectId(list[0]?.id ?? "");
    });
  }, [examId, scope]);

  useEffect(() => {
    if (!subjectId || (scope !== "chapter" && scope !== "topic")) return;
    fetchJson<Option[]>(`/api/pdf/options?type=chapters&subjectId=${subjectId}`).then((list) => {
      setChapters(list);
      setChapterId(list[0]?.id ?? "");
    });
  }, [subjectId, scope]);

  useEffect(() => {
    if (!chapterId || scope !== "topic") return;
    fetchJson<Option[]>(`/api/pdf/options?type=topics&chapterId=${chapterId}`).then((list) => {
      setTopics(list);
      setTopicId(list[0]?.id ?? "");
    });
  }, [chapterId, scope]);

  function idForScope(): string | undefined {
    if (scope === "exam") return examId;
    if (scope === "subject") return subjectId;
    if (scope === "chapter") return chapterId;
    if (scope === "topic") return topicId;
    return undefined;
  }

  function download() {
    startTransition(async () => {
      const id = idForScope();
      if ((scope === "exam" || scope === "subject" || scope === "chapter" || scope === "topic") && !id) {
        toast.error("Pick everything needed first");
        return;
      }
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, id }),
      }).catch(() => null);
      if (!res || !res.ok || !res.headers.get("Content-Type")?.includes("application/pdf")) {
        const htmlRes = await fetch("/api/pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scope, id, format: "html" }),
        }).catch(() => null);
        if (!htmlRes?.ok) {
          toast.error("PDF generation failed — please try again.");
          return;
        }
        printHtml(await htmlRes.text());
        toast.success('Print dialog opened — choose "Save as PDF" to download.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const filename = res.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") || "export.pdf";
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Revoking synchronously can cancel the download in some mobile browsers.
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      toast.success("PDF downloaded");
    });
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="text-base">Export</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>What do you want to export?</Label>
          <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCOPES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(scope === "exam" || scope === "subject" || scope === "chapter" || scope === "topic") && (
          <div className="space-y-1.5">
            <Label>Exam</Label>
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
              </SelectContent>
            </Select>
          </div>
        )}

        {(scope === "subject" || scope === "chapter" || scope === "topic") && subjects.length > 0 && (
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {(scope === "chapter" || scope === "topic") && chapters.length > 0 && (
          <div className="space-y-1.5">
            <Label>Chapter</Label>
            <Select value={chapterId} onValueChange={setChapterId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a chapter" />
              </SelectTrigger>
              <SelectContent>
                {chapters.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {scope === "topic" && topics.length > 0 && (
          <div className="space-y-1.5">
            <Label>Topic</Label>
            <Select value={topicId} onValueChange={setTopicId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a topic" />
              </SelectTrigger>
              <SelectContent>
                {topics.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button onClick={download} disabled={isPending}>
          <FileDown className="size-4 mr-1.5" /> {isPending ? "Generating…" : "Download PDF"}
        </Button>
      </CardContent>
    </Card>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getSyllabusTree } from "@/server/queries/syllabus";
import { PublicShell, FaqSection, faqLd } from "@/components/marketing/public-shell";
import { APP_LD, HOME_FAQ, jsonLd, ORGANIZATION_LD, SITE_NAME, WEBSITE_LD } from "@/lib/seo";
import { PriorityBadge } from "@/components/priority-badge";
import { StudyRobot } from "@/components/study-robot/study-robot";
import {
  BrainCircuit,
  Flame,
  Target,
  LineChart,
  RefreshCw,
  FileDown,
  BookOpen,
  MessageCircle,
  Smartphone,
  CalendarCheck,
} from "lucide-react";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const tree = await getSyllabusTree().catch(() => []);
  const snapshot = tree.map((exam) => ({
    exam,
    subjects: exam.subjects
      .filter((s) => ["physics", "chemistry", "mathematics"].includes(s.slug))
      .map((s) => ({ ...s, top: s.chapters.filter((c) => c.priority === 1).slice(0, 4) })),
  }));

  return (
    <PublicShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({ "@context": "https://schema.org", "@graph": [ORGANIZATION_LD, WEBSITE_LD, APP_LD, faqLd(HOME_FAQ)] }),
        }}
      />

      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-14 pb-12 grid gap-8 md:grid-cols-[1fr_auto] items-center">
        <div>
          <p className="text-sm font-medium text-primary mb-3">Free AI study planner · JEE Main 2027 · RBSE Class 12</p>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-tight">
            {SITE_NAME}: smart padhai for JEE Main 2027 &amp; RBSE Class 12 boards
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
            Know which chapter to study first. Every Physics, Chemistry and Maths chapter ranked by marks and question
            weightage — with daily study plans, AI practice questions, AI doubt solving (Hinglish too), NCERT PDFs,
            revision reminders and progress tracking.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/signup">Start studying free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/syllabus">See priority-wise syllabus</Link>
            </Button>
            <Button size="lg" variant="ghost" asChild>
              <a href="/downloads/smart-padhai.apk" download="SmartPadhai.apk">
                <Smartphone className="size-4" /> Android app
              </a>
            </Button>
          </div>
        </div>
        <div className="hidden md:flex justify-center">
          <StudyRobot state="waving" size={200} />
        </div>
      </section>

      {snapshot.map(({ exam, subjects }) => (
        <section key={exam.id} className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
          <h2 className="text-2xl font-semibold tracking-tight">
            {exam.slug === "jee-main" ? "JEE Main 2027 high-weightage chapters" : "RBSE Class 12 2026-27 highest-marks chapters"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {exam.slug === "jee-main"
              ? "Expected questions per paper (25 per subject, 4 marks each), from 2024–2026 papers."
              : "Official chapter-wise marks from the RBSE 2026–27 syllabus."}{" "}
            <Link href={`/syllabus/${exam.slug}`} className="text-primary font-medium hover:underline">
              Full {exam.name} syllabus →
            </Link>
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {subjects.map((s) => (
              <Card key={s.id}>
                <CardContent className="pt-5">
                  <h3 className="font-semibold">
                    <Link href={`/syllabus/${exam.slug}/${s.slug}`} className="hover:underline">
                      {exam.slug === "jee-main" ? "JEE Main" : "RBSE 12th"} {s.name}
                    </Link>
                  </h3>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {s.top.map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-2">
                        <span>{c.name}</span>
                        <span className="shrink-0 text-xs font-semibold">{c.weightage}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3">
                    <PriorityBadge priority={1} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}

      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <h2 className="text-2xl font-semibold tracking-tight mb-4">Everything you need for smart padhai</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <CardContent className="pt-6">
                <f.icon className="size-5 text-primary mb-3" />
                <h3 className="font-medium mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <FaqSection faqs={HOME_FAQ} />
    </PublicShell>
  );
}

const FEATURES = [
  { icon: Target, title: "Priority-wise syllabus", desc: "RBSE chapters ranked by official 2026–27 marks, JEE Main chapters by questions per paper — study what scores first." },
  { icon: CalendarCheck, title: "Today's Plan", desc: "Tick chapters and topics subject-by-subject to build your day, swap topics anytime, or let the AI Planner schedule you to exam day." },
  { icon: MessageCircle, title: "AI doubt solver", desc: "Ask follow-up questions on any topic — in English or Hinglish — with step-by-step hints before full solutions." },
  { icon: BrainCircuit, title: "AI practice questions & notes", desc: "JEE-style MCQs/numericals and board-style questions with properly rendered formulas, plus crisp AI notes." },
  { icon: BookOpen, title: "NCERT PDF for every topic", desc: "Each topic opens the exact NCERT chapter it comes from — Class 11 and Class 12." },
  { icon: RefreshCw, title: "Spaced revision", desc: "Revision reminders that adapt to how well you know each topic." },
  { icon: LineChart, title: "Progress analytics", desc: "Accuracy, study time and weak topics tracked per chapter and subject." },
  { icon: Flame, title: "Streaks & study buddy", desc: "Honest daily streaks and a friendly robot that cheers you on." },
  { icon: FileDown, title: "PDF export", desc: "Download chapter guides, subject guides and weekly reports as PDFs." },
];

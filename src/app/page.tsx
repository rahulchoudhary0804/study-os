import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BrainCircuit, Flame, Target, LineChart, RefreshCw, FileDown } from "lucide-react";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <span className="font-semibold tracking-tight text-lg">Study OS</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 pt-20 pb-16 text-center">
          <p className="text-sm font-medium text-muted-foreground mb-4">
            For RBSE Class 12 students preparing for JEE Main
          </p>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
            Your personal AI study operating system.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">Plan. Study. Practice. Improve.</p>
          <p className="mt-6 text-sm text-muted-foreground max-w-xl mx-auto">
            One priority-ranked syllabus, real progress tracking, spaced-repetition revision, and
            AI that actually knows what you&apos;ve studied — not another generic checklist app.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/signup">Start studying free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">I already have an account</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="border-muted">
              <CardContent className="pt-6">
                <f.icon className="size-5 text-primary mb-3" />
                <h3 className="font-medium mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Study OS — JEE Main + RBSE Class 12
      </footer>
    </div>
  );
}

const FEATURES = [
  { icon: Target, title: "Priority-ranked syllabus", desc: "Every chapter and topic pre-tagged by priority, sourced from cross-checked syllabus research — not guesswork." },
  { icon: RefreshCw, title: "Adaptive revision engine", desc: "Spaced repetition that speeds up when you're struggling and backs off when you've mastered a topic." },
  { icon: LineChart, title: "Real analytics", desc: "Accuracy, study time and completion tracked per topic, chapter and subject — from your actual sessions." },
  { icon: Flame, title: "Honest streaks", desc: "A day only counts when you actually studied past your own configured minimum — not just opening the app." },
  { icon: BrainCircuit, title: "AI that knows your data", desc: "Notes, questions and study plans generated from your real progress, weak topics and revision backlog." },
  { icon: FileDown, title: "Professional PDF export", desc: "Turn any chapter, topic or weekly report into a print-ready PDF, formula sheet or revision sheet." },
];

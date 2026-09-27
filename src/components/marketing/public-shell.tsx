import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE_NAME } from "@/lib/seo";

/** Header + footer for logged-out, indexable pages (landing, /syllabus). */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b-2 border-border bg-background/95 sticky top-0 z-30">
        <div className="mx-auto max-w-6xl flex items-center gap-3 px-4 sm:px-6 py-3">
          <Link href="/" className="flex items-center gap-2 mr-auto">
            <span className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 text-primary-foreground border-2 border-border shadow-nb-sm">
              <GraduationCap className="size-4.5" />
            </span>
            <span className="font-semibold tracking-tight text-lg">{SITE_NAME}</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            <Link href="/syllabus/jee-main" className="px-2.5 py-1.5 rounded-md hover:bg-muted">JEE Main 2027</Link>
            <Link href="/syllabus/rbse-class-12" className="px-2.5 py-1.5 rounded-md hover:bg-muted">RBSE Class 12</Link>
          </nav>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/signup">Start free</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t-2 border-border py-8 text-sm text-muted-foreground">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 grid gap-6 sm:grid-cols-3">
          <div>
            <p className="font-semibold text-foreground">{SITE_NAME}</p>
            <p className="mt-1 text-xs">Free AI study planner for JEE Main 2027 and RBSE Class 12 board exam.</p>
          </div>
          <div className="space-y-1.5">
            <p className="font-medium text-foreground">JEE Main 2027 syllabus</p>
            <Link className="block hover:underline" href="/syllabus/jee-main/physics">Physics chapter-wise weightage</Link>
            <Link className="block hover:underline" href="/syllabus/jee-main/chemistry">Chemistry chapter-wise weightage</Link>
            <Link className="block hover:underline" href="/syllabus/jee-main/mathematics">Maths chapter-wise weightage</Link>
          </div>
          <div className="space-y-1.5">
            <p className="font-medium text-foreground">RBSE Class 12 syllabus 2026-27</p>
            <Link className="block hover:underline" href="/syllabus/rbse-class-12/physics">Physics chapter-wise marks</Link>
            <Link className="block hover:underline" href="/syllabus/rbse-class-12/chemistry">Chemistry chapter-wise marks</Link>
            <Link className="block hover:underline" href="/syllabus/rbse-class-12/mathematics">Maths chapter-wise marks</Link>
          </div>
        </div>
        <p className="mx-auto max-w-6xl px-4 sm:px-6 mt-6 text-xs">
          © {new Date().getFullYear()} {SITE_NAME}. RBSE marks follow the official 2026–27 syllabus; JEE Main weightage is
          based on past-paper trends (NTA does not publish chapter weightage).
        </p>
      </footer>
    </div>
  );
}

export function FaqSection({ faqs, title = "Frequently asked questions" }: { faqs: { q: string; a: string }[]; title?: string }) {
  return (
    <section className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <h2 className="text-2xl font-semibold tracking-tight mb-4">{title}</h2>
      <div className="space-y-2">
        {faqs.map((f) => (
          <details key={f.q} className="group rounded-lg border-2 border-border bg-card px-4 py-3">
            <summary className="cursor-pointer font-medium list-none flex justify-between gap-3">
              <h3 className="text-base">{f.q}</h3>
              <span className="text-muted-foreground group-open:rotate-45 transition-transform">+</span>
            </summary>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function faqLd(faqs: { q: string; a: string }[]) {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicSubjectSyllabus, loadSyllabusTree } from "@/server/queries/syllabus";
import { EXAM_INFO, PRIORITY_LABEL } from "../../exam-info";
import { PriorityBadge } from "@/components/priority-badge";
import { FaqSection, faqLd } from "@/components/marketing/public-shell";
import { Button } from "@/components/ui/button";
import { jsonLd, SITE_URL } from "@/lib/seo";
import { BookOpen } from "lucide-react";

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const tree = await loadSyllabusTree();
    return tree.flatMap((e) => e.subjects.map((s) => ({ examSlug: e.slug, subjectSlug: s.slug })));
  } catch {
    return [];
  }
}

type Params = Promise<{ examSlug: string; subjectSlug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { examSlug, subjectSlug } = await params;
  const data = await getPublicSubjectSyllabus(examSlug, subjectSlug).catch(() => null);
  const info = EXAM_INFO[examSlug];
  if (!data || !info) return {};
  const what = info.unit === "marks" ? "Chapter-wise Marks" : "Chapter-wise Weightage";
  const top = data.chapters.slice(0, 4).map((c) => c.name).join(", ");
  return {
    title: `${info.short} ${data.subjectName} Syllabus ${info.year} — ${what} & Important Topics`,
    description: `${info.short} ${data.subjectName} ${info.year}: all ${data.chapters.length} chapters ranked by priority with ${
      info.unit === "marks" ? "marks" : "expected questions"
    }, important topics and NCERT PDFs. Top chapters: ${top}.`,
    alternates: { canonical: `/syllabus/${examSlug}/${subjectSlug}` },
    openGraph: { url: `${SITE_URL}/syllabus/${examSlug}/${subjectSlug}` },
  };
}

export default async function SubjectSyllabusPage({ params }: { params: Params }) {
  const { examSlug, subjectSlug } = await params;
  const data = await getPublicSubjectSyllabus(examSlug, subjectSlug);
  const info = EXAM_INFO[examSlug];
  if (!data || !info) notFound();

  const label = `${info.short} ${data.subjectName}`;
  const byPriority = [1, 2, 3, 4].map((p) => data.chapters.filter((c) => c.priority === p));
  const heaviest = [...data.chapters]
    .filter((c) => c.weightage)
    .sort((a, b) => (parseFloat(b.weightage!.replace(/[^\d.]/g, "")) || 0) - (parseFloat(a.weightage!.replace(/[^\d.]/g, "")) || 0))
    .slice(0, 5);

  const faqs = [
    heaviest.length > 0 && {
      q: `Which chapter has the highest ${info.unit === "marks" ? "marks" : "weightage"} in ${label}?`,
      a: `${heaviest.map((c) => `${c.name} (${c.weightage})`).join(", ")}.`,
    },
    {
      q: `How many chapters are in the ${label} syllabus ${info.year}?`,
      a: `${data.chapters.length} chapters: ${byPriority[0].length} Priority 1, ${byPriority[1].length} Priority 2, ${byPriority[2].length} Priority 3 and ${byPriority[3].length} Priority 4.`,
    },
    {
      q: `Which ${label} chapters should I study first?`,
      a: `Start with the Priority 1 chapters: ${byPriority[0].map((c) => c.name).join(", ")}.`,
    },
  ].filter(Boolean) as { q: string; a: string }[];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "ItemList",
                name: `${label} syllabus ${info.year} — chapters by priority`,
                itemListOrder: "https://schema.org/ItemListOrderAscending",
                numberOfItems: data.chapters.length,
                itemListElement: data.chapters.map((c, i) => ({
                  "@type": "ListItem",
                  position: i + 1,
                  name: `${c.name}${c.weightage ? ` — ${c.weightage}` : ""} (Priority ${c.priority})`,
                  url: `${SITE_URL}/syllabus/${examSlug}/${subjectSlug}#${c.slug}`,
                })),
              },
              faqLd(faqs),
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
                  { "@type": "ListItem", position: 2, name: "Syllabus", item: `${SITE_URL}/syllabus` },
                  { "@type": "ListItem", position: 3, name: info.title, item: `${SITE_URL}/syllabus/${examSlug}` },
                  { "@type": "ListItem", position: 4, name: data.subjectName, item: `${SITE_URL}/syllabus/${examSlug}/${subjectSlug}` },
                ],
              },
            ],
          }),
        }}
      />

      <section className="mx-auto max-w-5xl px-4 sm:px-6 pt-10 pb-4">
        <nav className="text-xs text-muted-foreground mb-3">
          <Link href="/" className="hover:underline">Home</Link> / <Link href="/syllabus" className="hover:underline">Syllabus</Link> /{" "}
          <Link href={`/syllabus/${examSlug}`} className="hover:underline">{info.short}</Link> / {data.subjectName}
        </nav>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          {label} Syllabus {info.year} — {info.unit === "marks" ? "Chapter-wise Marks" : "Chapter-wise Weightage"} &amp; Important Topics
        </h1>
        <p className="mt-3 text-muted-foreground max-w-3xl">
          All {data.chapters.length} {data.subjectName} chapters for {info.short} {info.year}, ranked by priority. Each shows its{" "}
          {info.unit === "marks" ? "official marks" : "expected number of questions per paper"}, why it matters, the topics to
          prepare and the NCERT chapter PDF.
        </p>
        <Button asChild className="mt-5">
          <Link href="/signup">Track my {data.subjectName} progress — free</Link>
        </Button>
      </section>

      {byPriority.map(
        (chapters, i) =>
          chapters.length > 0 && (
            <section key={i} className="mx-auto max-w-5xl px-4 sm:px-6 py-4">
              <h2 className="text-xl font-semibold mb-3">{PRIORITY_LABEL[i + 1]}</h2>
              <div className="space-y-4">
                {chapters.map((c) => (
                  <article key={c.slug} id={c.slug} className="scroll-mt-20 rounded-xl border-2 border-border bg-card p-4 sm:p-5 shadow-nb-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold mr-auto">{c.name}</h3>
                      {c.weightage && (
                        <span className="rounded-full bg-primary text-primary-foreground px-2.5 py-0.5 text-xs font-semibold">{c.weightage}</span>
                      )}
                      <PriorityBadge priority={c.priority} />
                    </div>
                    {c.importance && <p className="text-sm text-muted-foreground mt-2">{c.importance}</p>}

                    <h4 className="text-sm font-medium mt-3">Important topics</h4>
                    <ul className="mt-1 grid gap-x-6 gap-y-1 sm:grid-cols-2 text-sm">
                      {c.topics.map((t) => (
                        <li key={t.name} className="flex gap-2">
                          <span className="text-xs font-semibold text-muted-foreground w-6 shrink-0">P{t.priority}</span>
                          <span>{t.name}</span>
                        </li>
                      ))}
                    </ul>

                    {c.questionPatterns.length > 0 && (
                      <>
                        <h4 className="text-sm font-medium mt-3">
                          {info.unit === "marks" ? "Important derivations & questions" : "Question patterns to practise"}
                        </h4>
                        <ul className="mt-1 list-disc pl-5 text-sm space-y-0.5 text-muted-foreground">
                          {c.questionPatterns.slice(0, 4).map((q) => (
                            <li key={q}>{q}</li>
                          ))}
                        </ul>
                      </>
                    )}

                    {c.ncertLinks.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {c.ncertLinks.map((l) => (
                          <a
                            key={l.url}
                            href={l.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-md border-2 border-border px-2.5 py-1 text-xs font-medium hover:bg-muted"
                          >
                            <BookOpen className="size-3.5 text-blue-500" /> NCERT PDF: {l.title}
                          </a>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )
      )}

      <FaqSection faqs={faqs} title={`${label} — frequently asked questions`} />
    </>
  );
}

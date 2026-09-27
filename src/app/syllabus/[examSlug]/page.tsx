import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadSyllabusTree } from "@/server/queries/syllabus";
import { EXAM_INFO } from "../exam-info";
import { PriorityBadge } from "@/components/priority-badge";
import { FaqSection, faqLd } from "@/components/marketing/public-shell";
import { Button } from "@/components/ui/button";
import { jsonLd, SITE_NAME, SITE_URL } from "@/lib/seo";

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    return (await loadSyllabusTree()).map((e) => ({ examSlug: e.slug }));
  } catch {
    return [];
  }
}

async function getExam(examSlug: string) {
  const tree = await loadSyllabusTree();
  return tree.find((e) => e.slug === examSlug) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ examSlug: string }> }): Promise<Metadata> {
  const { examSlug } = await params;
  const info = EXAM_INFO[examSlug];
  if (!info) return {};
  const what = info.unit === "marks" ? "Chapter-wise Marks" : "Chapter-wise Weightage";
  return {
    title: `${info.title} — ${what}, Priority & Important Topics`,
    description: `${info.intro} Physics, Chemistry and Maths.`,
    alternates: { canonical: `/syllabus/${examSlug}` },
    openGraph: { title: `${info.title} — ${what}`, url: `${SITE_URL}/syllabus/${examSlug}` },
  };
}

export default async function ExamSyllabusPage({ params }: { params: Promise<{ examSlug: string }> }) {
  const { examSlug } = await params;
  const exam = await getExam(examSlug);
  const info = EXAM_INFO[examSlug];
  if (!exam || !info) notFound();

  const science = exam.subjects.filter((s) => ["physics", "chemistry", "mathematics"].includes(s.slug));
  const faqs = science.map((s) => {
    const top = s.chapters.filter((c) => c.priority === 1).slice(0, 6);
    return {
      q: `Which ${info.short} ${s.name} chapters are most important?`,
      a: `Priority 1 ${s.name} chapters for ${info.short} ${info.year}: ${top
        .map((c) => `${c.name}${c.weightage ? ` (${c.weightage})` : ""}`)
        .join(", ")}. Start with these, then cover Priority 2 and 3 chapters.`,
    };
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Course",
                name: `${info.title} — ${info.short} Physics, Chemistry & Maths`,
                description: info.intro,
                url: `${SITE_URL}/syllabus/${examSlug}`,
                provider: { "@type": "Organization", name: SITE_NAME, sameAs: SITE_URL },
                educationalLevel: "Class 12",
                inLanguage: "en-IN",
                isAccessibleForFree: true,
                hasCourseInstance: { "@type": "CourseInstance", courseMode: "online", courseWorkload: "PT2H" },
                offers: { "@type": "Offer", price: "0", priceCurrency: "INR", category: "Free" },
              },
              faqLd(faqs),
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
                  { "@type": "ListItem", position: 2, name: "Syllabus", item: `${SITE_URL}/syllabus` },
                  { "@type": "ListItem", position: 3, name: info.title, item: `${SITE_URL}/syllabus/${examSlug}` },
                ],
              },
            ],
          }),
        }}
      />

      <section className="mx-auto max-w-5xl px-4 sm:px-6 pt-10 pb-4">
        <nav className="text-xs text-muted-foreground mb-3">
          <Link href="/" className="hover:underline">Home</Link> / <Link href="/syllabus" className="hover:underline">Syllabus</Link> / {info.short}
        </nav>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          {info.title}: {info.unit === "marks" ? "Chapter-wise Marks" : "Chapter-wise Weightage"} &amp; Priority
        </h1>
        <p className="mt-3 text-muted-foreground max-w-3xl">{info.intro}</p>
        <ul className="mt-4 list-disc pl-5 text-sm space-y-1">
          {info.pattern.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/signup">Make my {info.short} study plan — free</Link>
          </Button>
        </div>
      </section>

      {exam.subjects.map((s) => (
        <section key={s.id} className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
          <div className="flex items-end justify-between gap-3 mb-3">
            <h2 className="text-2xl font-semibold tracking-tight">
              {info.short} {s.name} {info.unit === "marks" ? "Chapter-wise Marks" : "Chapter-wise Weightage"}
            </h2>
            <Link href={`/syllabus/${examSlug}/${s.slug}`} className="text-sm font-medium text-primary hover:underline shrink-0">
              Topics &amp; details →
            </Link>
          </div>
          <div className="overflow-x-auto rounded-xl border-2 border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Chapter</th>
                  <th className="px-3 py-2 font-medium">{info.unit === "marks" ? "Marks" : "Questions / paper"}</th>
                  <th className="px-3 py-2 font-medium">Priority</th>
                  <th className="px-3 py-2 font-medium hidden sm:table-cell">Topics</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {s.chapters.map((c) => (
                  <tr key={c.id}>
                    <td className="px-3 py-2">
                      <Link href={`/syllabus/${examSlug}/${s.slug}#${c.slug}`} className="hover:underline font-medium">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{c.weightage ?? "—"}</td>
                    <td className="px-3 py-2">
                      <PriorityBadge priority={c.priority} />
                    </td>
                    <td className="px-3 py-2 hidden sm:table-cell text-muted-foreground">{c.topics.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {faqs.length > 0 && <FaqSection faqs={faqs} title={`${info.short} — frequently asked questions`} />}
    </>
  );
}

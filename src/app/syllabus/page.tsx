import type { Metadata } from "next";
import Link from "next/link";
import { loadSyllabusTree } from "@/server/queries/syllabus";
import { EXAM_INFO } from "./exam-info";
import { FaqSection, faqLd } from "@/components/marketing/public-shell";
import { jsonLd, SITE_URL } from "@/lib/seo";
import { ArrowRight } from "lucide-react";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "JEE Main 2027 & RBSE Class 12 Syllabus — Chapter-wise Marks & Priority",
  description:
    "Priority-wise JEE Main 2027 and RBSE Class 12 (2026-27) syllabus for Physics, Chemistry and Maths — chapter-wise marks, question weightage, important topics and NCERT PDFs.",
  alternates: { canonical: "/syllabus" },
};

const FAQS = [
  {
    q: "How is chapter priority decided?",
    a: "RBSE chapters are ranked by their official 2026–27 syllabus marks and repeated board question formats. JEE Main chapters are ranked by how many questions they get per paper in 2024–2026 (≥2 questions → Priority 1). Priority tells you what to study first — not what to skip.",
  },
  {
    q: "Does the RBSE Class 12 Chemistry syllabus include Solid State, Polymers or p-Block?",
    a: "No. The rationalised 2026–27 RBSE Class 12 Chemistry syllabus has 10 chapters: Solutions, Electrochemistry, Chemical Kinetics, d- and f-Block, Coordination Compounds, Haloalkanes & Haloarenes, Alcohols-Phenols-Ethers, Aldehydes-Ketones-Carboxylic Acids, Amines and Biomolecules.",
  },
  {
    q: "Where can I get the NCERT PDF of each chapter?",
    a: "Every chapter on these pages links to its official NCERT chapter PDF (ncert.nic.in), including Class 11 chapters for JEE Main.",
  },
];

export default async function SyllabusHub() {
  const tree = await loadSyllabusTree().catch(() => []);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@graph": [
              faqLd(FAQS),
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
                  { "@type": "ListItem", position: 2, name: "Syllabus", item: `${SITE_URL}/syllabus` },
                ],
              },
            ],
          }),
        }}
      />
      <section className="mx-auto max-w-5xl px-4 sm:px-6 pt-12 pb-6">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          JEE Main 2027 &amp; RBSE Class 12 Syllabus — Chapter-wise Marks &amp; Priority
        </h1>
        <p className="mt-3 text-muted-foreground max-w-3xl">
          Know exactly which chapters to study first. Every Physics, Chemistry and Maths chapter is ranked by priority,
          with its marks (RBSE) or expected number of questions (JEE Main), important topics and the NCERT chapter PDF.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-4 sm:px-6 grid gap-5 md:grid-cols-2">
        {tree.map((exam) => {
          const info = EXAM_INFO[exam.slug];
          return (
            <div key={exam.id} className="rounded-xl border-2 border-border bg-card p-5 shadow-nb">
              <h2 className="text-xl font-semibold">
                <Link href={`/syllabus/${exam.slug}`} className="hover:underline">
                  {info?.title ?? exam.name}
                </Link>
              </h2>
              <p className="text-sm text-muted-foreground mt-1">{info?.intro}</p>
              <ul className="mt-4 space-y-1.5">
                {exam.subjects.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/syllabus/${exam.slug}/${s.slug}`}
                      className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted text-sm"
                    >
                      <span>
                        {info?.short ?? exam.name} {s.name} — {s.chapters.length} chapters
                      </span>
                      <ArrowRight className="size-4 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      <FaqSection faqs={FAQS} />
    </>
  );
}

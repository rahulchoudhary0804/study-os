/**
 * Reconciles the seeded RBSE data against an independently-sourced reference
 * (a 2026-27 RBSE blueprint transcription the user provided) that supplied
 * specific per-chapter mark numbers. Two concrete, high-confidence fixes:
 *
 * 1. RBSE Mathematics was missing "Inverse Trigonometric Functions" as its
 *    own chapter (it had been folded into "Relations and Functions").
 * 2. RBSE Physics priorities are realigned to match the reference's
 *    mark-based tiers (which are more specific than the PYQ-trend estimate
 *    used originally) — still labeled as unverified/reference-sourced, not
 *    officially confirmed.
 */
require("dotenv").config({ path: ".env.local" });
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const PHYSICS_PRIORITY_UPDATES = {
  "Electric Charges and Fields": { priority: 1, marks: "4 marks (per an independently-sourced 2026-27 RBSE blueprint reference — not officially confirmed)" },
  "Moving Charges and Magnetism": { priority: 1, marks: "5 marks (per an independently-sourced 2026-27 RBSE blueprint reference — not officially confirmed)" },
  "Electromagnetic Induction": { priority: 1, marks: "4 marks (per an independently-sourced 2026-27 RBSE blueprint reference — not officially confirmed)" },
  "Alternating Current": { priority: 1, marks: "5 marks (per an independently-sourced 2026-27 RBSE blueprint reference — not officially confirmed)" },
  "Wave Optics": { priority: 1, marks: "5 marks (per an independently-sourced 2026-27 RBSE blueprint reference — not officially confirmed)" },
  "Semiconductor Electronics": { priority: 1, marks: "6 marks (per an independently-sourced 2026-27 RBSE blueprint reference — not officially confirmed)" },
  "Nuclei": { priority: 3, marks: "2 marks (per an independently-sourced 2026-27 RBSE blueprint reference — not officially confirmed)" },
};

async function main() {
  // Fix 1: add the missing chapter
  const mathSubject = await prisma.subject.findFirst({
    where: { slug: "mathematics", exam: { slug: "rbse-class-12" } },
  });
  const existing = await prisma.chapter.findFirst({
    where: { subjectId: mathSubject.id, slug: "inverse-trigonometric-functions" },
  });
  if (!existing) {
    const maxOrder = await prisma.chapter.aggregate({
      where: { subjectId: mathSubject.id },
      _max: { order: true },
    });
    await prisma.chapter.create({
      data: {
        subjectId: mathSubject.id,
        slug: "inverse-trigonometric-functions",
        name: "Inverse Trigonometric Functions",
        priority: 2,
        order: (maxOrder._max.order ?? 0) + 1,
        importance: "Compact, formula-driven chapter; branch/domain restrictions on principal values are the main source of board mistakes.",
        pyqTrend: {
          freq: "~5 of 80 theory marks (per an independently-sourced 2026-27 RBSE blueprint reference — not officially confirmed).",
          historical: "Recurs as principal-value and identity-proof questions.",
          pattern: "Principal value evaluation, standard identity proofs, domain-restricted equation solving.",
          difficulty: "Moderate.",
        },
        mustKnow: ["Principal value ranges for sin⁻¹, cos⁻¹, tan⁻¹, etc.", "Standard inverse-trig identities and valid domains for applying them."],
        commonMistakes: ["Ignoring principal-value range restrictions.", "Applying an identity outside its valid domain."],
        sourceRef: "Added after cross-checking against an independently-sourced RBSE blueprint reference.",
        ncertLinks: [{ title: "Inverse Trigonometric Functions", url: "https://ncert.nic.in/textbook/pdf/lemh102.pdf" }],
      },
    });
    console.log("Added missing chapter: Inverse Trigonometric Functions");
  } else {
    console.log("Inverse Trigonometric Functions already exists — skipped");
  }

  // Fix note on Relations and Functions — its mark estimate was blended with
  // the now-separated Inverse Trig chapter.
  await prisma.chapter.updateMany({
    where: { name: "Relations and Functions", subject: { exam: { slug: "rbse-class-12" } } },
    data: {
      pyqTrend: {
        freq: "~3 of 80 theory marks (per an independently-sourced 2026-27 RBSE blueprint reference — previously blended with Inverse Trigonometric Functions, now split out).",
        historical: "Stable, foundational unit.",
        pattern: "Equivalence-relation proofs, one-one/onto function checks.",
        difficulty: "Easy-Moderate.",
      },
    },
  });

  // Fix 2: RBSE Physics priority realignment
  let updated = 0;
  for (const [name, { priority, marks }] of Object.entries(PHYSICS_PRIORITY_UPDATES)) {
    const chapter = await prisma.chapter.findFirst({
      where: { name, subject: { slug: "physics", exam: { slug: "rbse-class-12" } } },
    });
    if (!chapter) {
      console.log("NOT FOUND:", name);
      continue;
    }
    const currentPyq = (chapter.pyqTrend && typeof chapter.pyqTrend === "object") ? chapter.pyqTrend : {};
    await prisma.chapter.update({
      where: { id: chapter.id },
      data: {
        priority,
        pyqTrend: { ...currentPyq, freq: marks },
      },
    });
    updated++;
  }
  console.log(`Updated priority on ${updated} RBSE Physics chapters`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/* eslint-disable @typescript-eslint/no-require-imports */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const jee = require("./seed-data/data-jee.js") as {
  PHYSICS: ChapterSeed[];
  CHEM_PHYSICAL: ChapterSeed[];
  CHEM_INORGANIC: ChapterSeed[];
  CHEM_ORGANIC: ChapterSeed[];
  MATH: ChapterSeed[];
};
const rbse = require("./seed-data/data-rbse.js") as {
  PHYSICS: ChapterSeed[];
  CHEMISTRY: ChapterSeed[];
  MATH: ChapterSeed[];
  HINDI_GRAMMAR: string[][];
  HINDI_WRITING: string[][];
  ENGLISH_GRAMMAR: string[][];
  ENGLISH_WRITING: string[][];
};

interface TopicSeed {
  name: string;
  priority: number;
  note: string;
}
interface ChapterSeed {
  name: string;
  priority: number;
  importance: string;
  pyq: { freq: string; historical: string; pattern: string; difficulty: string };
  topics?: TopicSeed[];
  mustKnow?: string[];
  pyqTypes?: string[];
  mistakes?: string[];
  prereq?: string[];
  connected?: string[];
}

const SOURCE_REF =
  "Historical/PYQ-based trend, cross-referenced across coaching-institute sources (Allen, Physics Wallah, esaral, Vedantu, CollegeDekho, Career360, Motion / PW.live, Careers360, CollegeDekho, BoardZone, rbsesolutions.com) as of September 2026. Not an official weightage.";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/['".,()&]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function seedSubjectFromChapters(
  subjectId: string,
  chapters: ChapterSeed[]
) {
  for (let ci = 0; ci < chapters.length; ci++) {
    const c = chapters[ci];
    const chapter = await prisma.chapter.upsert({
      where: { subjectId_slug: { subjectId, slug: slugify(c.name) } },
      update: {},
      create: {
        subjectId,
        slug: slugify(c.name),
        name: c.name,
        priority: c.priority,
        importance: c.importance,
        order: ci,
        sourceRef: SOURCE_REF,
        pyqTrend: c.pyq as unknown as object,
        mustKnow: (c.mustKnow ?? []) as unknown as object,
        questionPatterns: (c.pyqTypes ?? []) as unknown as object,
        commonMistakes: (c.mistakes ?? []) as unknown as object,
        prerequisites: (c.prereq ?? []) as unknown as object,
        connectedChapters: (c.connected ?? []) as unknown as object,
      },
    });

    for (let ti = 0; ti < (c.topics ?? []).length; ti++) {
      const t = c.topics![ti];
      await prisma.topic.upsert({
        where: { chapterId_slug: { chapterId: chapter.id, slug: slugify(t.name) } },
        update: {},
        create: {
          chapterId: chapter.id,
          slug: slugify(t.name),
          name: t.name,
          priority: t.priority,
          description: t.note,
          order: ti,
        },
      });
    }
  }
}

/** For RBSE Hindi/English grammar & writing tables (flat rows, not a full chapter tree). */
function priorityFromBadge(badge: string): number {
  if (badge.includes("P1")) return 1;
  if (badge.includes("P2")) return 2;
  if (badge.includes("P3")) return 3;
  return 4;
}

async function seedLanguageSubject(
  subjectId: string,
  opts: {
    grammarRows: string[][]; // [rank, topic, priorityBadge, pattern, marks]
    writingRows: string[][]; // [format, structure, topics, marks, mistakes]
    literatureNote: string;
  }
) {
  const grammarChapter = await prisma.chapter.upsert({
    where: { subjectId_slug: { subjectId, slug: "grammar" } },
    update: {},
    create: {
      subjectId,
      slug: "grammar",
      name: "Grammar",
      priority: 2,
      importance: "Grammar rules recur every year in a predictable, drillable format — high return on revision time.",
      order: 0,
      sourceRef: SOURCE_REF,
    },
  });
  for (let i = 0; i < opts.grammarRows.length; i++) {
    const [, topic, badge, pattern, marks] = opts.grammarRows[i];
    await prisma.topic.upsert({
      where: { chapterId_slug: { chapterId: grammarChapter.id, slug: slugify(topic) } },
      update: {},
      create: {
        chapterId: grammarChapter.id,
        slug: slugify(topic),
        name: topic,
        priority: priorityFromBadge(badge),
        description: `${pattern} — typical marks: ${marks}`,
        order: i,
      },
    });
  }

  const writingChapter = await prisma.chapter.upsert({
    where: { subjectId_slug: { subjectId, slug: "writing" } },
    update: {},
    create: {
      subjectId,
      slug: "writing",
      name: "Writing",
      priority: 1,
      importance: "Format marks (address/date/subject-line/box) are the easiest to lose and the easiest to secure with practice.",
      order: 1,
      sourceRef: SOURCE_REF,
    },
  });
  for (let i = 0; i < opts.writingRows.length; i++) {
    const [format, structure, topics, marks, mistakes] = opts.writingRows[i];
    await prisma.topic.upsert({
      where: { chapterId_slug: { chapterId: writingChapter.id, slug: slugify(format) } },
      update: {},
      create: {
        chapterId: writingChapter.id,
        slug: slugify(format),
        name: format,
        priority: 1,
        description: `${structure}. Typical topics: ${topics}. Marks: ${marks}.`,
        commonMistakes: [mistakes] as unknown as object,
        order: i,
      },
    });
  }

  await prisma.chapter.upsert({
    where: { subjectId_slug: { subjectId, slug: "literature" } },
    update: {},
    create: {
      subjectId,
      slug: "literature",
      name: "Literature",
      priority: 1,
      description: opts.literatureNote,
      importance:
        "Confirm your exact prescribed textbook/chapter list (see description) before adding individual chapters here via the admin panel — we deliberately did not seed invented chapter names.",
      order: 2,
      sourceRef: SOURCE_REF,
    },
  });
}

async function main() {
  // ---- JEE Main -----------------------------------------------------------
  const jeeExam = await prisma.exam.upsert({
    where: { slug: "jee-main" },
    update: {},
    create: {
      slug: "jee-main",
      name: "JEE Main",
      description:
        "Current 2023-24 NTA-rationalized syllabus (verify against the official NTA bulletin once the next cycle's is published).",
      order: 0,
    },
  });

  const jeePhysics = await prisma.subject.upsert({
    where: { examId_slug: { examId: jeeExam.id, slug: "physics" } },
    update: {},
    create: { examId: jeeExam.id, slug: "physics", name: "Physics", order: 0 },
  });
  const jeeChemistry = await prisma.subject.upsert({
    where: { examId_slug: { examId: jeeExam.id, slug: "chemistry" } },
    update: {},
    create: { examId: jeeExam.id, slug: "chemistry", name: "Chemistry", order: 1 },
  });
  const jeeMaths = await prisma.subject.upsert({
    where: { examId_slug: { examId: jeeExam.id, slug: "mathematics" } },
    update: {},
    create: { examId: jeeExam.id, slug: "mathematics", name: "Mathematics", order: 2 },
  });

  await seedSubjectFromChapters(jeePhysics.id, jee.PHYSICS);
  await seedSubjectFromChapters(jeeChemistry.id, [
    ...jee.CHEM_PHYSICAL,
    ...jee.CHEM_INORGANIC,
    ...jee.CHEM_ORGANIC,
  ]);
  await seedSubjectFromChapters(jeeMaths.id, jee.MATH);

  // ---- RBSE Class 12 -------------------------------------------------------
  const rbseExam = await prisma.exam.upsert({
    where: { slug: "rbse-class-12" },
    update: {},
    create: {
      slug: "rbse-class-12",
      name: "RBSE Class 12",
      description:
        "Sourced from cross-checked coaching aggregators (rajeduboard.rajasthan.gov.in itself could not be parsed automatically). Verify marks-split and literature textbook titles against your own textbook — see Chapter descriptions for known conflicts.",
      order: 1,
    },
  });

  const rbseHindi = await prisma.subject.upsert({
    where: { examId_slug: { examId: rbseExam.id, slug: "hindi" } },
    update: {},
    create: { examId: rbseExam.id, slug: "hindi", name: "Hindi", order: 0 },
  });
  const rbseEnglish = await prisma.subject.upsert({
    where: { examId_slug: { examId: rbseExam.id, slug: "english" } },
    update: {},
    create: { examId: rbseExam.id, slug: "english", name: "English", order: 1 },
  });
  const rbsePhysics = await prisma.subject.upsert({
    where: { examId_slug: { examId: rbseExam.id, slug: "physics" } },
    update: {},
    create: { examId: rbseExam.id, slug: "physics", name: "Physics", order: 2 },
  });
  const rbseChemistry = await prisma.subject.upsert({
    where: { examId_slug: { examId: rbseExam.id, slug: "chemistry" } },
    update: {},
    create: { examId: rbseExam.id, slug: "chemistry", name: "Chemistry", order: 3 },
  });
  const rbseMaths = await prisma.subject.upsert({
    where: { examId_slug: { examId: rbseExam.id, slug: "mathematics" } },
    update: {},
    create: { examId: rbseExam.id, slug: "mathematics", name: "Mathematics", order: 4 },
  });

  await seedLanguageSubject(rbseHindi.id, {
    grammarRows: rbse.HINDI_GRAMMAR,
    writingRows: rbse.HINDI_WRITING,
    literatureNote:
      "Two conflicting textbook-title sets were found in research: (A) सृजन + पीयूष प्रवाह + संवाद सेतु (more likely correct, RBSE-specific); (B) NCERT's आरोह/वितान (likely a templated mislabel). Confirm your physical textbook cover before adding chapters.",
  });
  await seedLanguageSubject(rbseEnglish.id, {
    grammarRows: rbse.ENGLISH_GRAMMAR,
    writingRows: rbse.ENGLISH_WRITING,
    literatureNote:
      "Two conflicting textbook-title sets were found in research: (A) \"Rainbow — English Compulsory\" (independently confirmed as an actual RBSE-published PDF — more likely correct); (B) NCERT's Flamingo & Vistas (likely a templated mislabel). Confirm your physical textbook cover before adding chapters.",
  });
  await seedSubjectFromChapters(rbsePhysics.id, rbse.PHYSICS);
  await seedSubjectFromChapters(rbseChemistry.id, rbse.CHEMISTRY);
  await seedSubjectFromChapters(rbseMaths.id, rbse.MATH);

  const examCount = await prisma.exam.count();
  const chapterCount = await prisma.chapter.count();
  const topicCount = await prisma.topic.count();
  console.log(`Seeded ${examCount} exams, ${chapterCount} chapters, ${topicCount} topics.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

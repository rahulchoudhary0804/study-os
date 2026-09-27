import { prisma } from "@/lib/prisma";
import { pdfCss } from "./styles";
import { coverPage, chapterCard, table, checklist, esc } from "./render";
import { getWeakTopics } from "@/server/queries/weakness";
import { getAnalyticsData } from "@/server/queries/analytics";

function wrap(body: string, accent = "#2563eb", accentDark = "#1e3a8a") {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${pdfCss(accent, accentDark)}</style></head><body>${body}</body></html>`;
}

async function chapterWithTopics(chapterId: string) {
  return prisma.chapter.findUniqueOrThrow({
    where: { id: chapterId },
    include: { subject: { include: { exam: true } }, topics: { where: { isDeleted: false }, orderBy: { order: "asc" } } },
  });
}

export async function buildChapterPdf(chapterId: string) {
  const chapter = await chapterWithTopics(chapterId);
  const body =
    coverPage(`${chapter.subject.exam.name} · ${chapter.subject.name}`, chapter.name, "Chapter Study Guide") +
    `<div class="page">${chapterCard({
      name: chapter.name,
      priority: chapter.priority,
      importance: chapter.importance,
      pyqTrend: chapter.pyqTrend,
      mustKnow: chapter.mustKnow,
      commonMistakes: chapter.commonMistakes,
      questionPatterns: chapter.questionPatterns,
      topics: chapter.topics,
    })}</div>`;
  return { html: wrap(body), filename: `${chapter.name.replace(/\s+/g, "_")}_Study_Guide.pdf` };
}

export async function buildSubjectPdf(subjectId: string) {
  const subject = await prisma.subject.findUniqueOrThrow({
    where: { id: subjectId },
    include: {
      exam: true,
      chapters: { where: { isDeleted: false }, orderBy: { order: "asc" }, include: { topics: { where: { isDeleted: false }, orderBy: { order: "asc" } } } },
    },
  });
  const body =
    coverPage(subject.exam.name, subject.name, "Complete Subject Study Guide") +
    `<div class="page">${subject.chapters.map((c) => chapterCard(c)).join("")}</div>`;
  return { html: wrap(body), filename: `${subject.name.replace(/\s+/g, "_")}_Study_Guide.pdf` };
}

export async function buildExamPdf(examId: string) {
  const exam = await prisma.exam.findUniqueOrThrow({
    where: { id: examId },
    include: {
      subjects: {
        orderBy: { order: "asc" },
        include: {
          chapters: { where: { isDeleted: false }, orderBy: { order: "asc" }, include: { topics: { where: { isDeleted: false }, orderBy: { order: "asc" } } } },
        },
      },
    },
  });
  const body =
    coverPage("Smart Padhai", exam.name, exam.description ?? "Complete Chapter & Topic Priority Guide") +
    exam.subjects
      .map(
        (s) => `<div class="page"><h2>${esc(s.name)}</h2>${s.chapters.map((c) => chapterCard(c)).join("")}</div>`
      )
      .join("");
  return { html: wrap(body), filename: `${exam.name.replace(/\s+/g, "_")}_Complete_Guide.pdf` };
}

export async function buildTopicNotesPdf(topicId: string, userId: string) {
  const topic = await prisma.topic.findUniqueOrThrow({
    where: { id: topicId },
    include: { chapter: { include: { subject: { include: { exam: true } } } } },
  });
  const aiNotes = await prisma.aIGeneration.findFirst({
    where: { userId, topicId, type: "NOTES" },
    orderBy: { createdAt: "desc" },
  });
  const notes = aiNotes?.responseJson as Record<string, unknown> | undefined;

  let notesHtml = `<p class="small">No AI notes generated yet for this topic — open it in the app and click "Generate Notes" first.</p>`;
  if (notes) {
    notesHtml = `
      <span class="lbl">Concept</span><p>${esc(notes.conceptExplanation)}</p>
      <span class="lbl">Formulas</span>${(notes.importantFormulas as string[]).map((f) => `<p>${esc(f)}</p>`).join("")}
      <span class="lbl">Common mistakes</span><ul class="tight">${(notes.commonMistakes as string[]).map((m) => `<li>${esc(m)}</li>`).join("")}</ul>
      <span class="lbl">Quick revision summary</span><p>${esc(notes.quickRevisionSummary)}</p>
    `;
  }

  const body =
    coverPage(`${topic.chapter.subject.exam.name} · ${topic.chapter.name}`, topic.name, "Topic Notes") +
    `<div class="page"><div class="chap"><div class="chap-head">${esc(topic.name)}</div><div class="chap-body">${notesHtml}</div></div></div>`;
  return { html: wrap(body), filename: `${topic.name.replace(/\s+/g, "_")}_Notes.pdf` };
}

export async function buildWeakTopicReportPdf(userId: string) {
  const weak = await getWeakTopics(userId, 30);
  const rows = weak.map((t) => [esc(t.name), esc(t.subjectName), esc(t.level), t.accuracyPercent !== null ? `${t.accuracyPercent}%` : "—", String(t.attemptsCount)]);
  const body =
    coverPage("Smart Padhai", "Weak Topic Report", "Rule-based weakness scoring across your engaged topics") +
    `<div class="page">${table(["Topic", "Subject", "Level", "Accuracy", "Attempts"], rows)}</div>`;
  return { html: wrap(body, "#dc2626", "#7f1d1d"), filename: "Weak_Topic_Report.pdf" };
}

export async function buildWeeklyReportPdf(userId: string) {
  const data = await getAnalyticsData(userId);
  const body =
    coverPage("Smart Padhai", "Weekly Study Report", new Date().toLocaleDateString()) +
    `<div class="page">
      ${table(
        ["Metric", "Value"],
        [
          ["Total study hours", `${data.overall.totalStudyHours}h`],
          ["Questions attempted", String(data.overall.questionsAttempted)],
          ["Overall accuracy", data.overall.accuracy !== null ? `${data.overall.accuracy}%` : "—"],
          ["Revision completion", `${data.overall.revisionCompletionRate}%`],
          ["Current streak", String(data.overall.currentStreak)],
        ]
      )}
      <h2>By subject</h2>
      ${table(
        ["Subject", "Completion", "Study hours", "Accuracy", "Questions solved"],
        data.subjectChart.map((s) => [esc(s.name), `${s.completionPercent}%`, `${s.studyHours}h`, `${s.accuracy}%`, String(s.questionsSolved)])
      )}
      ${checklist(["Review weak topics", "Clear revision backlog", "Solve PYQ-style questions for Priority 1 chapters"])}
    </div>`;
  return { html: wrap(body), filename: "Weekly_Study_Report.pdf" };
}

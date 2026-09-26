export interface TopicContext {
  examName: string;
  subjectName: string;
  chapterName: string;
  topicName: string;
  description?: string | null;
  priority?: number;
}

const priorityLabel = (p?: number) =>
  p === 1 ? "Extremely Important" : p === 2 ? "Very Important" : p === 3 ? "Important" : "Lower Priority";

export function buildNotesPrompt(ctx: TopicContext): string {
  return `You are an expert JEE Main + RBSE Class 12 tutor writing structured study notes.

Exam: ${ctx.examName}
Subject: ${ctx.subjectName}
Chapter: ${ctx.chapterName}
Topic: ${ctx.topicName}
Priority: ${priorityLabel(ctx.priority)}
${ctx.description ? `Context: ${ctx.description}` : ""}

Write notes for a Class 12 student preparing for BOTH the RBSE board exam and JEE Main from this
single topic. Be precise, exam-relevant, and concise — no filler. Do not invent specific PYQ
statistics or exact marks; describe patterns qualitatively instead.

Return ONLY a JSON object with exactly this shape (no markdown fences, no extra commentary):
{
  "conceptExplanation": string,
  "importantDefinitions": string[],
  "importantFormulas": string[],
  "derivations": string[],
  "importantConditions": string[],
  "commonMistakes": string[],
  "typicalQuestionPatterns": string[],
  "jeeFocus": { "conceptualUnderstanding": string, "numericalApproach": string, "traps": string[] },
  "rbseFocus": { "boardOrientedExplanation": string, "importantDerivations": string[], "answerWritingPoints": string[] },
  "quickRevisionSummary": string
}`;
}

export function buildTopicInsightPrompt(ctx: TopicContext): string {
  return `You are an expert JEE Main + RBSE Class 12 tutor rating how hard a topic actually is for
students and how to tackle it most efficiently.

Exam: ${ctx.examName}
Subject: ${ctx.subjectName}
Chapter: ${ctx.chapterName}
Topic: ${ctx.topicName}
Priority: ${priorityLabel(ctx.priority)}
${ctx.description ? `Context: ${ctx.description}` : ""}

Rate this topic's difficulty for a typical Class 12 student preparing for both RBSE and JEE Main,
explain briefly why, and give the single most efficient way to learn/master it (the "easiest path"
— e.g. which sub-concept to nail first, a mnemonic, a solving shortcut, or a study order).

Return ONLY JSON:
{
  "hardnessLevel": "EASY" | "MEDIUM" | "HARD" | "VERY_HARD",
  "hardnessReason": string,
  "easiestApproach": string,
  "estimatedTimeToMaster": string
}`;
}

export function buildQuestionsPrompt(
  ctx: TopicContext,
  opts: { examTarget: "RBSE" | "JEE_MAIN" | "MIXED"; difficulty: "EASY" | "MEDIUM" | "HARD" | "MIXED"; count: number }
): string {
  return `You are generating ORIGINAL practice questions (not real past papers) for a student.

Exam: ${ctx.examName}
Subject: ${ctx.subjectName}
Chapter: ${ctx.chapterName}
Topic: ${ctx.topicName}

Generate exactly ${opts.count} original questions.
Target style: ${opts.examTarget === "RBSE" ? "RBSE board exam (derivation/definition/short-long answer style)" : opts.examTarget === "JEE_MAIN" ? "JEE Main (objective MCQ/numerical-value style)" : "a mix of RBSE board style and JEE Main objective style"}.
Difficulty: ${opts.difficulty === "MIXED" ? "a mix of easy, medium and hard" : opts.difficulty.toLowerCase()}.

These questions are AI-generated practice material, NOT real previous-year questions. Do not claim
they came from an actual exam paper.

Return ONLY JSON of this shape:
{
  "questions": [
    {
      "question": string,
      "questionType": "MCQ" | "NUMERICAL" | "SUBJECTIVE",
      "options": string[] | undefined,
      "correctAnswer": string,
      "explanation": string,
      "conceptTested": string,
      "difficulty": "EASY" | "MEDIUM" | "HARD"
    }
  ]
}`;
}

export function buildExplainPrompt(ctx: TopicContext, userMessage: string, mode?: string): string {
  const modeInstruction =
    mode === "simple"
      ? "Explain it as simply as possible, like to a beginner."
      : mode === "hinglish"
      ? "Explain in Hinglish (mix of Hindi and English, written in Roman script)."
      : mode === "hint"
      ? "Give a HINT only — do not give the full solution unless the student explicitly asks for it."
      : "Explain clearly and precisely, at Class 12 level.";

  return `You are a patient AI study assistant embedded in a topic page.

Current context: ${ctx.examName} → ${ctx.subjectName} → ${ctx.chapterName} → ${ctx.topicName}

Student's message: "${userMessage}"

Instruction: ${modeInstruction}
For any question-solving request, default to giving a hint or approach before the full solution,
unless the student explicitly asks for the complete solution.

Return ONLY JSON: { "answer": string, "followUpSuggestions": string[] }`;
}

export interface PlannerUserInput {
  examName: string;
  examDate?: string | null;
  availableHoursPerDay: number;
  preparationLevel?: string;
  preferredStudyTime?: string | null;
  priorities?: string;
}

export interface PlannerDbState {
  completedTopics: string[];
  remainingHighPriorityTopics: string[];
  weakTopics: { name: string; accuracy: number }[];
  revisionDueTopics: string[];
  recentStudyHoursPerDay: number;
}

export interface FullPlannerUserInput {
  examName: string;
  examDate?: string | null;
  startDate: string;
  endDate: string;
  hoursPerDay: number;
  totalTopics: number;
  totalDays: number;
}

/**
 * Unlike `buildPlannerPrompt` (one day), this only asks the AI for the
 * narrative wrapper (rationale/weekly focus/priority order) — the actual
 * day-by-day topic assignment is deterministic (see
 * `src/lib/domain/scheduler.ts`), so this scales to any horizon length
 * without per-day AI cost or truncation risk.
 */
export function buildFullPlannerPrompt(input: FullPlannerUserInput, state: PlannerDbState): string {
  return `You are an AI study planner. A deterministic scheduler has already laid out which topic
gets studied on which day for the FULL syllabus, from ${input.startDate} to ${input.endDate}
(${input.totalDays} days, ${input.totalTopics} topics, ${input.hoursPerDay} hours/day) targeting
${input.examName}${input.examDate ? ` (exam date ${input.examDate})` : ""}. Your job is only to
write the motivating narrative around that schedule using the student's real data below — do not
invent a different day-by-day breakdown.

Current database state:
- Completed topics (${state.completedTopics.length}): ${state.completedTopics.slice(0, 30).join(", ") || "none yet"}
- Remaining high-priority topics (${state.remainingHighPriorityTopics.length}): ${state.remainingHighPriorityTopics.slice(0, 30).join(", ") || "none"}
- Weak topics (accuracy shown): ${state.weakTopics.map((t) => `${t.name} (${t.accuracy}%)`).join(", ") || "none identified yet"}
- Topics with revision due: ${state.revisionDueTopics.slice(0, 20).join(", ") || "none"}
- Recent average study hours/day: ${state.recentStudyHoursPerDay}

Return ONLY JSON:
{
  "rationale": string,
  "weeklyFocus": string[],
  "priorityOrder": string[]
}`;
}

export function buildPlannerPrompt(input: PlannerUserInput, state: PlannerDbState): string {
  return `You are an AI study planner. Build a REALISTIC, personalized plan using the student's
actual data below — do not produce a generic template.

Target exam: ${input.examName}
Exam date: ${input.examDate ?? "not set"}
Available study hours/day: ${input.availableHoursPerDay}
Self-rated preparation level: ${input.preparationLevel ?? "not specified"}
Preferred study time: ${input.preferredStudyTime ?? "not specified"}
Extra priorities from student: ${input.priorities ?? "none"}

Current database state:
- Completed topics (${state.completedTopics.length}): ${state.completedTopics.slice(0, 30).join(", ") || "none yet"}
- Remaining high-priority topics (${state.remainingHighPriorityTopics.length}): ${state.remainingHighPriorityTopics.slice(0, 30).join(", ") || "none"}
- Weak topics (accuracy shown): ${state.weakTopics.map((t) => `${t.name} (${t.accuracy}%)`).join(", ") || "none identified yet"}
- Topics with revision due: ${state.revisionDueTopics.slice(0, 20).join(", ") || "none"}
- Recent average study hours/day: ${state.recentStudyHoursPerDay}

Build today's plan around: weak topics and revision-due topics first, then remaining high-priority
topics, respecting the available hours. Be specific about which subject/chapter/topic each block covers.

Return ONLY JSON:
{
  "rationale": string,
  "dailyPlan": [ { "startTime": "HH:MM", "endTime": "HH:MM", "label": string, "subjectName": string, "chapterName": string, "topicName": string, "reason": string } ],
  "weeklyFocus": string[],
  "priorityOrder": string[]
}`;
}

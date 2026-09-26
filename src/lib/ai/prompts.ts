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

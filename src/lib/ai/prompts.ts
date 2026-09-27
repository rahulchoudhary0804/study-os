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

Rules:
- For "MCQ": give exactly 4 "options", and "correctAnswer" must be copied EXACTLY from one of the options.
- For "NUMERICAL" / "SUBJECTIVE": omit the "options" key entirely.
- Math/chemistry notation (in the question, EVERY option, correctAnswer and explanation): use LaTeX inside $...$ and escape every backslash for JSON (write \\\\frac, \\\\sqrt).

Return ONLY JSON of this shape:
{
  "questions": [
    {
      "question": "...",
      "questionType": "MCQ",
      "options": ["...", "...", "...", "..."],
      "correctAnswer": "...",
      "explanation": "...",
      "conceptTested": "...",
      "difficulty": "EASY"
    }
  ]
}`;
}

export interface ChatTurn {
  role: "USER" | "ASSISTANT";
  content: string;
}

/**
 * Plain-text (markdown) chat prompt — deliberately NOT JSON, so long
 * LaTeX-heavy answers can't fail a JSON parse. Earlier turns are included so
 * follow-up questions ("and why is that?") keep their context.
 */
export function buildChatPrompt(
  ctx: TopicContext | null,
  history: ChatTurn[],
  userMessage: string,
  mode?: string
): string {
  const modeInstruction =
    mode === "simple"
      ? "Explain it as simply as possible, like to a beginner."
      : mode === "hinglish"
      ? "Reply in Hinglish (mix of Hindi and English, written in Roman script)."
      : mode === "hint"
      ? "Give a HINT only — do not give the full solution unless the student explicitly asks for it."
      : "Explain clearly and precisely, at Class 12 level.";

  const context = ctx
    ? `Current topic: ${ctx.examName} → ${ctx.subjectName} → ${ctx.chapterName} → ${ctx.topicName}`
    : "No specific topic selected — the student is preparing for JEE Main and the RBSE Class 12 board exam.";

  const transcript = history
    .slice(-10)
    .map((t) => `${t.role === "USER" ? "Student" : "Assistant"}: ${t.content}`)
    .join("\n\n");

  return `You are a patient AI study tutor for a Class 12 student (JEE Main + RBSE board).

${context}
${transcript ? `\nConversation so far:\n${transcript}\n` : ""}
Student's new message: ${userMessage}

Instruction: ${modeInstruction}
For problem-solving, give the approach/hint first unless the student asks for the full solution.
Format in Markdown; write math in LaTeX between $...$ (inline) or $$...$$ (display).
Keep it focused — no preamble.

After your answer, on the very last line, write exactly:
FOLLOWUPS: <question 1> | <question 2> | <question 3>
(three short follow-up questions the student might ask next).`;
}

/** Splits the trailing "FOLLOWUPS:" line off a chat reply. */
export function splitFollowUps(text: string): { answer: string; followUps: string[] } {
  const match = text.match(/\n?\s*\**FOLLOW-?UPS\**:?\**\s*(.+)\s*$/i);
  if (!match) return { answer: text.trim(), followUps: [] };
  const followUps = match[1]
    .split("|")
    .map((q) => q.trim().replace(/^[-*\d.)\s]+/, ""))
    .filter((q) => q.length > 3)
    .slice(0, 3);
  return { answer: text.slice(0, match.index).trim(), followUps };
}

export interface PlannerUserInput {
  examName: string;
  examDate?: string | null;
  availableHoursPerDay: number;
  preparationLevel?: string;
  preferredStudyTime?: string | null;
  priorities?: string;
}

export interface PlannerCandidateTopic {
  ref: string; // short id like "T7" the model echoes back
  name: string;
  chapterName: string;
  subjectName: string;
  priority: number;
  reason: string; // why it's a candidate: "weak", "revision due", "high priority"...
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

export function buildPlannerPrompt(
  input: PlannerUserInput,
  state: PlannerDbState,
  candidates: PlannerCandidateTopic[]
): string {
  const catalog = candidates
    .map((c) => `${c.ref} | ${c.subjectName} → ${c.chapterName} → ${c.name} | P${c.priority} | ${c.reason}`)
    .join("\n");

  return `You are an AI study planner. Build a REALISTIC, personalized plan for TODAY using the student's
actual data below — do not produce a generic template.

Target exam: ${input.examName}
Exam date: ${input.examDate ?? "not set"}
Available study hours today: ${input.availableHoursPerDay}
Self-rated preparation level: ${input.preparationLevel ?? "not specified"}
Preferred study time: ${input.preferredStudyTime ?? "not specified"}
Extra priorities from student: ${input.priorities ?? "none"}

Current database state:
- Completed topics (${state.completedTopics.length}): ${state.completedTopics.slice(0, 30).join(", ") || "none yet"}
- Weak topics (accuracy shown): ${state.weakTopics.map((t) => `${t.name} (${t.accuracy}%)`).join(", ") || "none identified yet"}
- Topics with revision due: ${state.revisionDueTopics.slice(0, 20).join(", ") || "none"}
- Recent average study hours/day: ${state.recentStudyHoursPerDay}

Candidate topics (ref | subject → chapter → topic | priority | why):
${catalog || "(none)"}

Rules:
- Every study block MUST pick a topic from the candidate list and put its ref in "topicRef" (e.g. "T3").
- Order: revision-due and weak topics first, then Priority 1, then Priority 2 — and mix subjects so the
  day isn't all one subject.
- Fit the blocks into ${input.availableHoursPerDay} hours total (45–90 min blocks, include short breaks
  between blocks by leaving gaps in the times). Start at a sensible time for the preferred study time.
- "label" = "<Subject>: <Topic>".

Return ONLY JSON:
{
  "rationale": "...",
  "dailyPlan": [ { "startTime": "HH:MM", "endTime": "HH:MM", "label": "...", "topicRef": "T1", "reason": "..." } ],
  "weeklyFocus": ["..."],
  "priorityOrder": ["..."]
}`;
}

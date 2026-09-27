import { z } from "zod";

// Models are loose with types (numbers for answers, lower-case enums, a
// missing array) — these helpers accept those instead of failing the batch.
const str = z.coerce.string();
const strArr = z.array(z.coerce.string()).default([]);
const normEnum = (v: unknown) => (typeof v === "string" ? v.trim().toUpperCase().replace(/[\s-]+/g, "_") : v);
const questionTypeEnum = z.preprocess(normEnum, z.enum(["MCQ", "NUMERICAL", "SUBJECTIVE"]).catch("SUBJECTIVE"));
const difficultyEnum = z.preprocess(normEnum, z.enum(["EASY", "MEDIUM", "HARD"]).catch("MEDIUM"));
const hardnessEnum = z.preprocess(normEnum, z.enum(["EASY", "MEDIUM", "HARD", "VERY_HARD"]).catch("MEDIUM"));


// ---------------------------------------------------------------------------
// AI Notes Generator — Section 7 of the spec
// ---------------------------------------------------------------------------
export const AINotesSchema = z.object({
  conceptExplanation: str,
  importantDefinitions: strArr,
  importantFormulas: strArr,
  derivations: strArr,
  importantConditions: strArr,
  commonMistakes: strArr,
  typicalQuestionPatterns: strArr,
  jeeFocus: z.object({
    conceptualUnderstanding: str.default(""),
    numericalApproach: str.default(""),
    traps: strArr,
  }),
  rbseFocus: z.object({
    boardOrientedExplanation: str.default(""),
    importantDerivations: strArr,
    answerWritingPoints: strArr,
  }),
  quickRevisionSummary: str.default(""),
});
export type AINotes = z.infer<typeof AINotesSchema>;

// ---------------------------------------------------------------------------
// AI Question Generator — Section 8
// ---------------------------------------------------------------------------
export const AIQuestionSchema = z.object({
  question: str,
  questionType: questionTypeEnum,
  options: z.array(z.coerce.string()).optional(),
  correctAnswer: str,
  explanation: str.default(""),
  conceptTested: str.default(""),
  difficulty: difficultyEnum,
});
export type AIQuestion = z.infer<typeof AIQuestionSchema>;

export const AIQuestionSetSchema = z.object({
  questions: z.array(AIQuestionSchema).min(1),
});

// ---------------------------------------------------------------------------
// AI Study Planner — Section 19
// ---------------------------------------------------------------------------
export const AIPlanItemSchema = z.object({
  startTime: str.default(""),
  endTime: str.default(""),
  label: str,
  subjectName: z.coerce.string().optional(),
  chapterName: z.coerce.string().optional(),
  topicName: z.coerce.string().optional(),
  /** Short id (e.g. "T12") from the candidate topic list in the prompt. */
  topicRef: z.coerce.string().optional(),
  reason: str.default(""),
});

export const AIPlanSchema = z.object({
  rationale: str,
  dailyPlan: z.array(AIPlanItemSchema).min(1),
  weeklyFocus: strArr,
  priorityOrder: strArr,
});
export type AIPlan = z.infer<typeof AIPlanSchema>;

export const AIFullPlanNarrativeSchema = z.object({
  rationale: str,
  weeklyFocus: strArr,
  priorityOrder: strArr,
});
export type AIFullPlanNarrative = z.infer<typeof AIFullPlanNarrativeSchema>;

// ---------------------------------------------------------------------------
// AI Topic Insight — difficulty rating + easiest approach for the Overview tab
// ---------------------------------------------------------------------------
export const AITopicInsightSchema = z.object({
  hardnessLevel: hardnessEnum,
  hardnessReason: str.default(""),
  easiestApproach: str.default(""),
  estimatedTimeToMaster: str.default(""),
});
export type AITopicInsight = z.infer<typeof AITopicInsightSchema>;

// ---------------------------------------------------------------------------
// AI Assistant / Explain — Section 20
// ---------------------------------------------------------------------------
export const AIExplainSchema = z.object({
  answer: str,
  followUpSuggestions: strArr,
});
export type AIExplain = z.infer<typeof AIExplainSchema>;

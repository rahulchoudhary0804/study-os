import { z } from "zod";

// ---------------------------------------------------------------------------
// AI Notes Generator — Section 7 of the spec
// ---------------------------------------------------------------------------
export const AINotesSchema = z.object({
  conceptExplanation: z.string(),
  importantDefinitions: z.array(z.string()),
  importantFormulas: z.array(z.string()),
  derivations: z.array(z.string()).default([]),
  importantConditions: z.array(z.string()).default([]),
  commonMistakes: z.array(z.string()),
  typicalQuestionPatterns: z.array(z.string()),
  jeeFocus: z.object({
    conceptualUnderstanding: z.string(),
    numericalApproach: z.string(),
    traps: z.array(z.string()),
  }),
  rbseFocus: z.object({
    boardOrientedExplanation: z.string(),
    importantDerivations: z.array(z.string()),
    answerWritingPoints: z.array(z.string()),
  }),
  quickRevisionSummary: z.string(),
});
export type AINotes = z.infer<typeof AINotesSchema>;

// ---------------------------------------------------------------------------
// AI Question Generator — Section 8
// ---------------------------------------------------------------------------
export const AIQuestionSchema = z.object({
  question: z.string(),
  questionType: z.enum(["MCQ", "NUMERICAL", "SUBJECTIVE"]),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string(),
  explanation: z.string(),
  conceptTested: z.string(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
});
export type AIQuestion = z.infer<typeof AIQuestionSchema>;

export const AIQuestionSetSchema = z.object({
  questions: z.array(AIQuestionSchema),
});

// ---------------------------------------------------------------------------
// AI Study Planner — Section 19
// ---------------------------------------------------------------------------
export const AIPlanItemSchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
  label: z.string(),
  subjectName: z.string().optional(),
  chapterName: z.string().optional(),
  topicName: z.string().optional(),
  reason: z.string(),
});

export const AIPlanSchema = z.object({
  rationale: z.string(),
  dailyPlan: z.array(AIPlanItemSchema),
  weeklyFocus: z.array(z.string()),
  priorityOrder: z.array(z.string()),
});
export type AIPlan = z.infer<typeof AIPlanSchema>;

export const AIFullPlanNarrativeSchema = z.object({
  rationale: z.string(),
  weeklyFocus: z.array(z.string()),
  priorityOrder: z.array(z.string()),
});
export type AIFullPlanNarrative = z.infer<typeof AIFullPlanNarrativeSchema>;

// ---------------------------------------------------------------------------
// AI Topic Insight — difficulty rating + easiest approach for the Overview tab
// ---------------------------------------------------------------------------
export const AITopicInsightSchema = z.object({
  hardnessLevel: z.enum(["EASY", "MEDIUM", "HARD", "VERY_HARD"]),
  hardnessReason: z.string(),
  easiestApproach: z.string(),
  estimatedTimeToMaster: z.string(),
});
export type AITopicInsight = z.infer<typeof AITopicInsightSchema>;

// ---------------------------------------------------------------------------
// AI Assistant / Explain — Section 20
// ---------------------------------------------------------------------------
export const AIExplainSchema = z.object({
  answer: z.string(),
  followUpSuggestions: z.array(z.string()).default([]),
});
export type AIExplain = z.infer<typeof AIExplainSchema>;

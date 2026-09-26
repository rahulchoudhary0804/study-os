"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserAction } from "@/lib/auth";
import { startOfDay } from "date-fns";
import { getAIProvider, AIProviderError } from "@/lib/ai";
import { AINotesSchema, AIQuestionSetSchema, AIExplainSchema, AIPlanSchema } from "@/lib/ai/schemas";
import { buildNotesPrompt, buildQuestionsPrompt, buildExplainPrompt, buildPlannerPrompt, type TopicContext } from "@/lib/ai/prompts";
import { assertWithinAIRateLimit } from "@/lib/ai/rate-limit";
import { getPlannerDbState } from "@/server/queries/planner";

const CACHE_HOURS = 24;

async function loadTopicContext(topicId: string): Promise<TopicContext & { chapterId: string; subjectId: string }> {
  const topic = await prisma.topic.findUniqueOrThrow({
    where: { id: topicId },
    include: { chapter: { include: { subject: { include: { exam: true } } } } },
  });
  return {
    examName: topic.chapter.subject.exam.name,
    subjectName: topic.chapter.subject.name,
    chapterName: topic.chapter.name,
    topicName: topic.name,
    description: topic.description,
    priority: topic.priority,
    chapterId: topic.chapterId,
    subjectId: topic.chapter.subjectId,
  };
}

function friendlyAIError(err: unknown): never {
  if (err instanceof AIProviderError) {
    throw new Error(err.message.includes("GEMINI_API_KEY") ? "AI_NOT_CONFIGURED" : "AI_FAILED");
  }
  if (err instanceof Error && err.message.startsWith("RATE_LIMITED")) throw err;
  throw new Error("AI_FAILED");
}

// ---------------------------------------------------------------------------
// AI Notes Generator (Section 7)
// ---------------------------------------------------------------------------
const generateNotesSchema = z.object({ topicId: z.string().uuid(), force: z.boolean().optional() });

export async function generateNotesAction(input: z.infer<typeof generateNotesSchema>) {
  const { profile } = await requireUserAction();
  const { topicId, force } = generateNotesSchema.parse(input);

  if (!force) {
    const cached = await prisma.aIGeneration.findFirst({
      where: {
        userId: profile.id,
        topicId,
        type: "NOTES",
        createdAt: { gte: new Date(Date.now() - CACHE_HOURS * 3600_000) },
      },
      orderBy: { createdAt: "desc" },
    });
    if (cached) return cached.responseJson;
  }

  await assertWithinAIRateLimit(profile.id);
  const ctx = await loadTopicContext(topicId);
  const provider = getAIProvider();

  try {
    const notes = await provider.generateStructured(buildNotesPrompt(ctx), AINotesSchema, { maxOutputTokens: 3000 });
    await prisma.aIGeneration.create({
      data: {
        userId: profile.id,
        type: "NOTES",
        topicId,
        prompt: buildNotesPrompt(ctx),
        responseJson: notes,
        provider: provider.name,
        model: provider.model,
      },
    });
    revalidatePath(`/study/[examSlug]/[subjectSlug]/[chapterSlug]/${topicId}`);
    return notes;
  } catch (err) {
    friendlyAIError(err);
  }
}

/** Saves the current AI-generated notes JSON as a real, editable Note the user owns. */
export async function saveAINotesAsNoteAction(topicId: string, notesMarkdown: string, title: string) {
  const { profile } = await requireUserAction();
  return prisma.note.create({
    data: { userId: profile.id, topicId, title, content: notesMarkdown, isAIGenerated: true },
  });
}

// ---------------------------------------------------------------------------
// AI Question Generator (Section 8)
// ---------------------------------------------------------------------------
const generateQuestionsSchema = z.object({
  topicId: z.string().uuid(),
  examTarget: z.enum(["RBSE", "JEE_MAIN", "MIXED"]),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD", "MIXED"]),
  count: z.number().int().min(1).max(15),
});

export async function generateQuestionsAction(input: z.infer<typeof generateQuestionsSchema>) {
  const { profile } = await requireUserAction();
  const parsed = generateQuestionsSchema.parse(input);
  await assertWithinAIRateLimit(profile.id);

  const ctx = await loadTopicContext(parsed.topicId);
  const provider = getAIProvider();

  try {
    const result = await provider.generateStructured(
      buildQuestionsPrompt(ctx, parsed),
      AIQuestionSetSchema,
      { maxOutputTokens: 4000 }
    );
    await prisma.aIGeneration.create({
      data: {
        userId: profile.id,
        type: "QUESTIONS",
        topicId: parsed.topicId,
        prompt: buildQuestionsPrompt(ctx, parsed),
        responseJson: result,
        provider: provider.name,
        model: provider.model,
      },
    });
    return result.questions;
  } catch (err) {
    friendlyAIError(err);
  }
}

/** Persists a subset of AI-generated questions the user chose to keep. */
const saveQuestionsSchema = z.object({
  topicId: z.string().uuid(),
  questions: z.array(
    z.object({
      question: z.string(),
      questionType: z.enum(["MCQ", "NUMERICAL", "SUBJECTIVE"]),
      options: z.array(z.string()).optional(),
      correctAnswer: z.string(),
      explanation: z.string(),
      conceptTested: z.string(),
      difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
    })
  ),
});

export async function saveGeneratedQuestionsAction(input: z.infer<typeof saveQuestionsSchema>) {
  const { profile } = await requireUserAction();
  const { topicId, questions } = saveQuestionsSchema.parse(input);

  await prisma.question.createMany({
    data: questions.map((q) => ({
      topicId,
      source: "AI_GENERATED" as const,
      questionText: q.question,
      questionType: q.questionType,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      conceptTested: q.conceptTested,
      difficulty: q.difficulty,
      sourceRef: `AI Generated (${getAIProvider().name})`,
      createdByUserId: profile.id,
    })),
  });
  revalidatePath("/practice");
}

// ---------------------------------------------------------------------------
// AI Assistant / Explain (Section 20)
// ---------------------------------------------------------------------------
const explainSchema = z.object({
  topicId: z.string().uuid(),
  message: z.string().min(1).max(2000),
  mode: z.enum(["default", "simple", "hinglish", "hint"]).optional(),
  conversationId: z.string().uuid().optional(),
});

export async function explainAction(input: z.infer<typeof explainSchema>) {
  const { profile } = await requireUserAction();
  const parsed = explainSchema.parse(input);
  await assertWithinAIRateLimit(profile.id);

  const ctx = await loadTopicContext(parsed.topicId);
  const provider = getAIProvider();

  const conversation = parsed.conversationId
    ? await prisma.aIConversation.findUniqueOrThrow({ where: { id: parsed.conversationId } })
    : await prisma.aIConversation.create({
        data: { userId: profile.id, contextTopicId: parsed.topicId, title: ctx.topicName },
      });

  await prisma.aIMessage.create({ data: { conversationId: conversation.id, role: "USER", content: parsed.message } });

  try {
    const result = await provider.generateStructured(
      buildExplainPrompt(ctx, parsed.message, parsed.mode),
      AIExplainSchema,
      { maxOutputTokens: 1500 }
    );
    await prisma.aIMessage.create({
      data: { conversationId: conversation.id, role: "ASSISTANT", content: result.answer },
    });
    await prisma.aIGeneration.create({
      data: {
        userId: profile.id,
        type: "EXPLAIN",
        topicId: parsed.topicId,
        prompt: parsed.message,
        responseJson: result,
        provider: provider.name,
        model: provider.model,
      },
    });
    return { conversationId: conversation.id, ...result };
  } catch (err) {
    friendlyAIError(err);
  }
}

// ---------------------------------------------------------------------------
// AI Study Planner (Section 19)
// ---------------------------------------------------------------------------
const generatePlanSchema = z.object({
  examId: z.string().uuid(),
  availableHoursPerDay: z.number().min(0.5).max(16),
  preparationLevel: z.string().optional(),
  preferredStudyTime: z.string().optional(),
  priorities: z.string().optional(),
});

export async function generatePlanAction(input: z.infer<typeof generatePlanSchema>) {
  const { profile } = await requireUserAction();
  const parsed = generatePlanSchema.parse(input);
  await assertWithinAIRateLimit(profile.id);

  const exam = await prisma.exam.findUniqueOrThrow({ where: { id: parsed.examId } });
  const state = await getPlannerDbState(profile.id, parsed.examId);
  const provider = getAIProvider();

  const prompt = buildPlannerPrompt(
    {
      examName: exam.name,
      examDate: profile.examDate?.toISOString().slice(0, 10) ?? null,
      availableHoursPerDay: parsed.availableHoursPerDay,
      preparationLevel: parsed.preparationLevel,
      preferredStudyTime: parsed.preferredStudyTime,
      priorities: parsed.priorities,
    },
    state
  );

  try {
    const plan = await provider.generateStructured(prompt, AIPlanSchema, { maxOutputTokens: 3000 });
    await prisma.aIGeneration.create({
      data: { userId: profile.id, type: "PLAN", prompt, responseJson: plan, provider: provider.name, model: provider.model },
    });
    return plan;
  } catch (err) {
    friendlyAIError(err);
  }
}

const applyPlanSchema = z.object({
  rationale: z.string(),
  items: z.array(
    z.object({
      label: z.string(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      topicName: z.string().optional(),
    })
  ),
});

/** Persists an AI-generated plan into today's DailyTarget, replacing any existing AI-generated items. */
export async function applyPlanToTodayAction(input: z.infer<typeof applyPlanSchema>) {
  const { profile } = await requireUserAction();
  const { rationale, items } = applyPlanSchema.parse(input);
  const today = startOfDay(new Date());

  const target = await prisma.dailyTarget.upsert({
    where: { userId_date: { userId: profile.id, date: today } },
    update: { generatedByAI: true, aiRationale: rationale },
    create: { userId: profile.id, date: today, generatedByAI: true, aiRationale: rationale },
  });

  await prisma.dailyTargetItem.deleteMany({ where: { dailyTargetId: target.id } });

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const topic = it.topicName
      ? await prisma.topic.findFirst({
          where: { name: { equals: it.topicName, mode: "insensitive" } },
          select: { id: true, chapterId: true, chapter: { select: { subjectId: true } } },
        })
      : null;

    await prisma.dailyTargetItem.create({
      data: {
        dailyTargetId: target.id,
        label: it.label,
        startTime: it.startTime,
        endTime: it.endTime,
        order: i,
        topicId: topic?.id,
        chapterId: topic?.chapterId,
        subjectId: topic?.chapter.subjectId,
      },
    });
  }

  revalidatePath("/plan");
  revalidatePath("/dashboard");
}

export async function getConversationAction(conversationId: string) {
  const { profile } = await requireUserAction();
  const convo = await prisma.aIConversation.findUnique({
    where: { id: conversationId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!convo || convo.userId !== profile.id) throw new Error("NOT_FOUND");
  return convo;
}

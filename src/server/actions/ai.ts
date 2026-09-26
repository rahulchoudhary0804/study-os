"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserAction } from "@/lib/auth";
import { startOfDay, addDays } from "date-fns";
import { getAIProvider, AIProviderError } from "@/lib/ai";
import {
  AINotesSchema,
  AIQuestionSetSchema,
  AIExplainSchema,
  AIPlanSchema,
  AITopicInsightSchema,
  AIFullPlanNarrativeSchema,
} from "@/lib/ai/schemas";
import {
  buildNotesPrompt,
  buildQuestionsPrompt,
  buildExplainPrompt,
  buildPlannerPrompt,
  buildTopicInsightPrompt,
  buildFullPlannerPrompt,
  type TopicContext,
} from "@/lib/ai/prompts";
import { assertWithinAIRateLimit } from "@/lib/ai/rate-limit";
import { getPlannerDbState, getFullSyllabusQueue, type FullQueueTopic } from "@/server/queries/planner";
import { buildFullSchedule } from "@/lib/domain/scheduler";

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
// AI Topic Insight (difficulty + easiest approach, Overview tab)
// ---------------------------------------------------------------------------
const generateInsightSchema = z.object({ topicId: z.string().uuid() });

export async function generateTopicInsightAction(input: z.infer<typeof generateInsightSchema>) {
  const { profile } = await requireUserAction();
  const { topicId } = generateInsightSchema.parse(input);

  const cached = await prisma.aIGeneration.findFirst({
    where: {
      userId: profile.id,
      topicId,
      type: "INSIGHT",
      createdAt: { gte: new Date(Date.now() - CACHE_HOURS * 3600_000) },
    },
    orderBy: { createdAt: "desc" },
  });
  if (cached) return cached.responseJson;

  await assertWithinAIRateLimit(profile.id);
  const ctx = await loadTopicContext(topicId);
  const provider = getAIProvider();

  try {
    const insight = await provider.generateStructured(buildTopicInsightPrompt(ctx), AITopicInsightSchema, {
      maxOutputTokens: 600,
    });
    await prisma.aIGeneration.create({
      data: {
        userId: profile.id,
        type: "INSIGHT",
        topicId,
        prompt: buildTopicInsightPrompt(ctx),
        responseJson: insight,
        provider: provider.name,
        model: provider.model,
      },
    });
    return insight;
  } catch (err) {
    friendlyAIError(err);
  }
}

// ---------------------------------------------------------------------------
// AI Question Generator (Section 8)
// ---------------------------------------------------------------------------
const generateQuestionsSchema = z.object({
  topicId: z.string().uuid(),
  examTarget: z.enum(["RBSE", "JEE_MAIN", "MIXED"]),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD", "MIXED"]),
  count: z.number().int().min(1).max(100),
});

// Large batches are generated in chunks (rather than one huge call) so a single
// long response can't get truncated and fail Zod validation for the whole batch.
const QUESTION_CHUNK_SIZE = 25;

export async function generateQuestionsAction(input: z.infer<typeof generateQuestionsSchema>) {
  const { profile } = await requireUserAction();
  const parsed = generateQuestionsSchema.parse(input);
  await assertWithinAIRateLimit(profile.id);

  const ctx = await loadTopicContext(parsed.topicId);
  const provider = getAIProvider();

  const chunkSizes: number[] = [];
  let remaining = parsed.count;
  while (remaining > 0) {
    const size = Math.min(QUESTION_CHUNK_SIZE, remaining);
    chunkSizes.push(size);
    remaining -= size;
  }

  try {
    const allQuestions = [];
    let lastPrompt = "";
    for (const size of chunkSizes) {
      const prompt = buildQuestionsPrompt(ctx, { ...parsed, count: size });
      lastPrompt = prompt;
      const result = await provider.generateStructured(prompt, AIQuestionSetSchema, {
        maxOutputTokens: Math.min(8000, 500 + size * 260),
      });
      allQuestions.push(...result.questions);
    }
    await prisma.aIGeneration.create({
      data: {
        userId: profile.id,
        type: "QUESTIONS",
        topicId: parsed.topicId,
        prompt: lastPrompt,
        responseJson: { questions: allQuestions },
        provider: provider.name,
        model: provider.model,
      },
    });
    return allQuestions;
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
  examId: z.string(), // a real exam UUID, or the "BOTH" sentinel meaning don't filter by exam
  availableHoursPerDay: z.number().min(0.5).max(16),
  preparationLevel: z.string().optional(),
  preferredStudyTime: z.string().optional(),
  priorities: z.string().optional(),
});

export async function generatePlanAction(input: z.infer<typeof generatePlanSchema>) {
  const { profile } = await requireUserAction();
  const parsed = generatePlanSchema.parse(input);
  await assertWithinAIRateLimit(profile.id);

  const isBoth = parsed.examId === "BOTH";
  const exam = isBoth ? null : await prisma.exam.findUniqueOrThrow({ where: { id: parsed.examId } });
  const examName = exam?.name ?? "JEE Main + RBSE Class 12 (combined)";
  const state = await getPlannerDbState(profile.id, isBoth ? undefined : parsed.examId);
  const provider = getAIProvider();

  const prompt = buildPlannerPrompt(
    {
      examName,
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

// ---------------------------------------------------------------------------
// AI Full-Syllabus Planner — schedule from today to (examDate - 2 days)
// ---------------------------------------------------------------------------
const generateFullPlanSchema = z.object({
  examId: z.string(), // a real exam UUID, or "BOTH"
  hoursPerDay: z.number().min(0.5).max(16),
});

export interface FullScheduleDayPayload {
  date: string; // ISO date
  items: { topicId: string; chapterId: string; subjectId: string; name: string; href: string }[];
}

export async function generateFullPlanAction(input: z.infer<typeof generateFullPlanSchema>) {
  const { profile } = await requireUserAction();
  const parsed = generateFullPlanSchema.parse(input);
  await assertWithinAIRateLimit(profile.id);

  const isBoth = parsed.examId === "BOTH";
  const exam = isBoth ? null : await prisma.exam.findUniqueOrThrow({ where: { id: parsed.examId } });
  const examName = exam?.name ?? "JEE Main + RBSE Class 12 (combined)";

  const today = startOfDay(new Date());
  let horizonNote: string | null = null;
  let endDate: Date;
  if (profile.examDate) {
    endDate = addDays(startOfDay(profile.examDate), -2);
    if (endDate < today) {
      endDate = today;
      horizonNote = "Your exam date is very close — this covers what's left before it.";
    }
  } else {
    endDate = addDays(today, 30);
    horizonNote = "No exam date set in Settings, so this covers the next 30 days — set your exam date for a full-syllabus schedule.";
  }

  const [queue, state] = await Promise.all([
    getFullSyllabusQueue(profile.id, isBoth ? undefined : parsed.examId),
    getPlannerDbState(profile.id, isBoth ? undefined : parsed.examId),
  ]);

  const days = buildFullSchedule({
    topics: queue.map((t) => ({ id: t.id, name: t.name, priority: t.priority })),
    startDate: today,
    endDate,
    hoursPerDay: parsed.hoursPerDay,
  });

  const byId = new Map(queue.map((t) => [t.id, t]));
  const schedule: FullScheduleDayPayload[] = days.map((d) => ({
    date: d.date.toISOString().slice(0, 10),
    items: d.topicIds
      .map((id) => byId.get(id))
      .filter((t): t is FullQueueTopic => !!t)
      .map((t) => ({ topicId: t.id, chapterId: t.chapterId, subjectId: t.subjectId, name: t.name, href: t.href })),
  }));

  const totalTopics = days.reduce((s, d) => s + d.topicIds.length, 0);
  const prompt = buildFullPlannerPrompt(
    {
      examName,
      examDate: profile.examDate?.toISOString().slice(0, 10) ?? null,
      startDate: today.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      hoursPerDay: parsed.hoursPerDay,
      totalTopics,
      totalDays: days.length,
    },
    state
  );

  const provider = getAIProvider();
  try {
    const narrative = await provider.generateStructured(prompt, AIFullPlanNarrativeSchema, { maxOutputTokens: 1500 });
    await prisma.aIGeneration.create({
      data: {
        userId: profile.id,
        type: "FULL_PLAN",
        prompt,
        responseJson: narrative,
        provider: provider.name,
        model: provider.model,
      },
    });
    return { ...narrative, schedule, horizonNote };
  } catch (err) {
    friendlyAIError(err);
  }
}

const applyFullPlanSchema = z.object({
  rationale: z.string(),
  schedule: z.array(
    z.object({
      date: z.string(),
      items: z.array(
        z.object({
          topicId: z.string().uuid(),
          chapterId: z.string().uuid(),
          subjectId: z.string().uuid(),
          name: z.string(),
          href: z.string(),
        })
      ),
    })
  ),
});

/** Materializes the previewed full schedule into real DailyTarget rows, one per day. */
export async function applyFullPlanAction(input: z.infer<typeof applyFullPlanSchema>) {
  const { profile } = await requireUserAction();
  const { rationale, schedule } = applyFullPlanSchema.parse(input);

  for (const day of schedule) {
    const date = startOfDay(new Date(day.date));
    await prisma.dailyTargetItem.deleteMany({
      where: { dailyTarget: { userId: profile.id, date } },
    });
    const target = await prisma.dailyTarget.upsert({
      where: { userId_date: { userId: profile.id, date } },
      update: { generatedByAI: true, aiRationale: rationale },
      create: { userId: profile.id, date, generatedByAI: true, aiRationale: rationale },
    });
    await prisma.dailyTargetItem.createMany({
      data: day.items.map((it, i) => ({
        dailyTargetId: target.id,
        label: it.name,
        order: i,
        topicId: it.topicId,
        chapterId: it.chapterId,
        subjectId: it.subjectId,
      })),
    });
  }

  revalidatePath("/plan");
  revalidatePath("/dashboard");
  revalidatePath("/planner");
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

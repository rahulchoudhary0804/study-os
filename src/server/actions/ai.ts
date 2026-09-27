"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserAction } from "@/lib/auth";
import { addDays } from "date-fns";
import { getAIProvider, AIProviderError } from "@/lib/ai";
import {
  AINotesSchema,
  AIQuestionSetSchema,
  AIPlanSchema,
  AITopicInsightSchema,
  AIFullPlanNarrativeSchema,
} from "@/lib/ai/schemas";
import {
  buildNotesPrompt,
  buildQuestionsPrompt,
  buildChatPrompt,
  splitFollowUps,
  buildPlannerPrompt,
  buildTopicInsightPrompt,
  buildFullPlannerPrompt,
  type TopicContext,
  type PlannerCandidateTopic,
} from "@/lib/ai/prompts";
import { assertWithinAIRateLimit } from "@/lib/ai/rate-limit";
import {
  getPlannerDbState,
  getFullSyllabusQueue,
  getPlannerCandidates,
  type FullQueueTopic,
} from "@/server/queries/planner";
import { buildFullSchedule } from "@/lib/domain/scheduler";
import { appToday, parseAppDate } from "@/lib/dates";

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
  console.error("AI call failed", err instanceof AIProviderError ? err.cause ?? err : err);
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
    const prompt = buildNotesPrompt(ctx);
    const notes = await provider.generateStructured(prompt, AINotesSchema, { maxOutputTokens: 4000 });
    await prisma.aIGeneration.create({
      data: {
        userId: profile.id,
        type: "NOTES",
        topicId,
        prompt,
        responseJson: notes,
        provider: provider.name,
        model: provider.model,
      },
    });
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

  // Insights barely change between students, so any cached one for this topic is reused.
  const cached = await prisma.aIGeneration.findFirst({
    where: { topicId, type: "INSIGHT" },
    orderBy: { createdAt: "desc" },
  });
  if (cached) return cached.responseJson;

  await assertWithinAIRateLimit(profile.id);
  const ctx = await loadTopicContext(topicId);
  const provider = getAIProvider();

  try {
    const prompt = buildTopicInsightPrompt(ctx);
    const insight = await provider.generateStructured(prompt, AITopicInsightSchema, { maxOutputTokens: 800 });
    await prisma.aIGeneration.create({
      data: {
        userId: profile.id,
        type: "INSIGHT",
        topicId,
        prompt,
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

// Large batches are generated in parallel chunks (rather than one huge call)
// so a single long response can't get truncated and fail the whole batch.
const QUESTION_CHUNK_SIZE = 10;

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

  const prompts = chunkSizes.map((size) => buildQuestionsPrompt(ctx, { ...parsed, count: size }));
  const results = await Promise.allSettled(
    prompts.map((prompt, i) =>
      provider.generateStructured(prompt, AIQuestionSetSchema, {
        maxOutputTokens: Math.min(12000, 800 + chunkSizes[i] * 450),
      })
    )
  );

  const allQuestions = results.flatMap((r) => (r.status === "fulfilled" ? r.value.questions : []));
  if (allQuestions.length === 0) {
    const firstError = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
    friendlyAIError(firstError?.reason);
  }

  // An MCQ whose answer isn't one of its options can't be graded — keep it, but as subjective.
  const cleaned = allQuestions.map((q) => {
    if (q.questionType !== "MCQ") return { ...q, options: undefined };
    const opts = q.options ?? [];
    const exact = opts.find((o) => o.trim() === q.correctAnswer.trim());
    const byLetter = /^[A-Da-d]$/.test(q.correctAnswer.trim())
      ? opts["ABCD".indexOf(q.correctAnswer.trim().toUpperCase())]
      : undefined;
    const answer = exact ?? byLetter;
    return opts.length >= 2 && answer
      ? { ...q, correctAnswer: answer }
      : { ...q, questionType: "SUBJECTIVE" as const, options: undefined };
  });

  await prisma.aIGeneration.create({
    data: {
      userId: profile.id,
      type: "QUESTIONS",
      topicId: parsed.topicId,
      prompt: prompts[0],
      responseJson: { questions: cleaned },
      provider: provider.name,
      model: provider.model,
    },
  });
  return cleaned;
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
  topicId: z.string().uuid().optional(),
  message: z.string().min(1).max(4000),
  mode: z.enum(["default", "simple", "hinglish", "hint"]).optional(),
  conversationId: z.string().uuid().optional(),
});

/**
 * Chat turn for the AI assistant. Uses plain-text generation (not JSON) and
 * replays the earlier turns of the conversation, so students can keep asking
 * follow-up questions in the same thread.
 */
export async function explainAction(input: z.infer<typeof explainSchema>) {
  const { profile } = await requireUserAction();
  const parsed = explainSchema.parse(input);
  await assertWithinAIRateLimit(profile.id);

  const ctx = parsed.topicId ? await loadTopicContext(parsed.topicId) : null;
  const provider = getAIProvider();

  let conversation = parsed.conversationId
    ? await prisma.aIConversation.findUnique({
        where: { id: parsed.conversationId },
        include: { messages: { orderBy: { createdAt: "asc" }, take: 40 } },
      })
    : null;
  if (conversation && conversation.userId !== profile.id) conversation = null;
  if (!conversation) {
    conversation = await prisma.aIConversation.create({
      data: {
        userId: profile.id,
        contextTopicId: parsed.topicId,
        title: ctx?.topicName ?? parsed.message.slice(0, 60),
      },
      include: { messages: true },
    });
  }

  const history = conversation.messages.map((m) => ({ role: m.role, content: m.content }));
  const prompt = buildChatPrompt(ctx, history, parsed.message, parsed.mode);

  try {
    const raw = await provider.generateText(prompt, { maxOutputTokens: 2500, temperature: 0.5 });
    const { answer, followUps } = splitFollowUps(raw);
    await prisma.$transaction([
      prisma.aIMessage.create({ data: { conversationId: conversation.id, role: "USER", content: parsed.message } }),
      prisma.aIMessage.create({ data: { conversationId: conversation.id, role: "ASSISTANT", content: answer } }),
      prisma.aIGeneration.create({
        data: {
          userId: profile.id,
          type: "EXPLAIN",
          topicId: parsed.topicId,
          prompt: parsed.message,
          responseJson: { answer, followUpSuggestions: followUps },
          provider: provider.name,
          model: provider.model,
        },
      }),
    ]);
    return { conversationId: conversation.id, answer, followUpSuggestions: followUps };
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
  const [state, candidates] = await Promise.all([
    getPlannerDbState(profile.id, isBoth ? undefined : parsed.examId),
    getPlannerCandidates(profile.id, isBoth ? undefined : parsed.examId),
  ]);
  const provider = getAIProvider();
  const promptCandidates: PlannerCandidateTopic[] = candidates.map((c, i) => ({ ...c, ref: `T${i + 1}` }));

  const prompt = buildPlannerPrompt(
    {
      examName,
      examDate: profile.examDate?.toISOString().slice(0, 10) ?? null,
      availableHoursPerDay: parsed.availableHoursPerDay,
      preparationLevel: parsed.preparationLevel,
      preferredStudyTime: parsed.preferredStudyTime ?? profile.preferredStudyTime ?? undefined,
      priorities: parsed.priorities,
    },
    state,
    promptCandidates
  );

  try {
    const plan = await provider.generateStructured(prompt, AIPlanSchema, { maxOutputTokens: 3500 });
    const byRef = new Map(promptCandidates.map((c, i) => [c.ref.toUpperCase(), candidates[i]]));
    const byName = new Map(candidates.map((c) => [c.name.toLowerCase(), c]));
    const dailyPlan = plan.dailyPlan.map((item) => {
      const match =
        (item.topicRef && byRef.get(item.topicRef.trim().toUpperCase())) ||
        (item.topicName && byName.get(item.topicName.trim().toLowerCase())) ||
        undefined;
      return {
        ...item,
        topicId: match?.id,
        topicName: match?.name ?? item.topicName,
        subjectName: match?.subjectName ?? item.subjectName,
        chapterName: match?.chapterName ?? item.chapterName,
      };
    });
    await prisma.aIGeneration.create({
      data: { userId: profile.id, type: "PLAN", prompt, responseJson: plan, provider: provider.name, model: provider.model },
    });
    return { ...plan, dailyPlan };
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
      topicId: z.string().uuid().optional(),
    })
  ),
});

/**
 * Puts an AI-generated plan into today's DailyTarget. Items the student has
 * already ticked off are kept; the unfinished ones are replaced by the plan.
 */
export async function applyPlanToTodayAction(input: z.infer<typeof applyPlanSchema>) {
  const { profile } = await requireUserAction();
  const { rationale, items } = applyPlanSchema.parse(input);
  const today = appToday();

  const target = await prisma.dailyTarget.upsert({
    where: { userId_date: { userId: profile.id, date: today } },
    update: { generatedByAI: true, aiRationale: rationale },
    create: { userId: profile.id, date: today, generatedByAI: true, aiRationale: rationale },
  });

  const topicIds = items.map((i) => i.topicId).filter((x): x is string => !!x);
  const topics = await prisma.topic.findMany({
    where: { id: { in: topicIds } },
    select: { id: true, chapterId: true, chapter: { select: { subjectId: true } } },
  });
  const topicById = new Map(topics.map((t) => [t.id, t]));

  const [, doneCount] = await prisma.$transaction([
    prisma.dailyTargetItem.deleteMany({ where: { dailyTargetId: target.id, isDone: false } }),
    prisma.dailyTargetItem.count({ where: { dailyTargetId: target.id } }),
  ]);

  await prisma.dailyTargetItem.createMany({
    data: items.map((it, i) => {
      const topic = it.topicId ? topicById.get(it.topicId) : undefined;
      return {
        dailyTargetId: target.id,
        label: it.label,
        startTime: it.startTime || undefined,
        endTime: it.endTime || undefined,
        order: doneCount + i,
        topicId: topic?.id,
        chapterId: topic?.chapterId,
        subjectId: topic?.chapter.subjectId,
      };
    }),
  });

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

  const isBoth = parsed.examId === "BOTH";
  const exam = isBoth ? null : await prisma.exam.findUniqueOrThrow({ where: { id: parsed.examId } });
  const examName = exam?.name ?? "JEE Main + RBSE Class 12 (combined)";

  const today = appToday();
  let horizonNote: string | null = null;
  let endDate: Date;
  if (profile.examDate) {
    endDate = addDays(parseAppDate(profile.examDate.toISOString().slice(0, 10)), -2);
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
  if (totalTopics < queue.length) {
    horizonNote =
      (horizonNote ? horizonNote + " " : "") +
      `${queue.length - totalTopics} lower-priority topics didn't fit in ${parsed.hoursPerDay}h/day — add more hours to cover them.`;
  }

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

  // The schedule itself is deterministic; if the AI narrative fails (quota,
  // network), still hand back the schedule with a plain rationale.
  const provider = getAIProvider();
  let narrative = {
    rationale: `Priority-first schedule: revision-due and weak topics first, then Priority 1 → 4 chapters, packed into ${parsed.hoursPerDay}h/day.`,
    weeklyFocus: [] as string[],
    priorityOrder: [] as string[],
  };
  try {
    await assertWithinAIRateLimit(profile.id);
    narrative = await provider.generateStructured(prompt, AIFullPlanNarrativeSchema, { maxOutputTokens: 1500 });
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
  } catch (err) {
    console.error("Full-plan narrative failed; returning schedule without it", err);
  }
  return { ...narrative, schedule, horizonNote };
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

/**
 * Materializes the previewed full schedule into real DailyTarget rows. Done in
 * a handful of bulk queries (not 3 per day) so a 200+ day schedule applies in
 * seconds instead of timing out.
 */
export async function applyFullPlanAction(input: z.infer<typeof applyFullPlanSchema>) {
  const { profile } = await requireUserAction();
  const { rationale, schedule } = applyFullPlanSchema.parse(input);
  const dates = schedule.map((d) => parseAppDate(d.date));

  await prisma.$transaction(
    async (tx) => {
      await tx.dailyTargetItem.deleteMany({
        where: { dailyTarget: { userId: profile.id, date: { in: dates } }, isDone: false },
      });
      await tx.dailyTarget.createMany({
        data: dates.map((date) => ({ userId: profile.id, date, generatedByAI: true, aiRationale: rationale })),
        skipDuplicates: true,
      });
      await tx.dailyTarget.updateMany({
        where: { userId: profile.id, date: { in: dates } },
        data: { generatedByAI: true, aiRationale: rationale },
      });
      const targets = await tx.dailyTarget.findMany({
        where: { userId: profile.id, date: { in: dates } },
        select: { id: true, date: true, _count: { select: { items: true } } },
      });
      const byDate = new Map(targets.map((t) => [t.date.toISOString().slice(0, 10), t]));

      const rows = schedule.flatMap((day) => {
        const target = byDate.get(day.date.slice(0, 10));
        if (!target) return [];
        return day.items.map((it, i) => ({
          dailyTargetId: target.id,
          label: it.name,
          order: target._count.items + i,
          topicId: it.topicId,
          chapterId: it.chapterId,
          subjectId: it.subjectId,
        }));
      });
      for (let i = 0; i < rows.length; i += 1000) {
        await tx.dailyTargetItem.createMany({ data: rows.slice(i, i + 1000) });
      }
    },
    { timeout: 60_000, maxWait: 10_000 }
  );

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

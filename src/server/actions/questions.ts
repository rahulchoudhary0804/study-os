"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserAction } from "@/lib/auth";

const attemptSchema = z.object({
  questionId: z.string().uuid(),
  userAnswer: z.string().optional(),
  isCorrect: z.boolean().optional(),
  timeTakenSeconds: z.number().int().min(0).optional(),
});

export async function recordAttemptAction(input: z.infer<typeof attemptSchema>) {
  const { profile } = await requireUserAction();
  const parsed = attemptSchema.parse(input);

  await prisma.questionAttempt.create({ data: { ...parsed, userId: profile.id } });
  revalidatePath("/practice");
  revalidatePath("/analytics");
  revalidatePath("/dashboard");
}

const createQuestionSchema = z.object({
  topicId: z.string().uuid(),
  questionText: z.string().min(3),
  questionType: z.enum(["MCQ", "NUMERICAL", "SUBJECTIVE"]),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional(),
  explanation: z.string().optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  marks: z.number().int().optional(),
  examYear: z.number().int().optional(),
  sourceRef: z.string().optional(),
  source: z.enum(["USER_CREATED", "PYQ_METADATA"]).default("USER_CREATED"),
});

/** Lets a user add their own question, or store verified PYQ metadata (Section 9). */
export async function createQuestionAction(input: z.infer<typeof createQuestionSchema>) {
  const { profile } = await requireUserAction();
  const parsed = createQuestionSchema.parse(input);
  await prisma.question.create({ data: { ...parsed, createdByUserId: profile.id } });
  revalidatePath("/practice");
}

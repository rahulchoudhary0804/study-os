"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserAction } from "@/lib/auth";

const settingsSchema = z.object({
  fullName: z.string().max(100).optional(),
  targetExamId: z.string().uuid().optional().nullable(),
  examDate: z.string().optional().nullable(),
  dailyHourGoal: z.number().min(0.5).max(16),
  minStreakMinutes: z.number().int().min(5).max(480),
  preferredStudyTime: z.string().optional().nullable(),
});

const STREAK_LOCK_DAYS = 7;

export async function updateSettingsAction(input: z.infer<typeof settingsSchema>) {
  const { profile } = await requireUserAction();
  const parsed = settingsSchema.parse(input);

  const changingStreakMinutes = parsed.minStreakMinutes !== profile.minStreakMinutes;
  if (changingStreakMinutes && profile.minStreakMinutesUpdatedAt) {
    const unlocksAt = new Date(profile.minStreakMinutesUpdatedAt);
    unlocksAt.setDate(unlocksAt.getDate() + STREAK_LOCK_DAYS);
    if (unlocksAt > new Date()) {
      throw new Error(`STREAK_LOCKED:${unlocksAt.toISOString()}`);
    }
  }

  await prisma.profile.update({
    where: { id: profile.id },
    data: {
      fullName: parsed.fullName,
      targetExamId: parsed.targetExamId ?? null,
      examDate: parsed.examDate ? new Date(parsed.examDate) : null,
      dailyHourGoal: parsed.dailyHourGoal,
      minStreakMinutes: parsed.minStreakMinutes,
      minStreakMinutesUpdatedAt: changingStreakMinutes ? new Date() : undefined,
      preferredStudyTime: parsed.preferredStudyTime,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

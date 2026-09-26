"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserAction } from "@/lib/auth";
import { registerStudyMinutes } from "@/lib/domain/streak";

const saveSessionSchema = z.object({
  subjectId: z.string().uuid().optional(),
  chapterId: z.string().uuid().optional(),
  topicId: z.string().uuid().optional(),
  sessionType: z.enum(["FOCUS", "SHORT_BREAK", "LONG_BREAK"]),
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date(),
});

export async function saveStudySessionAction(input: z.infer<typeof saveSessionSchema>) {
  const { profile } = await requireUserAction();
  const parsed = saveSessionSchema.parse(input);
  const durationSeconds = Math.max(1, Math.round((parsed.endedAt.getTime() - parsed.startedAt.getTime()) / 1000));

  await prisma.studySession.create({ data: { ...parsed, userId: profile.id, durationSeconds } });

  // Only real focused study time advances the streak/daily goal — breaks don't count.
  if (parsed.sessionType === "FOCUS") {
    await registerStudyMinutes(profile.id, Math.round(durationSeconds / 60), parsed.endedAt);
  }

  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  return { durationSeconds };
}

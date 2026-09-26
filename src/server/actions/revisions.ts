"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUserAction } from "@/lib/auth";
import { nextRevisionStage, computeDueDate } from "@/lib/domain/revision";

const markRevisedSchema = z.object({
  topicId: z.string().uuid(),
  accuracyPercent: z.number().min(0).max(100).optional(),
});

/** Marks a topic revised today and reschedules it (Section 17 — adaptive intervals). */
export async function markRevisedAction(input: z.infer<typeof markRevisedSchema>) {
  const { profile } = await requireUserAction();
  const { topicId, accuracyPercent } = markRevisedSchema.parse(input);

  const revision = await prisma.revision.upsert({
    where: { userId_topicId: { userId: profile.id, topicId } },
    update: {},
    create: { userId: profile.id, topicId, stage: 0, dueDate: new Date(), status: "DUE" },
  });

  const nextStage = nextRevisionStage(revision.stage, accuracyPercent ?? null);
  const dueDate = computeDueDate(nextStage);

  await prisma.$transaction([
    prisma.revision.update({
      where: { id: revision.id },
      data: { stage: nextStage, dueDate, status: "DONE", lastRevisedAt: new Date() },
    }),
    prisma.revisionHistory.create({
      data: { revisionId: revision.id, accuracyAtReview: accuracyPercent },
    }),
  ]);

  // Flip back to DUE once the due date actually arrives — cron-less approach:
  // the revision list query already filters by dueDate <= now, so a DONE
  // row with a future dueDate simply won't show up until then; we still set
  // status back to DUE now so it's consistent if dueDate is today (stage 0).
  if (dueDate <= new Date()) {
    await prisma.revision.update({ where: { id: revision.id }, data: { status: "DUE" } });
  }

  revalidatePath("/revision");
  revalidatePath("/dashboard");
}

export async function snoozeRevisionAction(revisionId: string, days = 1) {
  const { profile } = await requireUserAction();
  const revision = await prisma.revision.findUnique({ where: { id: revisionId } });
  if (!revision || revision.userId !== profile.id) throw new Error("NOT_FOUND");

  await prisma.revision.update({
    where: { id: revisionId },
    data: { dueDate: addDays(new Date(), days), status: "SNOOZED" },
  });
  revalidatePath("/revision");
  revalidatePath("/dashboard");
}

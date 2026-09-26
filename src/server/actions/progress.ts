"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserAction } from "@/lib/auth";
import { computeDueDate } from "@/lib/domain/revision";

const updateSchema = z.object({
  topicId: z.string().uuid(),
  status: z.enum(["NOT_STARTED", "LEARNING", "PRACTICING", "COMPLETED", "NEEDS_REVISION"]),
  confidence: z.number().min(1).max(5).optional(),
});

export async function updateTopicProgressAction(input: z.infer<typeof updateSchema>) {
  const { profile } = await requireUserAction();
  const { topicId, status, confidence } = updateSchema.parse(input);

  await prisma.topicProgress.upsert({
    where: { userId_topicId: { userId: profile.id, topicId } },
    update: { status, ...(confidence !== undefined ? { confidence } : {}) },
    create: { userId: profile.id, topicId, status, confidence },
  });

  // Reaching COMPLETED for the first time schedules the topic into the
  // revision engine at stage 0 (due immediately). NEEDS_REVISION nudges an
  // existing schedule to be due today instead of creating a duplicate.
  if (status === "COMPLETED" || status === "NEEDS_REVISION") {
    const existing = await prisma.revision.findUnique({
      where: { userId_topicId: { userId: profile.id, topicId } },
    });
    if (!existing) {
      await prisma.revision.create({
        data: { userId: profile.id, topicId, stage: 0, dueDate: computeDueDate(0), status: "DUE" },
      });
    } else if (status === "NEEDS_REVISION") {
      await prisma.revision.update({
        where: { id: existing.id },
        data: { dueDate: new Date(), status: "DUE" },
      });
    }
  }

  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    select: { chapter: { select: { subject: { select: { exam: true, slug: true } } } } },
  });

  revalidatePath("/dashboard");
  revalidatePath("/revision");
  if (topic) revalidatePath(`/study/${topic.chapter.subject.exam.slug}/${topic.chapter.subject.slug}`);
}

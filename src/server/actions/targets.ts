"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUserAction } from "@/lib/auth";

async function getOrCreateTodayTarget(userId: string) {
  const today = startOfDay(new Date());
  return prisma.dailyTarget.upsert({
    where: { userId_date: { userId, date: today } },
    update: {},
    create: { userId, date: today },
  });
}

export async function toggleTargetItemAction(itemId: string, isDone: boolean) {
  const { profile } = await requireUserAction();
  const item = await prisma.dailyTargetItem.findUnique({
    where: { id: itemId },
    include: { dailyTarget: true },
  });
  if (!item || item.dailyTarget.userId !== profile.id) throw new Error("NOT_FOUND");

  await prisma.dailyTargetItem.update({ where: { id: itemId }, data: { isDone } });
  revalidatePath("/dashboard");
  revalidatePath("/plan");
}

const addItemSchema = z.object({
  label: z.string().min(2).max(200),
  topicId: z.string().uuid().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

export async function addTargetItemAction(input: z.infer<typeof addItemSchema>) {
  const { profile } = await requireUserAction();
  const parsed = addItemSchema.parse(input);
  const target = await getOrCreateTodayTarget(profile.id);

  const count = await prisma.dailyTargetItem.count({ where: { dailyTargetId: target.id } });

  let subjectId: string | undefined;
  let chapterId: string | undefined;
  if (parsed.topicId) {
    const topic = await prisma.topic.findUnique({ where: { id: parsed.topicId }, select: { chapterId: true, chapter: { select: { subjectId: true } } } });
    chapterId = topic?.chapterId;
    subjectId = topic?.chapter.subjectId;
  }

  await prisma.dailyTargetItem.create({
    data: { ...parsed, dailyTargetId: target.id, order: count, subjectId, chapterId },
  });
  revalidatePath("/dashboard");
  revalidatePath("/plan");
}

export async function deleteTargetItemAction(itemId: string) {
  const { profile } = await requireUserAction();
  const item = await prisma.dailyTargetItem.findUnique({ where: { id: itemId }, include: { dailyTarget: true } });
  if (!item || item.dailyTarget.userId !== profile.id) throw new Error("NOT_FOUND");
  await prisma.dailyTargetItem.delete({ where: { id: itemId } });
  revalidatePath("/dashboard");
  revalidatePath("/plan");
}

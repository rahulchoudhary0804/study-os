"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserAction } from "@/lib/auth";
import { appToday } from "@/lib/dates";

async function getOrCreateTodayTarget(userId: string) {
  const today = appToday();
  return prisma.dailyTarget.upsert({
    where: { userId_date: { userId, date: today } },
    update: {},
    create: { userId, date: today },
  });
}

function revalidatePlan() {
  revalidatePath("/dashboard");
  revalidatePath("/plan");
  revalidatePath("/assistant");
}

async function assertOwnItem(itemId: string, userId: string) {
  const item = await prisma.dailyTargetItem.findUnique({ where: { id: itemId }, include: { dailyTarget: true } });
  if (!item || item.dailyTarget.userId !== userId) throw new Error("NOT_FOUND");
  return item;
}

export async function toggleTargetItemAction(itemId: string, isDone: boolean) {
  const { profile } = await requireUserAction();
  await assertOwnItem(itemId, profile.id);
  await prisma.dailyTargetItem.update({ where: { id: itemId }, data: { isDone } });
  revalidatePlan();
}

const addItemSchema = z.object({
  label: z.string().min(2).max(200),
  topicId: z.string().uuid().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

/** Adds one free-text (or single-topic) item to today's plan. */
export async function addTargetItemAction(input: z.infer<typeof addItemSchema>) {
  const { profile } = await requireUserAction();
  const parsed = addItemSchema.parse(input);
  const target = await getOrCreateTodayTarget(profile.id);

  const [count, topic] = await Promise.all([
    prisma.dailyTargetItem.count({ where: { dailyTargetId: target.id } }),
    parsed.topicId
      ? prisma.topic.findUnique({ where: { id: parsed.topicId }, select: { chapterId: true, chapter: { select: { subjectId: true } } } })
      : null,
  ]);

  await prisma.dailyTargetItem.create({
    data: {
      ...parsed,
      dailyTargetId: target.id,
      order: count,
      chapterId: topic?.chapterId,
      subjectId: topic?.chapter.subjectId,
    },
  });
  revalidatePlan();
}

const addTopicsSchema = z.object({ topicIds: z.array(z.string().uuid()).min(1).max(100) });

/**
 * Adds every picked syllabus topic to today's plan in one go (the subject →
 * chapter → topic checkbox picker). Topics already in today's plan are skipped.
 */
export async function addTopicsToTodayAction(input: z.infer<typeof addTopicsSchema>) {
  const { profile } = await requireUserAction();
  const { topicIds } = addTopicsSchema.parse(input);
  const target = await getOrCreateTodayTarget(profile.id);

  const [existing, topics] = await Promise.all([
    prisma.dailyTargetItem.findMany({ where: { dailyTargetId: target.id }, select: { topicId: true } }),
    prisma.topic.findMany({
      where: { id: { in: topicIds } },
      select: {
        id: true,
        name: true,
        chapterId: true,
        order: true,
        chapter: { select: { subjectId: true, order: true, subject: { select: { order: true, name: true } } } },
      },
    }),
  ]);

  const already = new Set(existing.map((e) => e.topicId));
  const fresh = topics
    .filter((t) => !already.has(t.id))
    .sort(
      (a, b) =>
        a.chapter.subject.order - b.chapter.subject.order || a.chapter.order - b.chapter.order || a.order - b.order
    );

  if (fresh.length > 0) {
    await prisma.dailyTargetItem.createMany({
      data: fresh.map((t, i) => ({
        dailyTargetId: target.id,
        label: t.name,
        order: existing.length + i,
        topicId: t.id,
        chapterId: t.chapterId,
        subjectId: t.chapter.subjectId,
      })),
    });
  }
  revalidatePlan();
  return { added: fresh.length, skipped: topics.length - fresh.length };
}

const swapItemSchema = z.object({ itemId: z.string().uuid(), newTopicId: z.string().uuid() });

/** Swaps a scheduled item's topic for a different one the student would rather study instead. */
export async function swapTargetItemAction(input: z.infer<typeof swapItemSchema>) {
  const { profile } = await requireUserAction();
  const { itemId, newTopicId } = swapItemSchema.parse(input);
  await assertOwnItem(itemId, profile.id);

  const topic = await prisma.topic.findUniqueOrThrow({
    where: { id: newTopicId },
    select: { name: true, chapterId: true, chapter: { select: { subjectId: true } } },
  });

  await prisma.dailyTargetItem.update({
    where: { id: itemId },
    data: {
      topicId: newTopicId,
      chapterId: topic.chapterId,
      subjectId: topic.chapter.subjectId,
      label: topic.name,
      isDone: false,
    },
  });
  revalidatePlan();
  revalidatePath("/planner");
}

export async function deleteTargetItemAction(itemId: string) {
  const { profile } = await requireUserAction();
  await assertOwnItem(itemId, profile.id);
  await prisma.dailyTargetItem.delete({ where: { id: itemId } });
  revalidatePlan();
}

/** Empties today's plan (keeps nothing) — for starting over. */
export async function clearTodayPlanAction() {
  const { profile } = await requireUserAction();
  await prisma.dailyTargetItem.deleteMany({ where: { dailyTarget: { userId: profile.id, date: appToday() } } });
  await prisma.dailyTarget.updateMany({
    where: { userId: profile.id, date: appToday() },
    data: { generatedByAI: false, aiRationale: null },
  });
  revalidatePlan();
}

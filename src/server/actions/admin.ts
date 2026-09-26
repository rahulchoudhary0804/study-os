"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserAction } from "@/lib/auth";

async function requireAdmin() {
  const user = await requireUserAction();
  if (!user.profile.isAdmin) throw new Error("FORBIDDEN");
  return user;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/['".,()&]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const updateChapterSchema = z.object({
  id: z.string().uuid(),
  priority: z.number().int().min(1).max(4).optional(),
  description: z.string().optional(),
  importance: z.string().optional(),
  sourceRef: z.string().optional(),
  isDeleted: z.boolean().optional(),
});

export async function updateChapterAction(input: z.infer<typeof updateChapterSchema>) {
  await requireAdmin();
  const { id, ...data } = updateChapterSchema.parse(input);
  await prisma.chapter.update({ where: { id }, data });
  revalidatePath("/admin/content");
}

const updateTopicSchema = z.object({
  id: z.string().uuid(),
  priority: z.number().int().min(1).max(4).optional(),
  description: z.string().optional(),
  isDeleted: z.boolean().optional(),
});

export async function updateTopicAction(input: z.infer<typeof updateTopicSchema>) {
  await requireAdmin();
  const { id, ...data } = updateTopicSchema.parse(input);
  await prisma.topic.update({ where: { id }, data });
  revalidatePath("/admin/content");
}

// ---------------------------------------------------------------------------
// JSON syllabus import (Section 38)
// Shape: { exam, subject, chapter, priority, topics: [{ name, priority }] }
// Accepts a single object or an array of them.
// ---------------------------------------------------------------------------
const importRowSchema = z.object({
  exam: z.string(),
  subject: z.string(),
  chapter: z.string(),
  priority: z.number().int().min(1).max(4).default(3),
  description: z.string().optional(),
  importance: z.string().optional(),
  topics: z
    .array(
      z.object({
        name: z.string(),
        priority: z.number().int().min(1).max(4).default(3),
        description: z.string().optional(),
      })
    )
    .default([]),
});

export async function importSyllabusJsonAction(jsonText: string) {
  await requireAdmin();
  const raw = JSON.parse(jsonText);
  const rows = z.array(importRowSchema).parse(Array.isArray(raw) ? raw : [raw]);

  let chapterCount = 0;
  let topicCount = 0;

  for (const row of rows) {
    const exam = await prisma.exam.upsert({
      where: { slug: slugify(row.exam) },
      update: {},
      create: { slug: slugify(row.exam), name: row.exam },
    });
    const subject = await prisma.subject.upsert({
      where: { examId_slug: { examId: exam.id, slug: slugify(row.subject) } },
      update: {},
      create: { examId: exam.id, slug: slugify(row.subject), name: row.subject },
    });
    const chapter = await prisma.chapter.upsert({
      where: { subjectId_slug: { subjectId: subject.id, slug: slugify(row.chapter) } },
      update: { priority: row.priority, description: row.description, importance: row.importance },
      create: {
        subjectId: subject.id,
        slug: slugify(row.chapter),
        name: row.chapter,
        priority: row.priority,
        description: row.description,
        importance: row.importance,
      },
    });
    chapterCount++;

    for (const t of row.topics) {
      await prisma.topic.upsert({
        where: { chapterId_slug: { chapterId: chapter.id, slug: slugify(t.name) } },
        update: { priority: t.priority, description: t.description },
        create: { chapterId: chapter.id, slug: slugify(t.name), name: t.name, priority: t.priority, description: t.description },
      });
      topicCount++;
    }
  }

  revalidatePath("/admin/content");
  revalidatePath("/admin");
  return { chapterCount, topicCount };
}

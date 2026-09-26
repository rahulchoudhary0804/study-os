"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserAction } from "@/lib/auth";

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  content: z.string().max(20000),
  topicId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
});

export async function upsertNoteAction(input: z.infer<typeof upsertSchema>) {
  const { profile } = await requireUserAction();
  const { id, ...data } = upsertSchema.parse(input);

  if (id) {
    const existing = await prisma.note.findUnique({ where: { id } });
    if (!existing || existing.userId !== profile.id) throw new Error("NOT_FOUND");
    await prisma.note.update({ where: { id }, data });
  } else {
    await prisma.note.create({ data: { ...data, userId: profile.id } });
  }
  revalidatePath("/notes");
}

export async function deleteNoteAction(id: string) {
  const { profile } = await requireUserAction();
  const existing = await prisma.note.findUnique({ where: { id } });
  if (!existing || existing.userId !== profile.id) throw new Error("NOT_FOUND");
  await prisma.note.delete({ where: { id } });
  revalidatePath("/notes");
}

export async function togglePinNoteAction(id: string, isPinned: boolean) {
  const { profile } = await requireUserAction();
  const existing = await prisma.note.findUnique({ where: { id } });
  if (!existing || existing.userId !== profile.id) throw new Error("NOT_FOUND");
  await prisma.note.update({ where: { id }, data: { isPinned } });
  revalidatePath("/notes");
}

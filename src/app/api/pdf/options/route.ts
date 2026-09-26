import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  if (type === "subjects") {
    const examId = searchParams.get("examId");
    if (!examId) return NextResponse.json([]);
    const subjects = await prisma.subject.findMany({ where: { examId }, orderBy: { order: "asc" } });
    return NextResponse.json(subjects.map((s) => ({ id: s.id, name: s.name })));
  }

  if (type === "chapters") {
    const subjectId = searchParams.get("subjectId");
    if (!subjectId) return NextResponse.json([]);
    const chapters = await prisma.chapter.findMany({ where: { subjectId, isDeleted: false }, orderBy: { order: "asc" } });
    return NextResponse.json(chapters.map((c) => ({ id: c.id, name: c.name })));
  }

  if (type === "topics") {
    const chapterId = searchParams.get("chapterId");
    if (!chapterId) return NextResponse.json([]);
    const topics = await prisma.topic.findMany({ where: { chapterId, isDeleted: false }, orderBy: { order: "asc" } });
    return NextResponse.json(topics.map((t) => ({ id: t.id, name: t.name })));
  }

  return NextResponse.json([]);
}

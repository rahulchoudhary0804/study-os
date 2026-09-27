import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NotesClient } from "@/components/notes/notes-client";
import { RobotCue } from "@/components/study-robot/robot-cue";

export default async function NotesPage() {
  const { profile } = await requireUser();
  const notes = await prisma.note.findMany({
    where: { userId: profile.id },
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    include: { topic: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      <RobotCue state="curious" message="Ooh, your notes! 📚" sessionKey="notes-open" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Notes</h1>
        <p className="text-sm text-muted-foreground mt-1">Your notes, plus anything saved from AI-generated topic notes.</p>
      </div>
      <NotesClient
        notes={notes.map((n) => ({
          id: n.id,
          title: n.title,
          content: n.content,
          isAIGenerated: n.isAIGenerated,
          isPinned: n.isPinned,
          tags: n.tags,
          topicName: n.topic?.name ?? null,
        }))}
      />
    </div>
  );
}

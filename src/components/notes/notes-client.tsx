"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pin, PinOff, Trash2, Plus, Sparkles } from "lucide-react";
import { upsertNoteAction, deleteNoteAction, togglePinNoteAction } from "@/server/actions/notes";
import { toast } from "sonner";
import { setRobotState } from "@/components/study-robot/robot-store";

export interface NoteDTO {
  id: string;
  title: string;
  content: string;
  isAIGenerated: boolean;
  isPinned: boolean;
  tags: unknown;
  topicName?: string | null;
}

function NoteEditorDialog({ note, trigger }: { note?: NoteDTO; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setRobotState("writing", { message: note ? "Let's polish this ✍️" : "New note! ✍️", duration: 2500 });
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{note ? "Edit note" : "New note"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title" />
          </div>
          <div className="space-y-1.5">
            <Label>Content</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8} placeholder="Write your note…" />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={isPending || !title.trim()}
            onClick={() =>
              startTransition(async () => {
                await upsertNoteAction({ id: note?.id, title, content });
                setOpen(false);
                router.refresh();
                toast.success(note ? "Note updated" : "Note created");
                setRobotState("happy", { message: "Saved! 📝" });
              })
            }
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NotesClient({ notes }: { notes: NoteDTO[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pinned = notes.filter((n) => n.isPinned);
  const rest = notes.filter((n) => !n.isPinned);

  function NoteCard({ n }: { n: NoteDTO }) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{n.title}</p>
            {n.topicName && <p className="text-xs text-muted-foreground truncate">{n.topicName}</p>}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              disabled={isPending}
              aria-label={n.isPinned ? "Unpin note" : "Pin note"}
              onClick={() =>
                startTransition(async () => {
                  await togglePinNoteAction(n.id, !n.isPinned);
                  router.refresh();
                })
              }
            >
              {n.isPinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-destructive"
              disabled={isPending}
              aria-label="Delete note"
              onClick={() =>
                startTransition(async () => {
                  await deleteNoteAction(n.id);
                  router.refresh();
                  toast.success("Note deleted");
                })
              }
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {n.isAIGenerated && (
            <Badge variant="secondary" className="bg-primary/10 text-primary mb-2">
              <Sparkles className="size-3 mr-1" /> AI Generated
            </Badge>
          )}
          <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">{n.content}</p>
          <NoteEditorDialog
            note={n}
            trigger={
              <Button variant="link" size="sm" className="px-0 mt-1">
                Edit
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <NoteEditorDialog
        trigger={
          <Button>
            <Plus className="size-4 mr-1.5" /> New Note
          </Button>
        }
      />

      {pinned.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">Pinned</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pinned.map((n) => (
              <NoteCard key={n.id} n={n} />
            ))}
          </div>
        </div>
      )}

      <div>
        {pinned.length > 0 && <h2 className="text-sm font-medium text-muted-foreground mb-2">All notes</h2>}
        {rest.length === 0 && pinned.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet — create one, or generate AI notes from any topic page.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((n) => (
              <NoteCard key={n.id} n={n} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

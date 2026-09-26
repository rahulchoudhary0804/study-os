"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { markRevisedAction, snoozeRevisionAction } from "@/server/actions/revisions";
import { format } from "date-fns";
import { toast } from "sonner";

export function RevisionRow({
  revisionId,
  topicId,
  topicName,
  chapterName,
  subjectName,
  dueDate,
  href,
}: {
  revisionId: string;
  topicId: string;
  topicName: string;
  chapterName: string;
  subjectName: string;
  dueDate: Date;
  href: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex items-center justify-between py-3 gap-3">
      <div className="min-w-0">
        <Link href={href} className="text-sm font-medium hover:underline">
          {topicName}
        </Link>
        <p className="text-xs text-muted-foreground truncate">
          {subjectName} → {chapterName} · due {format(dueDate, "d MMM")}
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await snoozeRevisionAction(revisionId, 1);
              toast.success("Snoozed 1 day");
              router.refresh();
            })
          }
        >
          Snooze
        </Button>
        <Button
          size="sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await markRevisedAction({ topicId });
              toast.success("Marked revised");
              router.refresh();
            })
          }
        >
          Revise Now
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markRevisedAction, snoozeRevisionAction } from "@/server/actions/revisions";
import { toast } from "sonner";

export function RevisionActions({
  topicId,
  revisionId,
}: {
  topicId: string;
  revisionId?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await markRevisedAction({ topicId });
            toast.success("Marked revised — next review scheduled");
          })
        }
      >
        Mark Revised
      </Button>
      {revisionId && (
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await snoozeRevisionAction(revisionId, 1);
              toast.success("Snoozed 1 day");
            })
          }
        >
          Snooze 1 day
        </Button>
      )}
    </div>
  );
}

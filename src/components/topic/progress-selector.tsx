"use client";

import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateTopicProgressAction } from "@/server/actions/progress";
import { toast } from "sonner";

const OPTIONS = [
  { value: "NOT_STARTED", label: "⚪ Not Started" },
  { value: "LEARNING", label: "🟡 Learning" },
  { value: "PRACTICING", label: "🔵 Practicing" },
  { value: "COMPLETED", label: "🟢 Completed" },
  { value: "NEEDS_REVISION", label: "🔴 Needs Revision" },
];

export function ProgressSelector({ topicId, initialStatus }: { topicId: string; initialStatus: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      defaultValue={initialStatus}
      disabled={isPending}
      onValueChange={(status) =>
        startTransition(async () => {
          try {
            await updateTopicProgressAction({ topicId, status: status as never });
            toast.success("Progress updated");
          } catch {
            toast.error("Couldn't update progress");
          }
        })
      }
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

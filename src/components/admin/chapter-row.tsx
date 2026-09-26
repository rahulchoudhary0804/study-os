"use client";

import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { updateChapterAction } from "@/server/actions/admin";
import { toast } from "sonner";

export function AdminChapterRow({
  id,
  name,
  priority,
  isDeleted,
  topicCount,
}: {
  id: string;
  name: string;
  priority: number;
  isDeleted: boolean;
  topicCount: number;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <tr className="border-b last:border-0">
      <td className="py-2 pr-3 text-sm">{name}</td>
      <td className="py-2 pr-3 text-xs text-muted-foreground">{topicCount} topics</td>
      <td className="py-2 pr-3">
        <Select
          value={String(priority)}
          disabled={isPending}
          onValueChange={(v) =>
            startTransition(async () => {
              await updateChapterAction({ id, priority: Number(v) });
              toast.success("Priority updated");
            })
          }
        >
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">🔴 P1</SelectItem>
            <SelectItem value="2">🟠 P2</SelectItem>
            <SelectItem value="3">🟡 P3</SelectItem>
            <SelectItem value="4">🟢 P4</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="py-2 pr-3">
        <div className="flex items-center gap-2">
          <Switch
            checked={isDeleted}
            disabled={isPending}
            onCheckedChange={(checked) =>
              startTransition(async () => {
                await updateChapterAction({ id, isDeleted: checked });
                toast.success(checked ? "Marked deleted (hidden from syllabus)" : "Restored");
              })
            }
          />
          <span className="text-xs text-muted-foreground">Deleted from syllabus</span>
        </div>
      </td>
    </tr>
  );
}

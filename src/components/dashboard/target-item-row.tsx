"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { deleteTargetItemAction, toggleTargetItemAction } from "@/server/actions/targets";
import { cn } from "@/lib/utils";
import { SwapTopicButton, type SwapOption } from "@/components/plan/swap-topic-button";
import { BookOpen, MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { setRobotState } from "@/components/study-robot/robot-store";

export interface NcertLink {
  title: string;
  url: string;
}

export function TargetItemRow({
  id,
  label,
  subLabel,
  isDone,
  href,
  topicId,
  ncertLinks = [],
  swapOptions,
  showActions = false,
}: {
  id: string;
  label: string;
  subLabel?: string;
  isDone: boolean;
  href?: string;
  topicId?: string;
  ncertLinks?: NcertLink[];
  swapOptions?: SwapOption[];
  /** Full action bar (NCERT / Ask AI / swap / remove) — on the Today's Plan page. */
  showActions?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useOptimistic(isDone);

  function toggle(checked: boolean) {
    startTransition(async () => {
      setDone(checked);
      const { remaining, total } = await toggleTargetItemAction(id, checked);
      if (!checked) return;
      if (remaining === 0 && total > 0) setRobotState("celebrating", { message: "Daily target complete! 🥳", duration: 5000 });
      else setRobotState("excited", { message: `Task done! ${remaining} to go ✨` });
    });
  }

  function remove() {
    startTransition(async () => {
      try {
        await deleteTargetItemAction(id);
        router.refresh();
      } catch {
        toast.error("Couldn't remove that item.");
      }
    });
  }

  return (
    <div className={cn("flex items-start gap-3 py-2.5", isPending && "opacity-70")}>
      <Checkbox checked={done} onCheckedChange={(checked) => toggle(checked === true)} className="mt-0.5" />
      <div className={cn("flex-1 min-w-0", done && "opacity-50")}>
        {href ? (
          <Link href={href} prefetch={false} className={cn("text-sm font-medium hover:underline", done && "line-through")}>
            {label}
          </Link>
        ) : (
          <p className={cn("text-sm font-medium", done && "line-through")}>{label}</p>
        )}
        {subLabel && <p className="text-xs text-muted-foreground">{subLabel}</p>}

        {showActions && topicId && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {ncertLinks.length === 1 && (
              <Button asChild size="xs" variant="outline">
                <a href={ncertLinks[0].url} target="_blank" rel="noopener noreferrer">
                  <BookOpen /> View NCERT chapter
                </a>
              </Button>
            )}
            {ncertLinks.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="xs" variant="outline">
                    <BookOpen /> View NCERT chapter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {ncertLinks.map((l) => (
                    <DropdownMenuItem key={l.url} asChild>
                      <a href={l.url} target="_blank" rel="noopener noreferrer">
                        {l.title}
                      </a>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button asChild size="xs" variant="outline">
              <Link href={`/assistant?topicId=${topicId}`}>
                <MessageCircle /> Ask AI Assistant
              </Link>
            </Button>
          </div>
        )}
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        {topicId && <SwapTopicButton itemId={id} options={swapOptions} />}
        {showActions && (
          <Button variant="ghost" size="icon-sm" aria-label="Remove from plan" title="Remove from plan" onClick={remove}>
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

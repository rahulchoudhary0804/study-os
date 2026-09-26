"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { toggleTargetItemAction } from "@/server/actions/targets";
import { cn } from "@/lib/utils";
import { SwapTopicButton } from "@/components/plan/swap-topic-button";

export function TargetItemRow({
  id,
  label,
  subLabel,
  isDone,
  href,
  topicId,
}: {
  id: string;
  label: string;
  subLabel?: string;
  isDone: boolean;
  href?: string;
  topicId?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-start gap-3 py-2.5">
      <Checkbox
        checked={isDone}
        disabled={isPending}
        onCheckedChange={(checked) => startTransition(() => toggleTargetItemAction(id, checked === true))}
        className="mt-0.5"
      />
      <div className={cn("flex-1 min-w-0", isDone && "opacity-50")}>
        {href ? (
          <Link href={href} className={cn("text-sm font-medium hover:underline", isDone && "line-through")}>
            {label}
          </Link>
        ) : (
          <p className={cn("text-sm font-medium", isDone && "line-through")}>{label}</p>
        )}
        {subLabel && <p className="text-xs text-muted-foreground">{subLabel}</p>}
      </div>
      {topicId && !isDone && <SwapTopicButton itemId={id} />}
    </div>
  );
}

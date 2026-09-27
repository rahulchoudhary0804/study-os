"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { clearTodayPlanAction } from "@/server/actions/targets";

export function ClearPlanButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Remove everything from today's plan?")) return;
        startTransition(async () => {
          await clearTodayPlanAction();
          router.refresh();
        });
      }}
    >
      {isPending ? "Clearing…" : "Clear all"}
    </Button>
  );
}

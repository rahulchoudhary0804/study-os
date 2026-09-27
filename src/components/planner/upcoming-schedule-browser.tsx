"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot } from "lucide-react";
import { TargetItemRow } from "@/components/dashboard/target-item-row";
import type { UpcomingScheduleDay } from "@/server/queries/planner";

function formatDate(date: Date) {
  // UTC-midnight calendar date (see src/lib/dates.ts) — format in UTC so it never shifts a day.
  return new Date(date).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

export function UpcomingScheduleBrowser({ days }: { days: UpcomingScheduleDay[] }) {
  const weeks: UpcomingScheduleDay[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  const [openWeek, setOpenWeek] = useState(0);

  return (
    <Card>
      <CardContent className="pt-5 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {weeks.map((_, i) => (
            <Button
              key={i}
              size="sm"
              variant={openWeek === i ? "default" : "outline"}
              onClick={() => setOpenWeek(i)}
              className="rounded-full"
            >
              Week {i + 1}
            </Button>
          ))}
        </div>
        <div className="divide-y">
          {weeks[openWeek]?.map((day) => (
            <div key={day.date.toString()} className="py-3">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-medium text-muted-foreground">{formatDate(day.date)}</p>
                {day.generatedByAI && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] px-1.5 py-0">
                    <Bot className="size-2.5 mr-1" /> AI
                  </Badge>
                )}
              </div>
              <div className="divide-y">
                {day.items.map((item) => (
                  <TargetItemRow
                    key={item.id}
                    id={item.id}
                    label={item.label}
                    isDone={item.isDone}
                    href={item.href ?? undefined}
                    topicId={item.topicId ?? undefined}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

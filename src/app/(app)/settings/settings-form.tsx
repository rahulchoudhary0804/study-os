"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateSettingsAction } from "@/server/actions/settings";
import { toast } from "sonner";

const STREAK_LOCK_DAYS = 7;

export function SettingsForm({
  exams,
  initial,
}: {
  exams: { id: string; name: string }[];
  initial: {
    fullName: string;
    targetExamId: string | null;
    examDate: string | null;
    dailyHourGoal: number;
    minStreakMinutes: number;
    minStreakMinutesUpdatedAt: string | null;
    preferredStudyTime: string | null;
  };
}) {
  const [fullName, setFullName] = useState(initial.fullName);
  const [targetExamId, setTargetExamId] = useState(initial.targetExamId ?? "none");
  const [examDate, setExamDate] = useState(initial.examDate ?? "");
  const [dailyHourGoal, setDailyHourGoal] = useState(initial.dailyHourGoal);
  const [minStreakMinutes, setMinStreakMinutes] = useState(initial.minStreakMinutes);
  const [preferredStudyTime, setPreferredStudyTime] = useState(initial.preferredStudyTime ?? "none");
  const [isPending, startTransition] = useTransition();

  const unlocksAt = initial.minStreakMinutesUpdatedAt
    ? new Date(new Date(initial.minStreakMinutesUpdatedAt).getTime() + STREAK_LOCK_DAYS * 86400_000)
    : null;
  const streakLocked = unlocksAt !== null && unlocksAt > new Date();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Profile &amp; goals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Target exam</Label>
            <Select value={targetExamId} onValueChange={setTargetExamId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not set</SelectItem>
                {exams.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Exam date</Label>
            <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Preferred study time</Label>
            <Select value={preferredStudyTime} onValueChange={setPreferredStudyTime}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not set</SelectItem>
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="afternoon">Afternoon</SelectItem>
                <SelectItem value="evening">Evening</SelectItem>
                <SelectItem value="night">Night</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Daily study goal (hours)</Label>
            <Input
              type="number"
              min={0.5}
              max={16}
              step={0.5}
              value={dailyHourGoal}
              onChange={(e) => setDailyHourGoal(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Minimum minutes for a streak day</Label>
            <Input
              type="number"
              min={5}
              max={480}
              disabled={streakLocked}
              value={minStreakMinutes}
              onChange={(e) => setMinStreakMinutes(Number(e.target.value))}
            />
            {streakLocked && (
              <p className="text-xs text-muted-foreground">
                Locked until {unlocksAt!.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} —
                changing this too often would let you game your streak.
              </p>
            )}
          </div>
        </div>
        <Button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                await updateSettingsAction({
                  fullName,
                  targetExamId: targetExamId === "none" ? null : targetExamId,
                  examDate: examDate || null,
                  dailyHourGoal,
                  minStreakMinutes,
                  preferredStudyTime: preferredStudyTime === "none" ? null : preferredStudyTime,
                });
                toast.success("Settings saved");
              } catch (err) {
                const msg = err instanceof Error ? err.message : "";
                if (msg.startsWith("STREAK_LOCKED:")) {
                  const date = new Date(msg.split(":").slice(1).join(":"));
                  toast.error(`You can change the streak threshold again on ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}.`);
                } else {
                  toast.error("Couldn't save settings.");
                }
              }
            })
          }
        >
          Save changes
        </Button>
      </CardContent>
    </Card>
  );
}

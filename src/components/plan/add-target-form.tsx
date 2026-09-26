"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { addTargetItemAction } from "@/server/actions/targets";

export function AddTargetForm() {
  const [label, setLabel] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!label.trim()) return;
        startTransition(async () => {
          await addTargetItemAction({ label, startTime: startTime || undefined, endTime: endTime || undefined });
          setLabel("");
          setStartTime("");
          setEndTime("");
        });
      }}
      className="flex flex-wrap gap-2 items-center"
    >
      <Input
        placeholder="e.g. Physics — Current Electricity, Kirchhoff's Laws"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="flex-1 min-w-[220px]"
      />
      <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-28" />
      <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-28" />
      <Button type="submit" size="sm" disabled={isPending || !label.trim()}>
        <Plus className="size-4 mr-1" /> Add
      </Button>
    </form>
  );
}

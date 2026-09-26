"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { importSyllabusJsonAction } from "@/server/actions/admin";
import { toast } from "sonner";

const EXAMPLE = `{
  "exam": "JEE Main",
  "subject": "Physics",
  "chapter": "Current Electricity",
  "priority": 1,
  "topics": [
    { "name": "Ohm's Law", "priority": 1 }
  ]
}`;

export function ImportForm() {
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Import syllabus JSON</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Paste a single object or an array of objects shaped like the example below. Existing
          exam/subject/chapter/topic rows are matched by slug and updated in place.
        </p>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={EXAMPLE}
          rows={8}
          className="font-mono text-xs"
        />
        <Button
          disabled={isPending || !text.trim()}
          onClick={() =>
            startTransition(async () => {
              try {
                const result = await importSyllabusJsonAction(text);
                toast.success(`Imported ${result.chapterCount} chapters, ${result.topicCount} topics`);
                setText("");
              } catch {
                toast.error("Invalid JSON or schema — check the format");
              }
            })
          }
        >
          Import
        </Button>
      </CardContent>
    </Card>
  );
}

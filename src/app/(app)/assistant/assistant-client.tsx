"use client";

import { useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { AIChatTab } from "@/components/topic/ai-chat-tab";
import { searchAction, type SearchResult } from "@/server/actions/search";
import { Search } from "lucide-react";

export function AssistantClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const handle = setTimeout(() => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      startTransition(async () => {
        const r = await searchAction(query);
        setResults(r.filter((x) => x.type === "topic"));
      });
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  if (selected) {
    return (
      <div className="space-y-3">
        <button className="text-sm text-muted-foreground hover:underline" onClick={() => setSelected(null)}>
          ← Change topic
        </button>
        <p className="text-sm font-medium">{selected.title}</p>
        <p className="text-xs text-muted-foreground mb-2">{selected.breadcrumb}</p>
        <AIChatTab topicId={selected.id} />
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-lg">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search for a topic to discuss…"
          className="pl-8"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {results.length > 0 && (
        <Card>
          <CardContent className="p-0 divide-y">
            {results.map((r) => (
              <button
                key={r.id}
                className="w-full text-left px-3 py-2.5 hover:bg-muted text-sm"
                onClick={() => setSelected(r)}
              >
                <p className="font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">{r.breadcrumb}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
      <p className="text-xs text-muted-foreground">
        Tip: you can also open the AI Assistant directly from any topic page&apos;s &quot;AI Assistant&quot; tab —
        it starts with that topic&apos;s context automatically.
      </p>
    </div>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Repeat, Search } from "lucide-react";
import { searchAction, type SearchResult } from "@/server/actions/search";
import { swapTargetItemAction } from "@/server/actions/targets";
import { toast } from "sonner";

export interface SwapOption {
  id: string;
  name: string;
  chapterName: string;
}

/**
 * Swap a planned topic for another. Shows the other topics of the same
 * subject first (most swaps are "do this chapter instead"), with search for
 * anything else in the syllabus.
 */
export function SwapTopicButton({ itemId, options = [] }: { itemId: string; options?: SwapOption[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const q = query.trim().toLowerCase();
  const localMatches = q ? options.filter((o) => o.name.toLowerCase().includes(q) || o.chapterName.toLowerCase().includes(q)) : options;

  useEffect(() => {
    if (!open || q.length < 2) return;
    const handle = setTimeout(() => {
      searchAction(query).then((r) => setResults(r.filter((x) => x.type === "topic")));
    }, 250);
    return () => clearTimeout(handle);
  }, [query, q.length, open]);

  function swap(newTopicId: string) {
    startTransition(async () => {
      try {
        await swapTargetItemAction({ itemId, newTopicId });
        toast.success("Topic swapped");
        setOpen(false);
        setQuery("");
        router.refresh();
      } catch {
        toast.error("Couldn't swap that topic.");
      }
    });
  }

  const localIds = new Set(localMatches.map((o) => o.id));
  const remote = q.length >= 2 ? results.filter((r) => !localIds.has(r.id)) : [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Swap topic" title="Swap topic">
          <Repeat className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="text-xs font-medium">Swap with another topic</p>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Filter or search any topic…"
            className="pl-7 h-8 text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="max-h-64 overflow-y-auto -mx-2.5 -mb-2.5 overscroll-contain">
          {localMatches.length === 0 && remote.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              {q.length < 2 ? "Type to search the whole syllabus" : "No topics found"}
            </div>
          )}
          {localMatches.slice(0, 40).map((o) => (
            <button
              key={o.id}
              disabled={isPending}
              onClick={() => swap(o.id)}
              className="w-full text-left px-3 py-2 hover:bg-muted text-sm disabled:opacity-50"
            >
              <div className="font-medium">{o.name}</div>
              <div className="text-xs text-muted-foreground">{o.chapterName}</div>
            </button>
          ))}
          {remote.map((r) => (
            <button
              key={r.id}
              disabled={isPending}
              onClick={() => swap(r.id)}
              className="w-full text-left px-3 py-2 hover:bg-muted text-sm disabled:opacity-50"
            >
              <div className="font-medium">{r.title}</div>
              <div className="text-xs text-muted-foreground">{r.breadcrumb}</div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

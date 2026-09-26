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

export function SwapTopicButton({ itemId }: { itemId: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      searchAction(query).then((r) => setResults(r.filter((x) => x.type === "topic")));
    }, 250);
    return () => clearTimeout(handle);
  }, [query, open]);

  function swap(newTopicId: string) {
    startTransition(async () => {
      await swapTargetItemAction({ itemId, newTopicId });
      toast.success("Topic swapped");
      setOpen(false);
      setQuery("");
      router.refresh();
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Swap topic" title="Swap topic">
          <Repeat className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Search a topic to swap in…"
            className="pl-7 h-8 text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {query.trim().length >= 2 && (
          <div className="max-h-56 overflow-y-auto -mx-2.5 -mb-2.5">
            {results.length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">No topics found</div>}
            {results.map((r) => (
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
        )}
      </PopoverContent>
    </Popover>
  );
}

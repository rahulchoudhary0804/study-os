"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchAction, type SearchResult } from "@/server/actions/search";

export function SearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const boxRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      startTransition(async () => {
        const r = await searchAction(query);
        setResults(r);
      });
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          aria-label="Search chapters, topics and notes"
          placeholder="Search chapters, topics, notes…"
          className="pl-8 h-9"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
        />
      </div>
      {open && query.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-80 overflow-y-auto">
          {isPending && <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>}
          {!isPending && results.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">No results</div>
          )}
          {results.map((r) => (
            <button
              key={`${r.type}-${r.id}`}
              className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
              onClick={() => {
                setOpen(false);
                setQuery("");
                router.push(r.href);
              }}
            >
              <div className="font-medium">{r.title}</div>
              <div className="text-xs text-muted-foreground">{r.breadcrumb}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

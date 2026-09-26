"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NcertEntry } from "@/server/queries/ncert";

const SUBJECT_STYLES = [
  { badge: "bg-blue-500/10 text-blue-700 dark:text-blue-400", ring: "ring-blue-500/20" },
  { badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", ring: "ring-emerald-500/20" },
  { badge: "bg-violet-500/10 text-violet-700 dark:text-violet-400", ring: "ring-violet-500/20" },
  { badge: "bg-orange-500/10 text-orange-700 dark:text-orange-400", ring: "ring-orange-500/20" },
  { badge: "bg-pink-500/10 text-pink-700 dark:text-pink-400", ring: "ring-pink-500/20" },
];

function examTag(examName: string) {
  return examName.toLowerCase().includes("rbse") ? "RBSE" : "JEE";
}

export function NcertLibraryClient({ library }: { library: Record<string, NcertEntry[]> }) {
  const subjects = Object.keys(library).sort();
  const [active, setActive] = useState<string | null>(null);
  const visibleSubjects = active ? subjects.filter((s) => s === active) : subjects;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={active === null ? "default" : "outline"}
          className="rounded-full"
          onClick={() => setActive(null)}
        >
          All subjects
        </Button>
        {subjects.map((s, i) => {
          const style = SUBJECT_STYLES[i % SUBJECT_STYLES.length];
          return (
            <Button
              key={s}
              size="sm"
              variant="outline"
              className={cn(
                "rounded-full border-transparent",
                active === s ? style.badge + " ring-1 " + style.ring : "bg-muted/60 text-muted-foreground"
              )}
              onClick={() => setActive(s)}
            >
              {s}
              <span className="ml-1.5 opacity-60">{library[s].length}</span>
            </Button>
          );
        })}
      </div>

      {visibleSubjects.map((subject) => {
        const i = subjects.indexOf(subject);
        const style = SUBJECT_STYLES[i % SUBJECT_STYLES.length];
        return (
          <Card key={subject} className={cn("border-transparent ring-1", style.ring)}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", style.badge)}>{subject}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {library[subject].map((entry) => (
                <div key={entry.url} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{entry.title}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {entry.appearances.map((a, j) => (
                        <Link
                          key={j}
                          href={a.href}
                          title={a.chapterName !== entry.title ? `${a.examName} calls this "${a.chapterName}"` : a.examName}
                        >
                          <Badge variant="secondary" className="text-xs hover:bg-muted-foreground/10 font-semibold">
                            {examTag(a.examName)}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </div>
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-blue-800 dark:text-blue-300 rounded-md px-3 py-1.5 hover:bg-blue-100 dark:hover:bg-blue-500/20 shrink-0"
                  >
                    Open PDF <ExternalLink className="size-3" />
                  </a>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

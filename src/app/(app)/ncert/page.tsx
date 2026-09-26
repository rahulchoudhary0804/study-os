import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getNcertLibrary } from "@/server/queries/ncert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookMarked, ExternalLink } from "lucide-react";

export default async function NcertPage() {
  await requireUser();
  const library = await getNcertLibrary();
  const subjects = Object.keys(library).sort();
  const totalChapters = Object.values(library).reduce((s, arr) => s + arr.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <BookMarked className="size-6 text-blue-600" /> NCERT Textbook
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Official NCERT Class 12 chapter PDFs, matched to your syllabus. {totalChapters} chapters
          linked — every URL below was individually verified against ncert.nic.in before being
          added (nothing guessed). Chapters NCERT itself doesn&apos;t currently publish (Class 11
          topics, or content removed in NCERT&apos;s own rationalization — e.g. p-Block Elements,
          Polymers, Surface Chemistry) aren&apos;t linked.
        </p>
      </div>

      {subjects.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No NCERT links found yet.
          </CardContent>
        </Card>
      ) : (
        subjects.map((subject) => (
          <Card key={subject}>
            <CardHeader>
              <CardTitle className="text-base">{subject}</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {library[subject].map((entry) => (
                <div key={entry.url} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{entry.title}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {entry.appearances.map((a, i) => (
                        <Link key={i} href={a.href}>
                          <Badge variant="secondary" className="text-xs hover:bg-muted-foreground/10">
                            {a.examName} → {a.subjectName} → {a.chapterName}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </div>
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm bg-blue-50 border border-blue-200 text-blue-800 rounded-md px-3 py-1.5 hover:bg-blue-100 shrink-0"
                  >
                    Open PDF <ExternalLink className="size-3" />
                  </a>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

import { requireUser } from "@/lib/auth";
import { getNcertLibrary } from "@/server/queries/ncert";
import { Card, CardContent } from "@/components/ui/card";
import { BookMarked } from "lucide-react";
import { NcertLibraryClient } from "@/components/ncert/ncert-library-client";

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
        <NcertLibraryClient library={library} />
      )}
    </div>
  );
}

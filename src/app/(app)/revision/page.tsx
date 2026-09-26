import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDueRevisions } from "@/server/queries/revision";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RevisionRow } from "@/components/revision/revision-row";
import { RevisionEmptyPopup } from "@/components/revision/revision-empty-popup";

const GROUPS = [
  { key: "critical" as const, label: "🔴 Critical — 3+ days overdue", },
  { key: "high" as const, label: "🟠 Due now" },
  { key: "medium" as const, label: "🟡 Due soon" },
];

export default async function RevisionPage() {
  const { profile } = await requireUser();
  const [revisions, studySessionCount] = await Promise.all([
    getDueRevisions(profile.id),
    prisma.studySession.count({ where: { userId: profile.id } }),
  ]);
  const isBrandNew = revisions.total === 0 && studySessionCount === 0;

  return (
    <div className="space-y-6">
      {isBrandNew && <RevisionEmptyPopup />}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Revision</h1>
        <p className="text-sm text-muted-foreground mt-1">{revisions.total} topics due for revision today.</p>
      </div>

      {revisions.total === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground text-center py-10">
            {isBrandNew
              ? "Nothing here yet — study a topic first to start tracking revisions."
              : "Nothing due right now — nice work staying on top of it."}
          </CardContent>
        </Card>
      ) : (
        GROUPS.map(
          (g) =>
            revisions[g.key].length > 0 && (
              <Card key={g.key}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {g.label} ({revisions[g.key].length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="divide-y">
                  {revisions[g.key].map((r) => (
                    <RevisionRow
                      key={r.id}
                      revisionId={r.id}
                      topicId={r.topicId}
                      topicName={r.topicName}
                      chapterName={r.chapterName}
                      subjectName={r.subjectName}
                      dueDate={r.dueDate}
                      href={r.href}
                    />
                  ))}
                </CardContent>
              </Card>
            )
        )
      )}
    </div>
  );
}

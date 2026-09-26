import { requireUser } from "@/lib/auth";
import { getDueRevisions } from "@/server/queries/revision";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RevisionRow } from "@/components/revision/revision-row";

const GROUPS = [
  { key: "critical" as const, label: "🔴 Critical — 3+ days overdue", },
  { key: "high" as const, label: "🟠 Due now" },
  { key: "medium" as const, label: "🟡 Due soon" },
];

export default async function RevisionPage() {
  const { profile } = await requireUser();
  const revisions = await getDueRevisions(profile.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Revision</h1>
        <p className="text-sm text-muted-foreground mt-1">{revisions.total} topics due for revision today.</p>
      </div>

      {revisions.total === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground text-center py-10">
            Nothing due right now — nice work staying on top of it.
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

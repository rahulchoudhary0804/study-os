import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminChapterRow } from "@/components/admin/chapter-row";
import { ImportForm } from "@/components/admin/import-form";

export default async function AdminPage() {
  const { profile } = await requireUser();
  if (!profile.isAdmin) redirect("/dashboard");

  const subjects = await prisma.subject.findMany({
    include: {
      exam: true,
      chapters: { orderBy: { order: "asc" }, include: { _count: { select: { topics: true } } } },
    },
    orderBy: [{ exam: { order: "asc" } }, { order: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin — Content Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Edit chapter priority and mark chapters deleted from the syllabus. Topic-level edits and adding
          brand-new chapters/topics are done via JSON import below.
        </p>
      </div>

      <ImportForm />

      {subjects.map((s) => (
        <Card key={s.id}>
          <CardHeader>
            <CardTitle className="text-base">
              {s.exam.name} → {s.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b">
                  <th className="pb-2 font-medium">Chapter</th>
                  <th className="pb-2 font-medium">Topics</th>
                  <th className="pb-2 font-medium">Priority</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {s.chapters.map((c) => (
                  <AdminChapterRow
                    key={c.id}
                    id={c.id}
                    name={c.name}
                    priority={c.priority}
                    isDeleted={c.isDeleted}
                    topicCount={c._count.topics}
                  />
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getSubjectProgress } from "@/server/queries/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowRight } from "lucide-react";

export default async function ExamPage({ params }: { params: Promise<{ examSlug: string }> }) {
  const { examSlug } = await params;
  const { profile } = await requireUser();
  const exam = await prisma.exam.findUnique({ where: { slug: examSlug } });
  if (!exam) notFound();

  const allSubjects = await getSubjectProgress(profile.id);
  const subjects = allSubjects.filter((s) => s.examSlug === examSlug);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/study" className="hover:underline">
            Study
          </Link>{" "}
          / {exam.name}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">{exam.name}</h1>
        {exam.description && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{exam.description}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((s) => (
          <Link key={s.id} href={`/study/${examSlug}/${s.slug}`}>
            <Card className="hover:border-primary/50 transition-colors h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  {s.name}
                  <ArrowRight className="size-4 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{s.totalTopics} topics</span>
                  <span className="font-medium">{s.completionPercent}%</span>
                </div>
                <Progress value={s.completionPercent} className="h-1.5" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

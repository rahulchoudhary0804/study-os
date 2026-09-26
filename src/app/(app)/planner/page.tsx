import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AIPlannerPanel } from "@/components/planner/ai-planner-panel";

export default async function PlannerPage() {
  await requireUser();
  const exams = await prisma.exam.findMany({ where: { isActive: true }, orderBy: { order: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Study Planner</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Builds a plan from your actual completed topics, weak topics, revision backlog and recent study
          hours — not a generic template. Apply it to today&apos;s targets, or use it as a reference for
          the week ahead.
        </p>
      </div>
      <AIPlannerPanel exams={exams} />
    </div>
  );
}

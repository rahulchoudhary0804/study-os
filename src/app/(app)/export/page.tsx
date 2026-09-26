import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExportForm } from "./export-form";

export default async function ExportPage() {
  await requireUser();
  const exams = await prisma.exam.findMany({ where: { isActive: true }, orderBy: { order: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">PDF Export</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Professionally formatted, A4, with cover page, priority badges and page numbers.
        </p>
      </div>
      <ExportForm exams={exams.map((e) => ({ id: e.id, name: e.name }))} />
    </div>
  );
}

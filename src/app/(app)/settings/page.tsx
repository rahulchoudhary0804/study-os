import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const { profile, email } = await requireUser();
  const exams = await prisma.exam.findMany({ where: { isActive: true }, orderBy: { order: "asc" } });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">{email}</p>
      </div>
      <SettingsForm
        exams={exams}
        initial={{
          fullName: profile.fullName ?? "",
          targetExamId: profile.targetExamId,
          examDate: profile.examDate ? profile.examDate.toISOString().slice(0, 10) : null,
          dailyHourGoal: profile.dailyHourGoal,
          minStreakMinutes: profile.minStreakMinutes,
          preferredStudyTime: profile.preferredStudyTime,
        }}
      />
    </div>
  );
}

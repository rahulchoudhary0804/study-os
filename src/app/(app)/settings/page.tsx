import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "./settings-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StyleGrid } from "@/components/theme-style";
import { Download, Palette, Smartphone } from "lucide-react";

export default async function SettingsPage() {
  const { profile, email } = await requireUser();
  const exams = await prisma.exam.findMany({ where: { isActive: true }, orderBy: { order: "asc" } });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">{email}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="size-4" /> Theme style
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Works with both light and dark mode (toggle with the sun/moon button). Saved on this device.
          </p>
        </CardHeader>
        <CardContent>
          <StyleGrid />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="size-4" /> Android app
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Download the APK, open it, and tap Install. If Android asks, allow your browser to &quot;install unknown
            apps&quot;. The app always shows the latest version of Smart Padhai — no updates needed.
          </p>
          <Button asChild size="sm">
            <a href="/downloads/smart-padhai.apk" download="SmartPadhai.apk">
              <Download className="size-4" /> Download Smart Padhai for Android
            </a>
          </Button>
        </CardContent>
      </Card>

      <SettingsForm
        exams={exams}
        initial={{
          fullName: profile.fullName ?? "",
          targetExamId: profile.targetExamId,
          examDate: profile.examDate ? profile.examDate.toISOString().slice(0, 10) : null,
          dailyHourGoal: profile.dailyHourGoal,
          minStreakMinutes: profile.minStreakMinutes,
          minStreakMinutesUpdatedAt: profile.minStreakMinutesUpdatedAt ? profile.minStreakMinutesUpdatedAt.toISOString() : null,
          preferredStudyTime: profile.preferredStudyTime,
        }}
      />
    </div>
  );
}

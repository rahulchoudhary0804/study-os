import { prisma } from "@/lib/prisma";
import { startOfDay, differenceInCalendarDays } from "date-fns";
import { getOverallProgress } from "./progress";
import { getWeakTopics } from "./weakness";
import { getDueRevisions } from "./revision";
import { addAppDays, appToday } from "@/lib/dates";
import type { Profile } from "@prisma/client";

export async function getDashboardData(profile: Profile) {
  const today = startOfDay(new Date());

  const [streak, todayLog, todayTarget, overallProgress, weakTopics, revisions, missedYesterday] = await Promise.all([
    prisma.streak.findUnique({ where: { userId: profile.id } }),
    prisma.studyDayLog.findUnique({ where: { userId_date: { userId: profile.id, date: today } } }),
    prisma.dailyTarget.findUnique({
      where: { userId_date: { userId: profile.id, date: appToday() } },
      include: {
        items: {
          orderBy: { order: "asc" },
          include: { topic: { include: { chapter: { include: { subject: { include: { exam: true } } } } } } },
        },
      },
    }),
    getOverallProgress(profile.id, profile.targetExamId ?? undefined),
    getWeakTopics(profile.id, 3),
    getDueRevisions(profile.id),
    prisma.dailyTargetItem.count({
      where: { isDone: false, dailyTarget: { userId: profile.id, date: addAppDays(appToday(), -1) } },
    }),
  ]);

  const examCountdown = profile.examDate
    ? differenceInCalendarDays(profile.examDate, today)
    : null;

  const todayMinutes = todayLog?.totalMinutes ?? 0;
  const goalMinutes = Math.round(profile.dailyHourGoal * 60);

  const recommendation = buildRecommendation(weakTopics, revisions.total);

  return {
    streak: { current: streak?.currentStreak ?? 0, longest: streak?.longestStreak ?? 0 },
    todayMinutes,
    goalMinutes,
    todayTarget,
    missedYesterday,
    overallProgress,
    weakTopics,
    revisionDueTotal: revisions.total,
    examCountdown,
    recommendation,
  };
}

function buildRecommendation(
  weakTopics: Awaited<ReturnType<typeof getWeakTopics>>,
  revisionDueTotal: number
): string {
  if (weakTopics.length > 0) {
    const top = weakTopics[0];
    const acc = top.accuracyPercent !== null ? `${top.accuracyPercent}% accuracy` : "no recorded accuracy yet";
    return `Focus on "${top.name}" today — ${acc} and ${top.attemptsCount} attempts logged so far. ${top.recommendations[0]}.`;
  }
  if (revisionDueTotal > 0) {
    return `You have ${revisionDueTotal} topic${revisionDueTotal > 1 ? "s" : ""} due for revision — clear those before starting new material.`;
  }
  return "No weak topics detected yet — keep logging practice sessions so we can track your accuracy.";
}

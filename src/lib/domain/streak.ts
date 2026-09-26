import { differenceInCalendarDays, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";

/**
 * Called after every saved StudySession. Rolls the session into today's
 * StudyDayLog, and — only if today's accumulated minutes cross the user's
 * configured minimum — updates the streak. Merely opening the app does not
 * advance the streak; only real logged study time does.
 */
export async function registerStudyMinutes(userId: string, minutes: number, at: Date = new Date()) {
  const day = startOfDay(at);
  const profile = await prisma.profile.findUniqueOrThrow({ where: { id: userId } });

  const log = await prisma.studyDayLog.upsert({
    where: { userId_date: { userId, date: day } },
    update: { totalMinutes: { increment: minutes } },
    create: { userId, date: day, totalMinutes: minutes },
  });

  const targetMet = log.totalMinutes >= profile.minStreakMinutes;
  if (targetMet !== log.targetMet) {
    await prisma.studyDayLog.update({ where: { id: log.id }, data: { targetMet } });
  }

  if (!targetMet) return;

  const streak = await prisma.streak.upsert({
    where: { userId },
    update: {},
    create: { userId, currentStreak: 0, longestStreak: 0 },
  });

  // Already counted today — nothing to do.
  if (streak.lastActiveDate && differenceInCalendarDays(day, streak.lastActiveDate) === 0) return;

  const gap = streak.lastActiveDate ? differenceInCalendarDays(day, streak.lastActiveDate) : null;
  const nextCurrent = gap === 1 ? streak.currentStreak + 1 : 1; // consecutive day vs reset

  await prisma.streak.update({
    where: { userId },
    data: {
      currentStreak: nextCurrent,
      longestStreak: Math.max(streak.longestStreak, nextCurrent),
      lastActiveDate: day,
    },
  });
}

/**
 * Calendar-day helpers for `@db.Date` columns (DailyTarget.date etc.).
 *
 * Postgres DATE values round-trip through Prisma as UTC-midnight `Date`s, and
 * the server may run in UTC (Vercel) or IST (local dev). Using date-fns
 * `startOfDay` gave a different calendar day depending on the machine — and
 * between 00:00 and 05:30 IST a UTC server thought it was still "yesterday".
 * Everything here works in the students' time zone (IST) explicitly.
 */
const APP_TZ_OFFSET_MINUTES = 330; // Asia/Kolkata, UTC+5:30 (no DST)

/** Today's calendar date in IST, as a UTC-midnight Date (what Prisma stores for @db.Date). */
export function appToday(now: Date = new Date()): Date {
  const shifted = new Date(now.getTime() + APP_TZ_OFFSET_MINUTES * 60_000);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()));
}

/** "2026-09-27" → UTC-midnight Date for that calendar day. */
export function parseAppDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Adds whole calendar days to a UTC-midnight date. */
export function addAppDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

/** Human label for a UTC-midnight calendar date, independent of server time zone. */
export function formatAppDate(date: Date, options: Intl.DateTimeFormatOptions): string {
  return date.toLocaleDateString("en-IN", { ...options, timeZone: "UTC" });
}

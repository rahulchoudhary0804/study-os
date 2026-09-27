export interface SchedulableTopic {
  id: string;
  name: string;
  priority: number; // 1 (highest) .. 4 (lowest)
}

export interface ScheduledDay {
  date: Date;
  topicIds: string[];
}

const MINUTES_BY_PRIORITY: Record<number, number> = { 1: 60, 2: 45, 3: 35, 4: 25 };
const MAX_DAYS = 365;

function estimateMinutes(priority: number): number {
  return MINUTES_BY_PRIORITY[Math.min(Math.max(priority, 1), 4)] ?? 35;
}

/**
 * Greedy bin-packs an ordered topic queue across the days from `startDate` to
 * `endDate` (inclusive), filling each day's `hoursPerDay` budget before
 * moving on. Deterministic — no AI call — so it scales to any horizon length
 * without token cost or truncation risk.
 */
export function buildFullSchedule({
  topics,
  startDate,
  endDate,
  hoursPerDay,
}: {
  topics: SchedulableTopic[];
  startDate: Date;
  endDate: Date;
  hoursPerDay: number;
}): ScheduledDay[] {
  const dailyBudgetMinutes = Math.max(15, hoursPerDay * 60);
  const days: ScheduledDay[] = [];

  // Dates are UTC-midnight calendar days (see src/lib/dates.ts) — use UTC math
  // so the result doesn't shift by a day depending on the server time zone.
  let cursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
  const end = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));

  let topicIndex = 0;
  let dayCount = 0;

  while (cursor <= end && topicIndex < topics.length && dayCount < MAX_DAYS) {
    let remainingBudget = dailyBudgetMinutes;
    const dayTopicIds: string[] = [];

    while (topicIndex < topics.length) {
      const topic = topics[topicIndex];
      const cost = estimateMinutes(topic.priority);
      if (dayTopicIds.length > 0 && cost > remainingBudget) break;
      dayTopicIds.push(topic.id);
      remainingBudget -= cost;
      topicIndex++;
      if (remainingBudget <= 0) break;
    }

    if (dayTopicIds.length > 0) {
      days.push({ date: new Date(cursor), topicIds: dayTopicIds });
    }

    cursor = new Date(cursor.getTime() + 86_400_000);
    dayCount++;
  }

  return days;
}

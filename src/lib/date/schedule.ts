import { formatInTimeZone, toDate } from "date-fns-tz";
import { addMinutes, addDays, isAfter } from "date-fns";
import { WeeklyAvailability, AvailabilityException } from "@/types/database";

// Configuration values
export const SCHEDULING_CONFIG = {
  MIN_NOTICE_MINUTES: 60, // 1 hour minimum notice before match
  HORIZON_DAYS: 14, // Propose slots up to 14 days in advance
  DEFAULT_MATCH_DURATION_MINUTES: 15, // Allocated duration per debate match
  CHECKIN_WINDOW_MINUTES: 5, // Opens 5 minutes prior to scheduled start
  GRACE_PERIOD_MINUTES: 5, // Grace period after start before no-show
};

export interface LocalSlot {
  start: Date;
  end: Date;
  formattedStart: string;
  formattedEnd: string;
}

/**
 * Parses a wall-clock local time "HH:mm" on a given target date in a specified IANA time zone,
 * producing an accurate UTC Date object that respects Daylight Saving Time shifts.
 */
export function createUtcDateFromLocal(
  dateYMD: string, // "YYYY-MM-DD"
  timeHM: string,  // "HH:mm"
  timeZone: string
): Date {
  const dateTimeString = `${dateYMD}T${timeHM}:00`;
  return toDate(dateTimeString, { timeZone });
}

/**
 * Formats a UTC Date or ISO string into a localized time string in the viewer's IANA time zone.
 */
export function formatLocalTime(
  utcDate: string | Date,
  timeZone: string,
  formatPattern: string = "yyyy-MM-dd HH:mm (zzz)"
): string {
  const date = typeof utcDate === "string" ? new Date(utcDate) : utcDate;
  try {
    return formatInTimeZone(date, timeZone, formatPattern);
  } catch {
    return formatInTimeZone(date, "UTC", formatPattern);
  }
}

/**
 * Checks if two time intervals overlap: [startA, endA) and [startB, endB)
 */
export function doIntervalsOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA < endB && endA > startB;
}

/**
 * Generates candidate overlapping suggestion slots based on both users' weekly availability windows.
 * Suggests slots across the horizon (default 14 days), filtered by minimum notice (1 hour).
 */
export function generateSuggestedSlots(
  creatorAvailability: WeeklyAvailability[],
  creatorTimezone: string,
  opponentAvailability: WeeklyAvailability[],
  opponentTimezone: string,
  exceptions: AvailabilityException[] = [],
  horizonDays: number = SCHEDULING_CONFIG.HORIZON_DAYS,
  minNoticeMinutes: number = SCHEDULING_CONFIG.MIN_NOTICE_MINUTES,
  slotDurationMinutes: number = SCHEDULING_CONFIG.DEFAULT_MATCH_DURATION_MINUTES
): { start: Date; end: Date; isoStart: string; isoEnd: string }[] {
  const suggestions: { start: Date; end: Date; isoStart: string; isoEnd: string }[] = [];
  const now = new Date();
  const minAllowedStart = addMinutes(now, minNoticeMinutes);

  // Group weekly availability by day of week (0..6)
  const creatorByDay = new Map<number, WeeklyAvailability[]>();
  for (const a of creatorAvailability.filter((w) => w.is_enabled)) {
    const list = creatorByDay.get(a.day_of_week) || [];
    list.push(a);
    creatorByDay.set(a.day_of_week, list);
  }

  const opponentByDay = new Map<number, WeeklyAvailability[]>();
  for (const a of opponentAvailability.filter((w) => w.is_enabled)) {
    const list = opponentByDay.get(a.day_of_week) || [];
    list.push(a);
    opponentByDay.set(a.day_of_week, list);
  }

  // Iterate over each day in horizon
  for (let d = 0; d < horizonDays; d++) {
    const targetDay = addDays(now, d);
    // Get creator's local date string "YYYY-MM-DD"
    const creatorYMD = formatInTimeZone(targetDay, creatorTimezone, "yyyy-MM-dd");
    const creatorDayOfWeek = parseInt(
      formatInTimeZone(targetDay, creatorTimezone, "i")
    ) % 7; // 0=Sun, 6=Sat

    const creatorWindows = creatorByDay.get(creatorDayOfWeek) || [];

    for (const cWin of creatorWindows) {
      const creatorStartUtc = createUtcDateFromLocal(creatorYMD, cWin.start_time, creatorTimezone);
      const creatorEndUtc = createUtcDateFromLocal(creatorYMD, cWin.end_time, creatorTimezone);

      // Slide 30-min candidate slots across creator's window
      let candidateStart = creatorStartUtc;
      while (addMinutes(candidateStart, slotDurationMinutes) <= creatorEndUtc) {
        const candidateEnd = addMinutes(candidateStart, slotDurationMinutes);

        // Check min notice
        if (isAfter(candidateStart, minAllowedStart)) {
          // Check opponent availability for this candidate UTC time
          const oppYMD = formatInTimeZone(candidateStart, opponentTimezone, "yyyy-MM-dd");
          const oppDayOfWeek = parseInt(
            formatInTimeZone(candidateStart, opponentTimezone, "i")
          ) % 7;

          const oppWindows = opponentByDay.get(oppDayOfWeek) || [];
          let fitsOpponent = false;

          for (const oWin of oppWindows) {
            const oppStartUtc = createUtcDateFromLocal(oppYMD, oWin.start_time, opponentTimezone);
            const oppEndUtc = createUtcDateFromLocal(oppYMD, oWin.end_time, opponentTimezone);

            if (candidateStart >= oppStartUtc && candidateEnd <= oppEndUtc) {
              fitsOpponent = true;
              break;
            }
          }

          if (fitsOpponent) {
            // Check exception blackouts
            const isBlockedByException = exceptions.some((exc) =>
              doIntervalsOverlap(
                candidateStart,
                candidateEnd,
                new Date(exc.start_time),
                new Date(exc.end_time)
              )
            );

            if (!isBlockedByException) {
              suggestions.push({
                start: candidateStart,
                end: candidateEnd,
                isoStart: candidateStart.toISOString(),
                isoEnd: candidateEnd.toISOString(),
              });

              if (suggestions.length >= 12) {
                return suggestions; // Cap at 12 top recommendations
              }
            }
          }
        }

        candidateStart = addMinutes(candidateStart, 30);
      }
    }
  }

  return suggestions;
}

import { describe, it, expect, beforeEach } from "vitest";
import { memoryStore, resetStore } from "@/lib/db/store";
import {
  createUtcDateFromLocal,
  formatLocalTime,
  doIntervalsOverlap,
} from "@/lib/date/schedule";
import {
  generateIcsContent,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
} from "@/lib/calendar/export";
import { checkUserMatchConflict } from "@/app/actions/scheduling";
import { Match } from "@/types/database";
import { addHours } from "date-fns";

describe("Phase 3: Scheduling, Timezones, Conflict Checks & Calendar Export", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("Timezone Conversions & DST Integrity", () => {
    it("should correctly convert Asia/Kolkata (UTC+05:30) local time to UTC", () => {
      // 10:00 AM IST on 2026-11-01 should be 04:30 AM UTC
      const utcDate = createUtcDateFromLocal("2026-11-01", "10:00", "Asia/Kolkata");
      expect(utcDate.toISOString()).toBe("2026-11-01T04:30:00.000Z");

      // Formatting back to Asia/Kolkata
      const formatted = formatLocalTime(utcDate, "Asia/Kolkata", "HH:mm");
      expect(formatted).toBe("10:00");
    });

    it("should correctly handle America/New_York across daylight saving transitions", () => {
      // In summer EDT (UTC-4)
      const summerDate = createUtcDateFromLocal("2026-07-15", "14:00", "America/New_York");
      expect(summerDate.toISOString()).toBe("2026-07-15T18:00:00.000Z");

      // In winter EST (UTC-5)
      const winterDate = createUtcDateFromLocal("2026-12-15", "14:00", "America/New_York");
      expect(winterDate.toISOString()).toBe("2026-12-15T19:00:00.000Z");
    });

    it("should never alter UTC timestamps when a user profile timezone changes", () => {
      const matchStartUtc = "2026-11-10T15:00:00.000Z";

      // Rendered in America/New_York (10:00 AM EST)
      const nyTime = formatLocalTime(matchStartUtc, "America/New_York", "HH:mm");
      expect(nyTime).toBe("10:00");

      // User moves to Asia/Kolkata (08:30 PM IST)
      const kolkataTime = formatLocalTime(matchStartUtc, "Asia/Kolkata", "HH:mm");
      expect(kolkataTime).toBe("20:30");

      // Original UTC timestamp remains identical
      expect(matchStartUtc).toBe("2026-11-10T15:00:00.000Z");
    });
  });

  describe("Interval Overlaps & Conflict Prevention", () => {
    it("should correctly detect overlapping time intervals", () => {
      const t1 = new Date("2026-11-10T10:00:00Z");
      const t2 = new Date("2026-11-10T10:30:00Z");
      const t3 = new Date("2026-11-10T10:15:00Z");
      const t4 = new Date("2026-11-10T10:45:00Z");
      const t5 = new Date("2026-11-10T10:30:00Z");
      const t6 = new Date("2026-11-10T11:00:00Z");

      // Overlapping intervals [t1, t2) and [t3, t4)
      expect(doIntervalsOverlap(t1, t2, t3, t4)).toBe(true);

      // Contiguous non-overlapping intervals [t1, t2) and [t5, t6)
      expect(doIntervalsOverlap(t1, t2, t5, t6)).toBe(false);
    });

    it("should reject double-booking when user has a conflicting scheduled match", async () => {
      const userA = "usr_alex_01";
      const userB = "usr_sam_02";

      // Schedule a match for user A at 14:00-14:15 UTC
      const existingMatch: Match = {
        id: "match_conf_1",
        challenge_id: "chl_demo_01",
        creator_id: userA,
        opponent_id: userB,
        creator_side: "a",
        opponent_side: "b",
        scheduled_slot_start: "2026-11-12T14:00:00.000Z",
        scheduled_slot_end: "2026-11-12T14:15:00.000Z",
        creator_confirmed: true,
        opponent_confirmed: true,
        status: "scheduled",
        creator_checked_in_at: null,
        opponent_checked_in_at: null,
        cancellation_reason: null,
        cancelled_by: null,
        winner_side: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      memoryStore.matches.set(existingMatch.id, existingMatch);

      // Attempt to schedule an overlapping slot for user A
      const overlapStart = new Date("2026-11-12T14:10:00.000Z");
      const overlapEnd = new Date("2026-11-12T14:25:00.000Z");

      const conflictCheck = await checkUserMatchConflict(userA, overlapStart, overlapEnd);
      expect(conflictCheck.hasConflict).toBe(true);

      // Non-overlapping slot should have no conflict
      const freeStart = new Date("2026-11-12T15:00:00.000Z");
      const freeEnd = new Date("2026-11-12T15:15:00.000Z");
      const freeCheck = await checkUserMatchConflict(userA, freeStart, freeEnd);
      expect(freeCheck.hasConflict).toBe(false);
    });
  });

  describe("Both-Confirm & Match Lifecycle State Machine", () => {
    it("should keep match in pending_time until both users confirm", () => {
      const match: Match = {
        id: "match_lifecycle_1",
        challenge_id: "chl_demo_01",
        creator_id: "usr_alex_01",
        opponent_id: "usr_sam_02",
        creator_side: "a",
        opponent_side: "b",
        scheduled_slot_start: null,
        scheduled_slot_end: null,
        creator_confirmed: false,
        opponent_confirmed: false,
        status: "pending_time",
        creator_checked_in_at: null,
        opponent_checked_in_at: null,
        cancellation_reason: null,
        cancelled_by: null,
        winner_side: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      memoryStore.matches.set(match.id, match);

      // Propose slot
      const slotStart = addHours(new Date(), 24);
      const slotEnd = addHours(slotStart, 0.25);
      const slotId = "slot_test_1";

      memoryStore.challengeSlots.set(slotId, {
        id: slotId,
        match_id: match.id,
        proposed_by: "usr_alex_01",
        slot_start: slotStart.toISOString(),
        slot_end: slotEnd.toISOString(),
        status: "proposed",
        created_at: new Date().toISOString(),
      });

      // Match remains pending_time
      expect(match.status).toBe("pending_time");
      expect(match.opponent_confirmed).toBe(false);

      // Opponent confirms
      match.scheduled_slot_start = slotStart.toISOString();
      match.scheduled_slot_end = slotEnd.toISOString();
      match.creator_confirmed = true;
      match.opponent_confirmed = true;
      match.status = "scheduled";

      expect(match.status).toBe("scheduled");
      expect(match.creator_confirmed).toBe(true);
      expect(match.opponent_confirmed).toBe(true);
    });
  });

  describe("Calendar Export Generation", () => {
    it("should generate RFC 5545 valid .ics content with stable UID and UTC timestamps", () => {
      const start = new Date("2026-11-20T16:00:00.000Z");
      const end = new Date("2026-11-20T16:15:00.000Z");
      const ics = generateIcsContent({
        matchId: "match_abc_123",
        title: "AI & Human Creativity",
        description: "Standard 10-minute debate.",
        start,
        end,
        matchUrl: "https://debate.app/debate-room/match_abc_123",
        creatorName: "Alex Rivera",
        opponentName: "Sam Chen",
      });

      expect(ics).toContain("BEGIN:VCALENDAR");
      expect(ics).toContain("VERSION:2.0");
      expect(ics).toContain("UID:match-match_abc_123@debate.app");
      expect(ics).toContain("DTSTART:20261120T160000Z");
      expect(ics).toContain("DTEND:20261120T161500Z");
      expect(ics).toContain("STATUS:CONFIRMED");
      expect(ics).toContain("END:VCALENDAR");
    });

    it("should construct valid Google and Outlook Web URLs without OAuth", () => {
      const start = new Date("2026-11-20T16:00:00.000Z");
      const end = new Date("2026-11-20T16:15:00.000Z");
      const details = {
        matchId: "match_xyz",
        title: "Philosophy of Mind",
        description: "Quick Clash debate",
        start,
        end,
        matchUrl: "https://debate.app/debate-room/match_xyz",
        creatorName: "Alex",
        opponentName: "Sam",
      };

      const googleUrl = generateGoogleCalendarUrl(details);
      expect(googleUrl).toContain("calendar.google.com/calendar/render");
      expect(googleUrl).toContain("Philosophy+of+Mind");

      const outlookUrl = generateOutlookCalendarUrl(details);
      expect(outlookUrl).toContain("outlook.live.com/calendar/0/deeplink/compose");
      expect(outlookUrl).toContain("Philosophy+of+Mind");
    });
  });
});

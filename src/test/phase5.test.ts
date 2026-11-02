import { describe, it, expect, beforeEach, vi } from "vitest";
import { memoryStore, resetStore } from "@/lib/db/store";
import { createReportAction, submitModerationAppealAction } from "@/app/actions/reports";
import {
  resolveReportAction,
  requestAccountDeletionAction,
  requestAccountDataExportAction,
} from "@/app/actions/admin";
import {
  muteUserAction,
  unmuteUserAction,
  checkMuteStatus,
} from "@/app/actions/blocks";
import {
  addAvailabilityExceptionAction,
  togglePauseAvailabilityAction,
} from "@/app/actions/scheduling";
import { getCurrentUser, requireAdmin } from "@/lib/auth/session";
import { resetRateLimitStore } from "@/lib/security/rate-limit";
import { Challenge, Match } from "@/types/database";

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(),
  requireAdmin: vi.fn(),
  DEV_SESSION_COOKIE: "debate_dev_session",
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Phase 5: Safety, Reports, Admin Queue, Audit Logs & User Rights", () => {
  const userAdmin = "usr_admin_01";
  const userAlex = "usr_alex_01";
  const userSam = "usr_sam_02";

  function setUser(userId: string | null) {
    if (!userId) {
      vi.mocked(getCurrentUser).mockResolvedValue(null);
      return;
    }
    const profile = memoryStore.profiles.get(userId);
    if (!profile) throw new Error(`User ${userId} not found`);
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: profile.id,
      email: `${profile.username}@example.com`,
      profile,
    });
  }

  function setAdmin(isAdmin: boolean = true) {
    if (!isAdmin) {
      vi.mocked(requireAdmin).mockRejectedValue(new Error("Admin authorization required"));
      return;
    }
    const adminProfile = memoryStore.profiles.get(userAdmin)!;
    vi.mocked(requireAdmin).mockResolvedValue({
      id: adminProfile.id,
      email: `${adminProfile.username}@example.com`,
      profile: adminProfile,
    });
  }

  beforeEach(() => {
    resetStore();
    resetRateLimitStore();
    vi.clearAllMocks();
  });

  describe("Safety Reports & Content Validation", () => {
    it("should reject report creation if user is not authenticated", async () => {
      setUser(null);
      const res = await createReportAction({
        targetType: "user",
        targetId: userSam,
        reason: "Harassment",
        description: "User was using abusive language in debate.",
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain("Authentication required");
    });

    it("should reject reports with dangerous protocol injections", async () => {
      setUser(userAlex);
      const res = await createReportAction({
        targetType: "message",
        targetId: "msg_123",
        reason: "Malicious payload",
        description: "Look at this attack: javascript:alert(document.cookie)",
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain("Prohibited protocol 'javascript:' detected");
    });

    it("should enforce sliding-window rate limit on reports", async () => {
      setUser(userAlex);
      // Limit is 5 reports per 10 minutes
      for (let i = 0; i < 5; i++) {
        const res = await createReportAction({
          targetType: "challenge",
          targetId: `chl_test_${i}`,
          reason: "Spam content",
          description: `This is legitimate report description number ${i} with more than 10 chars.`,
        });
        expect(res.success).toBe(true);
      }

      // 6th report should be throttled
      const throttled = await createReportAction({
        targetType: "challenge",
        targetId: "chl_test_6",
        reason: "Spam",
        description: "Excess report that should be blocked by rate limiter.",
      });
      expect(throttled.success).toBe(false);
      expect(throttled.error).toContain("submitting reports too quickly");
    });
  });

  describe("Admin Authorization & Action Resolution", () => {
    it("should strictly reject non-admins from resolving reports", async () => {
      setAdmin(false);

      await expect(
        resolveReportAction({
          reportId: "rep_any",
          action: "dismiss",
        })
      ).rejects.toThrow("Admin authorization required");
    });

    it("should allow admin to dismiss a report and append to audit log", async () => {
      setAdmin(true);

      const reportId = "rep_test_dismiss";
      memoryStore.reports.set(reportId, {
        id: reportId,
        reporter_id: userAlex,
        target_type: "challenge",
        target_id: "chl_demo_01",
        reason: "Disagreement on premise",
        description: "I don't think this premise is philosophically sound.",
        status: "pending",
        reviewed_by: null,
        review_notes: null,
        reviewed_at: null,
        created_at: new Date().toISOString(),
      });

      const res = await resolveReportAction({
        reportId,
        action: "dismiss",
        notes: "Philosophical disagreement is not a rules violation.",
      });

      expect(res.success).toBe(true);

      const updatedReport = memoryStore.reports.get(reportId);
      expect(updatedReport?.status).toBe("dismissed");
      expect(updatedReport?.reviewed_by).toBe(userAdmin);

      // Verify immutable audit log
      const logs = Array.from(memoryStore.adminAuditLogs.values()).filter(
        (l) => l.action === "dismiss" && l.target_id === "chl_demo_01"
      );
      expect(logs.length).toBe(1);
      expect(logs[0].admin_id).toBe(userAdmin);
    });

    it("should allow admin to hide offending content", async () => {
      setAdmin(true);

      const challengeId = "chl_offensive_1";
      const challenge: Challenge = {
        id: challengeId,
        creator_id: userSam,
        title: "Offensive Title",
        description: "Offensive Description",
        category: "Anything Goes",
        position_a: "Side A",
        position_b: "Side B",
        creator_side: "a",
        format: "quick_clash",
        language: "en",
        visibility: "public",
        deadline_to_find_opponent: null,
        status: "open",
        invite_code: "OFFENSIVE-01",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      memoryStore.challenges.set(challengeId, challenge);

      const reportId = "rep_hide_test";
      memoryStore.reports.set(reportId, {
        id: reportId,
        reporter_id: userAlex,
        target_type: "challenge",
        target_id: challengeId,
        reason: "Hate speech",
        description: "Prohibited hate speech in challenge title.",
        status: "pending",
        reviewed_by: null,
        review_notes: null,
        reviewed_at: null,
        created_at: new Date().toISOString(),
      });

      const res = await resolveReportAction({
        reportId,
        action: "hide_content",
        notes: "Violates community hate speech policy.",
      });

      expect(res.success).toBe(true);
      expect(challenge.status).toBe("cancelled");
    });

    it("should allow admin to warn user and generate official notification", async () => {
      setAdmin(true);

      const reportId = "rep_warn_test";
      memoryStore.reports.set(reportId, {
        id: reportId,
        reporter_id: userAlex,
        target_type: "user",
        target_id: userSam,
        reason: "Bad faith conduct",
        description: "Repeated trolling and aggressive interruptions.",
        status: "pending",
        reviewed_by: null,
        review_notes: null,
        reviewed_at: null,
        created_at: new Date().toISOString(),
      });

      const res = await resolveReportAction({
        reportId,
        action: "warn_user",
        notes: "First warning regarding tone and decorum.",
      });

      expect(res.success).toBe(true);

      const notifs = Array.from(memoryStore.notifications.values()).filter(
        (n) => n.user_id === userSam && n.type === "warning"
      );
      expect(notifs.length).toBe(1);
      expect(notifs[0].title).toContain("Official Moderation Warning");
    });

    it("should suspend user and cancel their active matches upon suspension", async () => {
      setAdmin(true);

      const matchId = "match_active_suspended";
      const match: Match = {
        id: matchId,
        challenge_id: "chl_demo_01",
        creator_id: userSam,
        opponent_id: userAlex,
        creator_side: "a",
        opponent_side: "b",
        scheduled_slot_start: "2026-11-20T12:00:00.000Z",
        scheduled_slot_end: "2026-11-20T12:15:00.000Z",
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
      memoryStore.matches.set(matchId, match);

      const reportId = "rep_suspend_test";
      memoryStore.reports.set(reportId, {
        id: reportId,
        reporter_id: userAlex,
        target_type: "user",
        target_id: userSam,
        reason: "Severe policy breach",
        description: "Documented threat against participant.",
        status: "pending",
        reviewed_by: null,
        review_notes: null,
        reviewed_at: null,
        created_at: new Date().toISOString(),
      });

      const res = await resolveReportAction({
        reportId,
        action: "suspend_user",
        notes: "Severe safety violation.",
      });

      expect(res.success).toBe(true);

      // Verify user suspension
      const samProfile = memoryStore.profiles.get(userSam);
      expect(samProfile?.is_suspended).toBe(true);

      // Verify match cancelled
      expect(match.status).toBe("cancelled");
      expect(match.cancellation_reason).toContain("suspended by platform moderation");
    });
  });

  describe("Muting & Blocking Relations", () => {
    it("should allow muting and unmuting users", async () => {
      setUser(userAlex);

      expect(await checkMuteStatus(userAlex, userSam)).toBe(false);

      const muteRes = await muteUserAction(userSam);
      expect(muteRes.success).toBe(true);
      expect(await checkMuteStatus(userAlex, userSam)).toBe(true);

      const unmuteRes = await unmuteUserAction(userSam);
      expect(unmuteRes.success).toBe(true);
      expect(await checkMuteStatus(userAlex, userSam)).toBe(false);
    });
  });

  describe("Moderation Appeal Submission", () => {
    it("should allow user to file a moderation appeal and appear in admin queue", async () => {
      setUser(userSam);

      const res = await submitModerationAppealAction({
        reason: "Sanction Dispute",
        statement: "I believe my argument was misunderstood in the context of academic citation.",
      });

      expect(res.success).toBe(true);

      const appealReport = Array.from(memoryStore.reports.values()).find(
        (r) => r.reporter_id === userSam && r.target_type === "appeal"
      );
      expect(appealReport).toBeDefined();
      expect(appealReport?.status).toBe("pending");
    });
  });

  describe("Data Export & Account Deletion Requests", () => {
    it("should compile data export bundle for authenticated user", async () => {
      setUser(userAlex);

      const res = await requestAccountDataExportAction();
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(res.data?.profile).toBeDefined();
    });

    it("should flag account for permanent deletion upon user request", async () => {
      setUser(userAlex);

      const res = await requestAccountDeletionAction();
      expect(res.success).toBe(true);

      const profile = memoryStore.profiles.get(userAlex);
      expect(profile?.is_suspended).toBe(true);
      expect(profile?.bio).toContain("[Account marked for permanent deletion]");
    });
  });

  describe("Availability Pause & One-Off Exceptions", () => {
    it("should record one-off unavailable exception", async () => {
      setUser(userAlex);

      const start = "2026-11-25T09:00:00.000Z";
      const end = "2026-11-25T17:00:00.000Z";
      const res = await addAvailabilityExceptionAction(start, end, "Doctor appointment");

      expect(res.success).toBe(true);

      const exceptions = Array.from(memoryStore.availabilityExceptions.values()).filter(
        (e) => e.user_id === userAlex
      );
      expect(exceptions.length).toBe(1);
      expect(exceptions[0].reason).toBe("Doctor appointment");
    });

    it("should pause and resume weekly availability", async () => {
      setUser(userAlex);

      // Pause
      const pauseRes = await togglePauseAvailabilityAction(true);
      expect(pauseRes.success).toBe(true);

      const alexWindows = Array.from(memoryStore.weeklyAvailability.values()).filter(
        (w) => w.user_id === userAlex
      );
      expect(alexWindows.every((w) => !w.is_enabled)).toBe(true);

      // Resume
      const resumeRes = await togglePauseAvailabilityAction(false);
      expect(resumeRes.success).toBe(true);
      expect(alexWindows.every((w) => w.is_enabled)).toBe(true);
    });
  });
});

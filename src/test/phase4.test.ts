import { describe, it, expect, beforeEach, vi } from "vitest";
import { memoryStore, resetStore } from "@/lib/db/store";
import {
  checkInAction,
  postDebateMessageAction,
  advanceDebateRoundAction,
  castVoteAction,
} from "@/app/actions/debate";
import { getCurrentUser } from "@/lib/auth/session";
import { Match, Challenge, NotificationJob } from "@/types/database";
import { resetRateLimitStore } from "@/lib/security/rate-limit";
import { GET as remindersGet } from "@/app/api/cron/reminders/route";
import { env } from "@/lib/env";

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(),
  DEV_SESSION_COOKIE: "debate_dev_session",
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Phase 4: Debate Room, Rounds, Voting & Reminders", () => {
  const userCreator = "usr_alex_01";
  const userOpponent = "usr_sam_02";
  const userSpectator = "usr_jordan_03";

  function setUser(userId: string | null) {
    if (!userId) {
      vi.mocked(getCurrentUser).mockResolvedValue(null);
      return;
    }
    let profile = memoryStore.profiles.get(userId);
    if (!profile) {
      profile = {
        id: userId,
        username: `user_${userId.substring(0, 8)}`,
        display_name: `Test User ${userId}`,
        avatar_url: null,
        bio: "Test user profile",
        timezone: "UTC",
        is_public: true,
        is_admin: false,
        is_suspended: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      memoryStore.profiles.set(profile.id, profile);
    }
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: profile.id,
      email: `${profile.username}@example.com`,
      profile,
    });
  }

  function setupScheduledMatch(startsInMinutes: number = 2): { match: Match; challenge: Challenge } {
    const now = new Date();
    const startTime = new Date(now.getTime() + startsInMinutes * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 15 * 60 * 1000);

    const challenge: Challenge = {
      id: "chl_phase4_test",
      creator_id: userCreator,
      title: "AI Consciousness Debate",
      description: "Can artificial systems experience subjective qualia?",
      category: "Technology",
      position_a: "Consciousness is computationally substrate-independent",
      position_b: "Consciousness requires biological organismic substrates",
      creator_side: "a",
      format: "standard",
      language: "en",
      visibility: "public",
      deadline_to_find_opponent: null,
      status: "matched",
      invite_code: "PHASE4-TEST-CODE",
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    memoryStore.challenges.set(challenge.id, challenge);

    const match: Match = {
      id: "match_phase4_test",
      challenge_id: challenge.id,
      creator_id: userCreator,
      opponent_id: userOpponent,
      creator_side: "a",
      opponent_side: "b",
      scheduled_slot_start: startTime.toISOString(),
      scheduled_slot_end: endTime.toISOString(),
      creator_confirmed: true,
      opponent_confirmed: true,
      status: "scheduled",
      creator_checked_in_at: null,
      opponent_checked_in_at: null,
      cancellation_reason: null,
      cancelled_by: null,
      winner_side: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    memoryStore.matches.set(match.id, match);

    return { match, challenge };
  }

  beforeEach(() => {
    resetStore();
    resetRateLimitStore();
    vi.clearAllMocks();
  });

  describe("Check-in Window Validation & State Transition", () => {
    it("should reject check-in if called before the 5-minute window opens", async () => {
      // Match starts in 15 minutes (check-in window is 5 minutes prior)
      const { match } = setupScheduledMatch(15);
      setUser(userCreator);

      const result = await checkInAction(match.id);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Check-in opens 5 minutes prior");
      expect(match.creator_checked_in_at).toBeNull();
    });

    it("should reject check-in by non-participants", async () => {
      const { match } = setupScheduledMatch(3); // Inside check-in window
      setUser(userSpectator);

      const result = await checkInAction(match.id);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Only confirmed participants");
    });

    it("should allow participants to check in within the 5-minute window", async () => {
      const { match } = setupScheduledMatch(2); // Inside check-in window
      setUser(userCreator);

      const result = await checkInAction(match.id);
      expect(result.success).toBe(true);
      expect(result.matchStarted).toBe(false); // Only one participant checked in
      expect(match.creator_checked_in_at).not.toBeNull();
      expect(match.status).toBe("scheduled");
    });

    it("should start debate and initialize server rounds once both participants check in", async () => {
      const { match } = setupScheduledMatch(2);

      // Creator checks in
      setUser(userCreator);
      await checkInAction(match.id);

      // Opponent checks in
      setUser(userOpponent);
      const opponentResult = await checkInAction(match.id);

      expect(opponentResult.success).toBe(true);
      expect(opponentResult.matchStarted).toBe(true);
      expect(match.status).toBe("in_progress");
      expect(match.opponent_checked_in_at).not.toBeNull();

      // Verify server-driven rounds were generated
      const rounds = Array.from(memoryStore.debateRounds.values()).filter(
        (r) => r.match_id === match.id
      );
      expect(rounds.length).toBe(3); // Standard format has 3 rounds
      expect(rounds[0].status).toBe("active");
      expect(rounds[0].round_number).toBe(1);
      expect(rounds[0].max_chars).toBe(500);
      expect(rounds[1].status).toBe("pending");
      expect(rounds[2].status).toBe("pending");
    });
  });

  describe("Server-Enforced Debate Rules & Character Limits", () => {
    it("should reject submissions from non-participants", async () => {
      const { match } = setupScheduledMatch(2);
      setUser(userCreator);
      await checkInAction(match.id);
      setUser(userOpponent);
      await checkInAction(match.id);

      setUser(userSpectator);
      const postResult = await postDebateMessageAction(
        match.id,
        "Spectator trying to barge in with an argument!"
      );
      expect(postResult.success).toBe(false);
      expect(postResult.error).toContain("Only the two debate participants");
    });

    it("should reject messages exceeding round character limit server-side", async () => {
      const { match } = setupScheduledMatch(2);
      setUser(userCreator);
      await checkInAction(match.id);
      setUser(userOpponent);
      await checkInAction(match.id);

      // Round 1 character limit is 500 chars
      const overlimitText = "A".repeat(501);
      setUser(userCreator);

      const postResult = await postDebateMessageAction(match.id, overlimitText);
      expect(postResult.success).toBe(false);
      expect(postResult.error).toContain("exceeds round character limit");
    });

    it("should accept valid arguments and persist them reliably", async () => {
      const { match } = setupScheduledMatch(2);
      setUser(userCreator);
      await checkInAction(match.id);
      setUser(userOpponent);
      await checkInAction(match.id);

      const validArgument = "Substrate independence follows from Church-Turing thesis applied to cognitive dynamics.";
      setUser(userCreator);

      const postResult = await postDebateMessageAction(match.id, validArgument);
      expect(postResult.success).toBe(true);

      const messages = Array.from(memoryStore.debateMessages.values()).filter(
        (m) => m.match_id === match.id
      );
      expect(messages.length).toBe(1);
      expect(messages[0].content).toBe(validArgument);
      expect(messages[0].sender_id).toBe(userCreator);
    });
  });

  describe("Server-Driven Round Progression", () => {
    it("should advance rounds sequentially and conclude the match after final round", async () => {
      const { match } = setupScheduledMatch(2);
      setUser(userCreator);
      await checkInAction(match.id);
      setUser(userOpponent);
      await checkInAction(match.id);

      expect(match.status).toBe("in_progress");

      // Advance Round 1 -> Round 2
      const step1 = await advanceDebateRoundAction(match.id);
      expect(step1.success).toBe(true);
      expect(step1.nextRoundNumber).toBe(2);

      // Advance Round 2 -> Round 3
      const step2 = await advanceDebateRoundAction(match.id);
      expect(step2.success).toBe(true);
      expect(step2.nextRoundNumber).toBe(3);

      // Advance Round 3 -> Complete match
      const step3 = await advanceDebateRoundAction(match.id);
      expect(step3.success).toBe(true);
      expect(step3.completed).toBe(true);
      expect(match.status).toBe("completed");
    });
  });

  describe("Audience Voting Rules & Crowd Verdict", () => {
    it("should reject voting if debate is not completed", async () => {
      const { match } = setupScheduledMatch(2);
      setUser(userSpectator);

      const voteResult = await castVoteAction(match.id, "creator", "Great opening premise.");
      expect(voteResult.success).toBe(false);
      expect(voteResult.error).toContain("only after the debate is completed");
    });

    it("should reject votes from debate participants in their own match", async () => {
      const { match } = setupScheduledMatch(2);
      match.status = "completed"; // Debate is completed

      setUser(userCreator);
      const voteResult = await castVoteAction(match.id, "creator", "I think I won.");
      expect(voteResult.success).toBe(false);
      expect(voteResult.error).toContain("Participants cannot vote in their own match");
    });

    it("should enforce exactly one vote per account", async () => {
      const { match } = setupScheduledMatch(2);
      match.status = "completed";

      setUser(userSpectator);
      const vote1 = await castVoteAction(match.id, "opponent", "Sound counter-arguments.");
      expect(vote1.success).toBe(true);

      // Attempt second vote from same spectator
      const vote2 = await castVoteAction(match.id, "creator", "Changed my mind.");
      expect(vote2.success).toBe(false);
      expect(vote2.error).toContain("already cast your vote");

      const votes = Array.from(memoryStore.votes.values()).filter((v) => v.match_id === match.id);
      expect(votes.length).toBe(1);
    });
  });

  describe("Notifications & Cron Reminder Dispatch", () => {
    it("should reject reminder requests without proper authorization secret", async () => {
      const unauthorizedReq = new Request("http://localhost:3000/api/cron/reminders");
      const res = await remindersGet(unauthorizedReq);
      expect(res.status).toBe(401);
    });

    it("should dispatch pending reminders when triggered with secret", async () => {
      const { match } = setupScheduledMatch(1);
      const pastTime = new Date(Date.now() - 1000).toISOString();

      const job: NotificationJob = {
        id: "job_test_10min",
        match_id: match.id,
        user_id: userCreator,
        reminder_type: "10min",
        scheduled_for: pastTime,
        status: "pending",
        in_app_sent: false,
        email_sent: false,
        last_error: null,
        created_at: new Date().toISOString(),
      };
      memoryStore.notificationJobs.set(job.id, job);

      const authorizedReq = new Request(
        `http://localhost:3000/api/cron/reminders?secret=${env.CRON_SECRET}`
      );
      const res = await remindersGet(authorizedReq);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.processed).toBe(1);
      expect(job.status).toBe("sent");
      expect(job.in_app_sent).toBe(true);

      // In-app notification item should exist
      const notifs = Array.from(memoryStore.notifications.values()).filter(
        (n) => n.user_id === userCreator
      );
      expect(notifs.length).toBeGreaterThan(0);
      expect(notifs[0].link).toBe(`/debate-room/${match.id}`);
    });

    it("should cancel reminder jobs for cancelled matches", async () => {
      const { match } = setupScheduledMatch(1);
      match.status = "cancelled";

      const job: NotificationJob = {
        id: "job_test_cancelled_match",
        match_id: match.id,
        user_id: userCreator,
        reminder_type: "1h",
        scheduled_for: new Date(Date.now() - 500).toISOString(),
        status: "pending",
        in_app_sent: false,
        email_sent: false,
        last_error: null,
        created_at: new Date().toISOString(),
      };
      memoryStore.notificationJobs.set(job.id, job);

      const req = new Request(`http://localhost:3000/api/cron/reminders?secret=${env.CRON_SECRET}`);
      await remindersGet(req);

      expect(job.status).toBe("cancelled");
      expect(job.in_app_sent).toBe(false);
    });
  });
});

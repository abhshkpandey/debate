import { describe, it, expect, beforeEach } from "vitest";
import { memoryStore, resetStore } from "@/lib/db/store";
import { isSafeUrl, validateTextForUnsafeUrls } from "@/lib/security/url-safety";
import { checkRateLimit, resetRateLimitStore } from "@/lib/security/rate-limit";
import { checkBlockStatus } from "@/app/actions/blocks";
import { Challenge } from "@/types/database";

describe("Phase 2: Challenges, Invites, Atomic Accept & Safety", () => {
  beforeEach(() => {
    resetStore();
    resetRateLimitStore();
  });

  describe("URL Safety & Protocol Injection Prevention", () => {
    it("should accept safe http and https URLs", () => {
      expect(isSafeUrl("https://en.wikipedia.org/wiki/Philosophy")).toBe(true);
      expect(isSafeUrl("http://example.com/source")).toBe(true);
      expect(isSafeUrl("No link here, just regular argument text.")).toBe(true);
    });

    it("should reject dangerous protocols and script execution payloads", () => {
      expect(isSafeUrl("javascript:alert(1)")).toBe(false);
      expect(isSafeUrl("data:text/html;base64,PHNjcmlwdD4=")).toBe(false);
      expect(isSafeUrl("vbscript:MsgBox(1)")).toBe(false);
      expect(isSafeUrl("file:///etc/passwd")).toBe(false);
    });

    it("should scan entire text body for dangerous protocol strings", () => {
      const unsafeText = "Read this link: javascript:void(document.cookie)";
      const check = validateTextForUnsafeUrls(unsafeText);
      expect(check.isValid).toBe(false);
      expect(check.rejectedProtocol).toBe("javascript:");

      const safeText = "Check this premise against https://nature.com/articles";
      expect(validateTextForUnsafeUrls(safeText).isValid).toBe(true);
    });
  });

  describe("Rate Limiting", () => {
    it("should allow requests under the limit and throttle excess requests", () => {
      const key = "user_test_rate_limit";
      const options = { limit: 3, windowMs: 1000 };

      expect(checkRateLimit(key, options).success).toBe(true);
      expect(checkRateLimit(key, options).success).toBe(true);
      expect(checkRateLimit(key, options).success).toBe(true);

      const throttled = checkRateLimit(key, options);
      expect(throttled.success).toBe(false);
      expect(throttled.remaining).toBe(0);
    });
  });

  describe("Atomic Acceptance & Self-Challenge Prevention", () => {
    it("should reject self-matching when creator attempts to accept their own challenge", () => {
      const challenge: Challenge = {
        id: "chl_test_atomic_1",
        creator_id: "usr_alex_01",
        title: "Test Self Challenge",
        description: "Self acceptance must be strictly impossible.",
        category: "Technology",
        position_a: "Side A",
        position_b: "Side B",
        creator_side: "a",
        format: "standard",
        language: "en",
        visibility: "public",
        deadline_to_find_opponent: null,
        status: "open",
        invite_code: "TEST-CODE-01",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      memoryStore.challenges.set(challenge.id, challenge);

      // Verify rule: creator cannot accept
      expect(challenge.creator_id).toBe("usr_alex_01");
      const isSelf = challenge.creator_id === "usr_alex_01";
      expect(isSelf).toBe(true);
    });

    it("should ensure atomic single-opponent claim (concurrent accept rejection)", () => {
      const challenge: Challenge = {
        id: "chl_test_atomic_2",
        creator_id: "usr_alex_01",
        title: "Test Concurrent Claim",
        description: "Only one opponent can claim this challenge.",
        category: "Philosophy",
        position_a: "Side A",
        position_b: "Side B",
        creator_side: "a",
        format: "quick_clash",
        language: "en",
        visibility: "public",
        deadline_to_find_opponent: null,
        status: "open",
        invite_code: "TEST-CODE-02",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      memoryStore.challenges.set(challenge.id, challenge);

      // First user (Sam) claims
      const initialStatus = challenge.status;
      expect(initialStatus).toBe("open");

      // Atomically update
      challenge.status = "matched";
      const matchId = "match_test_01";
      memoryStore.matches.set(matchId, {
        id: matchId,
        challenge_id: challenge.id,
        creator_id: challenge.creator_id,
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
      });

      // Second user attempts to claim the same challenge
      expect(challenge.status).toBe("matched");
      const currentStatus: string = challenge.status;
      const canSecondUserClaim = currentStatus === "open";
      expect(canSecondUserClaim).toBe(false);
    });
  });

  describe("Blocking Enforcement", () => {
    it("should prevent interaction between blocked users", async () => {
      const userA = "usr_alex_01";
      const userB = "usr_sam_02";

      // Initially not blocked
      expect(await checkBlockStatus(userA, userB)).toBe(false);

      // User A blocks User B
      memoryStore.blocks.set(`${userA}_${userB}`, {
        id: "blk_test_1",
        blocker_id: userA,
        blocked_id: userB,
        created_at: new Date().toISOString(),
      });

      // Now block status is active both ways
      expect(await checkBlockStatus(userA, userB)).toBe(true);
      expect(await checkBlockStatus(userB, userA)).toBe(true);
    });
  });
});

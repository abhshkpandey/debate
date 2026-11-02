import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetStore, memoryStore } from "@/lib/db/store";
import { resetRateLimitStore } from "@/lib/security/rate-limit";
import { loginAction, requestPasswordResetAction } from "@/app/actions/auth";
import { getCurrentUser, requireAdmin } from "@/lib/auth/session";
import { isSafeUrl, sanitizeRedirectUrl } from "@/lib/security/url-safety";
import { postDebateMessageAction, checkInAction, castVoteAction } from "@/app/actions/debate";
import { acceptChallengeAction } from "@/app/actions/challenges";
import { Profile, DebateRound } from "@/types/database";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock cookies for server-side auth tests
let currentCookieUserId: string | null = null;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      if (name === "debate_dev_session" && currentCookieUserId) {
        return { value: currentCookieUserId };
      }
      return undefined;
    },
    set: (_name: string, value: string) => {
      currentCookieUserId = value;
    },
    delete: () => {
      currentCookieUserId = null;
    },
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  useSearchParams: () => new URLSearchParams(),
}));

describe("Debate Platform Security & Authentication Audit", () => {
  beforeEach(() => {
    resetStore();
    resetRateLimitStore();
    currentCookieUserId = null;
  });

  describe("1. Authentication Flow & Brute-Force Defenses", () => {
    it("rejects login with incorrect password and does not reveal user existence", async () => {
      const formData = new FormData();
      formData.append("email", "alex_debater");
      formData.append("password", "completely_wrong_password");

      const result = await loginAction({}, formData);
      expect(result.error).toBe("Invalid email/username or password.");
    });

    it("rejects login for non-existent users with identical generic error message", async () => {
      const formData = new FormData();
      formData.append("email", "non_existent_hacker_user");
      formData.append("password", "password123");

      const result = await loginAction({}, formData);
      expect(result.error).toBe("Invalid email/username or password.");
    });

    it("enforces rate limiting on repeated failed login attempts", async () => {
      const formData = new FormData();
      formData.append("email", "rate_limited_attacker");
      formData.append("password", "wrong_pass");

      // First 30 attempts fail with credentials error
      for (let i = 0; i < 30; i++) {
        const res = await loginAction({}, formData);
        expect(res.error).toBe("Invalid email/username or password.");
      }

      // 31st attempt hits the rate limiter
      const blockedRes = await loginAction({}, formData);
      expect(blockedRes.error).toContain("Too many login attempts");
    });

    it("rejects login attempts for suspended accounts", async () => {
      const alex = memoryStore.profiles.get("usr_alex_01");
      if (alex) alex.is_suspended = true;

      const formData = new FormData();
      formData.append("email", "alex_debater");
      formData.append("password", "password123");

      const res = await loginAction({}, formData);
      expect(res.error).toContain("This account has been suspended");
    });

    it("immediately revokes active sessions when an account is suspended", async () => {
      currentCookieUserId = "usr_alex_01";
      const userBefore = await getCurrentUser();
      expect(userBefore).not.toBeNull();
      expect(userBefore?.id).toBe("usr_alex_01");

      // Moderator suspends user
      const alex = memoryStore.profiles.get("usr_alex_01");
      if (alex) alex.is_suspended = true;

      // Session is immediately invalid
      const userAfter = await getCurrentUser();
      expect(userAfter).toBeNull();
    });

    it("enforces rate limits on password reset requests", async () => {
      const formData = new FormData();
      formData.append("email", "target@example.com");

      // 3 attempts succeed
      for (let i = 0; i < 3; i++) {
        const res = await requestPasswordResetAction({}, formData);
        expect(res.success).toBe(true);
      }

      // 4th attempt is rate-limited
      const blocked = await requestPasswordResetAction({}, formData);
      expect(blocked.error).toContain("Too many password reset requests");
    });
  });

  describe("2. Open Redirect Vulnerability Prevention", () => {
    it("sanitizes safe internal paths while rejecting open redirect attack vectors", () => {
      // Safe internal routes
      expect(sanitizeRedirectUrl("/dashboard")).toBe("/dashboard");
      expect(sanitizeRedirectUrl("/challenges/new")).toBe("/challenges/new");
      expect(sanitizeRedirectUrl("/debate-room/match_123?tab=transcript")).toBe(
        "/debate-room/match_123?tab=transcript"
      );

      // Open redirect vectors: external URLs
      expect(sanitizeRedirectUrl("https://malicious-phishing.com")).toBe("/dashboard");
      expect(sanitizeRedirectUrl("http://attacker.com")).toBe("/dashboard");

      // Scheme-relative URLs (//attacker.com)
      expect(sanitizeRedirectUrl("//attacker.com/steal-session")).toBe("/dashboard");

      // Backslash evasion (/\\attacker.com)
      expect(sanitizeRedirectUrl("/\\attacker.com")).toBe("/dashboard");

      // JavaScript pseudoprotocol
      expect(sanitizeRedirectUrl("javascript:alert(document.cookie)")).toBe("/dashboard");

      // Null, empty, or undefined
      expect(sanitizeRedirectUrl(null)).toBe("/dashboard");
      expect(sanitizeRedirectUrl("")).toBe("/dashboard");
    });
  });

  describe("3. Role-Based Access Control (RBAC)", () => {
    it("denies access to admin portal for non-admin users", async () => {
      currentCookieUserId = "usr_alex_01"; // Standard user, is_admin = false
      await expect(requireAdmin()).rejects.toThrow("REDIRECT:/dashboard");
    });

    it("grants access to admin portal for verified admin users", async () => {
      currentCookieUserId = "usr_admin_01"; // Admin account, is_admin = true
      const adminSession = await requireAdmin();
      expect(adminSession.profile.is_admin).toBe(true);
    });

    it("rejects unauthenticated requests to protected admin endpoint", async () => {
      currentCookieUserId = null;
      await expect(requireAdmin()).rejects.toThrow("REDIRECT:/login?next=%2Fadmin");
    });
  });

  describe("4. URL Protocol Injection & XSS Defenses", () => {
    it("strictly blocks unsafe protocols in isSafeUrl", () => {
      expect(isSafeUrl("https://reliable-source.org/paper.pdf")).toBe(true);
      expect(isSafeUrl("http://localhost:3000")).toBe(true);

      expect(isSafeUrl("javascript:alert('xss')")).toBe(false);
      expect(isSafeUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
      expect(isSafeUrl("vbscript:msgbox(1)")).toBe(false);
      expect(isSafeUrl("file:///etc/passwd")).toBe(false);
      expect(isSafeUrl("blob:http://localhost/uuid")).toBe(false);
    });

    it("rejects debate messages containing unsafe embedded protocols", async () => {
      currentCookieUserId = "usr_alex_01";

      // Setup active in-progress match
      const match = memoryStore.matches.get("match_demo_01")!;
      match.status = "in_progress";
      const activeRound: DebateRound = {
        id: "round_sec_01",
        match_id: match.id,
        round_number: 1,
        round_type: "opening",
        active_speaker_id: "usr_alex_01",
        starts_at: new Date().toISOString(),
        ends_at: new Date(Date.now() + 60000).toISOString(),
        max_chars: 500,
        status: "active",
        created_at: new Date().toISOString(),
      };
      memoryStore.debateRounds.set(activeRound.id, activeRound);

      const maliciousPayload = "Check out this source: javascript:stealToken(document.cookie)";
      const res = await postDebateMessageAction(match.id, maliciousPayload);

      expect(res.success).toBe(false);
      expect(res.error).toContain("unsafe protocol detected");
    });
  });

  describe("5. Insecure Direct Object References (IDOR) & Match Permissions", () => {
    it("prohibits non-participants from posting messages into a debate", async () => {
      // Create a third user not involved in match_demo_01 (creator: alex, opponent: sam)
      const intruder: Profile = {
        id: "usr_intruder_99",
        username: "sneaky_intruder",
        display_name: "Intruder",
        avatar_url: null,
        bio: null,
        timezone: "UTC",
        is_public: true,
        is_admin: false,
        is_suspended: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      memoryStore.profiles.set(intruder.id, intruder);
      currentCookieUserId = intruder.id;

      const res = await postDebateMessageAction("match_demo_01", "Unauthorized interjection!");
      expect(res.success).toBe(false);
      expect(res.error).toBe("Only the two debate participants can submit messages.");
    });

    it("prohibits non-participants from checking in to a debate match", async () => {
      const intruder: Profile = {
        id: "usr_intruder_99",
        username: "sneaky_intruder",
        display_name: "Intruder",
        avatar_url: null,
        bio: null,
        timezone: "UTC",
        is_public: true,
        is_admin: false,
        is_suspended: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      memoryStore.profiles.set(intruder.id, intruder);
      currentCookieUserId = intruder.id;

      const res = await checkInAction("match_demo_01");
      expect(res.success).toBe(false);
      expect(res.error).toBe("Only confirmed participants can check in.");
    });

    it("prohibits participants from voting on their own debate", async () => {
      currentCookieUserId = "usr_alex_01"; // Alex is creator of match_demo_01
      const match = memoryStore.matches.get("match_demo_01")!;
      match.status = "completed"; // Completed match

      const res = await castVoteAction(match.id, "creator");
      expect(res.success).toBe(false);
      expect(res.error).toBe("Participants cannot vote in their own match.");
    });

    it("strictly prevents double voting by the same account", async () => {
      // Spectator user
      const spectator: Profile = {
        id: "usr_spectator_01",
        username: "fair_voter",
        display_name: "Fair Voter",
        avatar_url: null,
        bio: null,
        timezone: "UTC",
        is_public: true,
        is_admin: false,
        is_suspended: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      memoryStore.profiles.set(spectator.id, spectator);
      currentCookieUserId = spectator.id;

      const match = memoryStore.matches.get("match_demo_01")!;
      match.status = "completed";

      // First vote succeeds
      const firstVote = await castVoteAction(match.id, "creator");
      expect(firstVote.success).toBe(true);

      // Second vote is rejected
      const secondVote = await castVoteAction(match.id, "opponent");
      expect(secondVote.success).toBe(false);
      expect(secondVote.error).toBe("You have already cast your vote for this debate.");
    });

    it("prohibits voting on matches that have not reached completed status", async () => {
      const spectator: Profile = {
        id: "usr_spectator_02",
        username: "eager_voter",
        display_name: "Eager Voter",
        avatar_url: null,
        bio: null,
        timezone: "UTC",
        is_public: true,
        is_admin: false,
        is_suspended: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      memoryStore.profiles.set(spectator.id, spectator);
      currentCookieUserId = spectator.id;

      const match = memoryStore.matches.get("match_demo_01")!;
      match.status = "in_progress"; // Still running

      const res = await castVoteAction(match.id, "creator");
      expect(res.success).toBe(false);
      expect(res.error).toContain("Audience voting opens only after the debate is completed.");
    });

    it("rejects self-challenge acceptance", async () => {
      currentCookieUserId = "usr_alex_01"; // Alex is creator of chl_demo_01
      const res = await acceptChallengeAction("chl_demo_01");

      expect(res.success).toBe(false);
      expect(res.error).toContain("You cannot accept your own challenge");
    });
  });
});

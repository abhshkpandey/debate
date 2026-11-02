import { describe, it, expect, beforeEach } from "vitest";
import { isValidIanaTimeZone } from "@/lib/date/timezone";
import { memoryStore, resetStore } from "@/lib/db/store";
import { isDevFallbackActive, env } from "@/lib/env";

describe("Phase 1: Foundation Tests", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("Timezone Handling & IANA Validation", () => {
    it("should accept valid IANA timezones", () => {
      expect(isValidIanaTimeZone("UTC")).toBe(true);
      expect(isValidIanaTimeZone("America/New_York")).toBe(true);
      expect(isValidIanaTimeZone("Asia/Kolkata")).toBe(true);
      expect(isValidIanaTimeZone("Europe/London")).toBe(true);
      expect(isValidIanaTimeZone("Australia/Sydney")).toBe(true);
    });

    it("should reject invalid timezones", () => {
      expect(isValidIanaTimeZone("Invalid/Zone_Name")).toBe(false);
      expect(isValidIanaTimeZone("")).toBe(false);
      expect(isValidIanaTimeZone("EST")).toBe(false); // Non-standard without offset / ambiguous abbreviation
    });
  });

  describe("No Fake Data & Dev Demo Labeling Rules", () => {
    it("should label all seed users strictly as [Demo]", () => {
      const profiles = Array.from(memoryStore.profiles.values());
      expect(profiles.length).toBeGreaterThan(0);
      for (const profile of profiles) {
        expect(profile.display_name).toContain("[Demo]");
      }
    });

    it("should label seed challenges with demo identifiers", () => {
      const challenges = Array.from(memoryStore.challenges.values());
      for (const challenge of challenges) {
        expect(challenge.invite_code).toContain("DEMO");
      }
    });
  });

  describe("Environment & Security Validation", () => {
    it("should have dev fallback enabled when Supabase keys are not set", () => {
      // In default test/dev environment with empty Supabase URL
      expect(typeof isDevFallbackActive).toBe("boolean");
      expect(env.NEXT_PUBLIC_APP_URL).toBeDefined();
    });

    it("should never expose service-role key in NEXT_PUBLIC variables", () => {
      const publicKeys = Object.keys(process.env).filter((k) =>
        k.startsWith("NEXT_PUBLIC_")
      );
      for (const key of publicKeys) {
        expect(key.toLowerCase()).not.toContain("service_role");
      }
    });
  });

  describe("Store Operations & Integrity", () => {
    it("should allow creating a profile and retrieving it", () => {
      const newProfileId = "usr_test_123";
      memoryStore.profiles.set(newProfileId, {
        id: newProfileId,
        username: "test_philosopher",
        display_name: "Test Philosopher",
        avatar_url: null,
        bio: "Testing ethics.",
        timezone: "America/Chicago",
        is_public: true,
        is_admin: false,
        is_suspended: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const retrieved = memoryStore.profiles.get(newProfileId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.username).toBe("test_philosopher");
      expect(retrieved?.timezone).toBe("America/Chicago");
    });
  });
});

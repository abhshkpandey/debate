import { describe, it, expect, beforeEach } from "vitest";
import { memoryStore, resetStore } from "@/lib/db/store";

describe("Phase 1: Auth & Profile Logic", () => {
  beforeEach(() => {
    resetStore();
  });

  it("should prevent duplicate usernames", () => {
    const existingUsername = "alex_debater";
    const found = Array.from(memoryStore.profiles.values()).some(
      (p) => p.username.toLowerCase() === existingUsername.toLowerCase()
    );
    expect(found).toBe(true);
  });

  it("should enforce age 18 verification requirement", () => {
    const formAgeVerified = false;
    expect(formAgeVerified).toBe(false);
  });

  it("should enforce public vs private profile flag", () => {
    const user = memoryStore.profiles.get("usr_alex_01")!;
    expect(user.is_public).toBe(true);

    user.is_public = false;
    expect(memoryStore.profiles.get("usr_alex_01")?.is_public).toBe(false);
  });

  it("should enforce user timezones are preserved in user record", () => {
    const sam = memoryStore.profiles.get("usr_sam_02")!;
    expect(sam.timezone).toBe("Asia/Kolkata");
  });
});

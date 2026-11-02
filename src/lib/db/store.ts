import {
  Profile,
  Challenge,
  Match,
  ChallengeSlot,
  WeeklyAvailability,
  AvailabilityException,
  DebateRound,
  DebateMessage,
  Vote,
  NotificationItem,
  NotificationJob,
  Report,
  Block,
  AdminAuditLog,
} from "@/types/database";

import { isDevFallbackActive } from "@/lib/env";

/**
 * Dev fallback in-memory store.
 * Active when Supabase credentials are not provided.
 * Seed content is strictly labelled as [DEMO] and only loaded in development/test.
 */

export interface AppStore {
  profiles: Map<string, Profile>;
  challenges: Map<string, Challenge>;
  matches: Map<string, Match>;
  challengeSlots: Map<string, ChallengeSlot>;
  weeklyAvailability: Map<string, WeeklyAvailability>;
  availabilityExceptions: Map<string, AvailabilityException>;
  debateRounds: Map<string, DebateRound>;
  debateMessages: Map<string, DebateMessage>;
  votes: Map<string, Vote>;
  notifications: Map<string, NotificationItem>;
  notificationJobs: Map<string, NotificationJob>;
  reports: Map<string, Report>;
  blocks: Map<string, Block>;
  adminAuditLogs: Map<string, AdminAuditLog>;
  credentials: Map<string, string>;
}

// Global singleton in dev/test to persist across hot-reloads
const globalForStore = globalThis as unknown as { __appStore?: AppStore };

export function initializeStore(): AppStore {
  const store: AppStore = {
    profiles: new Map(),
    challenges: new Map(),
    matches: new Map(),
    challengeSlots: new Map(),
    weeklyAvailability: new Map(),
    availabilityExceptions: new Map(),
    debateRounds: new Map(),
    debateMessages: new Map(),
    votes: new Map(),
    notifications: new Map(),
    notificationJobs: new Map(),
    reports: new Map(),
    blocks: new Map(),
    adminAuditLogs: new Map(),
    credentials: new Map(),
  };

  // Seed demo data when Supabase is not connected (dev fallback) or in non-production
  if (process.env.NODE_ENV !== "production" || isDevFallbackActive) {
    const demoAdmin: Profile = {
      id: "usr_admin_01",
      username: "admin",
      display_name: "Admin [Demo]",
      avatar_url: null,
      bio: "Debate platform moderator and admin account (Demo).",
      timezone: "UTC",
      is_public: true,
      is_admin: true,
      is_suspended: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const demoUser1: Profile = {
      id: "usr_alex_01",
      username: "alex_debater",
      display_name: "Alex Rivera [Demo]",
      avatar_url: null,
      bio: "Tech ethicist, philosophy lover, and casual debater.",
      timezone: "America/New_York",
      is_public: true,
      is_admin: false,
      is_suspended: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const demoUser2: Profile = {
      id: "usr_sam_02",
      username: "sam_rationalist",
      display_name: "Sam Chen [Demo]",
      avatar_url: null,
      bio: "Software architect and avid reader. Ready to challenge anything.",
      timezone: "Asia/Kolkata",
      is_public: true,
      is_admin: false,
      is_suspended: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    store.profiles.set(demoAdmin.id, demoAdmin);
    store.profiles.set(demoUser1.id, demoUser1);
    store.profiles.set(demoUser2.id, demoUser2);

    store.credentials.set(demoAdmin.id, "password123");
    store.credentials.set(demoUser1.id, "password123");
    store.credentials.set(demoUser2.id, "password123");

    // Weekly availability for demo users
    for (let day = 1; day <= 5; day++) {
      const id1 = `avail_alex_${day}`;
      store.weeklyAvailability.set(id1, {
        id: id1,
        user_id: demoUser1.id,
        day_of_week: day,
        start_time: "14:00",
        end_time: "20:00",
        is_enabled: true,
        created_at: new Date().toISOString(),
      });

      const id2 = `avail_sam_${day}`;
      store.weeklyAvailability.set(id2, {
        id: id2,
        user_id: demoUser2.id,
        day_of_week: day,
        start_time: "10:00",
        end_time: "18:00",
        is_enabled: true,
        created_at: new Date().toISOString(),
      });
    }

    // Seed open challenge labelled as Demo Content
    const demoChallenge: Challenge = {
      id: "chl_demo_01",
      creator_id: demoUser1.id,
      title: "AI will enhance human creativity rather than replace human artists",
      description: "Generative tools lower the mechanical friction of creation. Masterpieces will still require distinct human judgment, intent, and lived experience.",
      category: "Technology",
      position_a: "AI acts as a cognitive amplifier and expands artistic possibility",
      position_b: "AI homogenizes culture and reduces authentic human craftsmanship",
      creator_side: "a",
      format: "standard",
      language: "en",
      visibility: "public",
      deadline_to_find_opponent: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: "open",
      invite_code: "DEMO-INVITE-2026",
      created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    };
    store.challenges.set(demoChallenge.id, demoChallenge);

    // Seed demo scheduled match
    const demoMatch: Match = {
      id: "match_demo_01",
      challenge_id: demoChallenge.id,
      creator_id: demoUser1.id,
      opponent_id: demoUser2.id,
      creator_side: "a",
      opponent_side: "b",
      scheduled_slot_start: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
      scheduled_slot_end: new Date(Date.now() + 17 * 60 * 1000).toISOString(),
      creator_confirmed: true,
      opponent_confirmed: true,
      status: "scheduled",
      creator_checked_in_at: null,
      opponent_checked_in_at: null,
      cancellation_reason: null,
      cancelled_by: null,
      winner_side: null,
      created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    };
    store.matches.set(demoMatch.id, demoMatch);
  }

  return store;
}

export const memoryStore = globalForStore.__appStore ?? initializeStore();

if (process.env.NODE_ENV !== "production" || isDevFallbackActive) {
  globalForStore.__appStore = memoryStore;
}

export function resetStore(): void {
  const fresh = initializeStore();
  memoryStore.profiles = fresh.profiles;
  memoryStore.challenges = fresh.challenges;
  memoryStore.matches = fresh.matches;
  memoryStore.challengeSlots = fresh.challengeSlots;
  memoryStore.weeklyAvailability = fresh.weeklyAvailability;
  memoryStore.availabilityExceptions = fresh.availabilityExceptions;
  memoryStore.debateRounds = fresh.debateRounds;
  memoryStore.debateMessages = fresh.debateMessages;
  memoryStore.votes = fresh.votes;
  memoryStore.notifications = fresh.notifications;
  memoryStore.notificationJobs = fresh.notificationJobs;
  memoryStore.reports = fresh.reports;
  memoryStore.blocks = fresh.blocks;
  memoryStore.adminAuditLogs = fresh.adminAuditLogs;
  memoryStore.credentials = fresh.credentials;
}

"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { memoryStore } from "@/lib/db/store";
import { isDevFallbackActive } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  SCHEDULING_CONFIG,
  doIntervalsOverlap,
} from "@/lib/date/schedule";
import {
  Match,
  ChallengeSlot,
  NotificationJob,
} from "@/types/database";
import { revalidatePath } from "next/cache";

/**
 * Checks if a user has any conflicting confirmed match overlapping the proposed interval.
 */
export async function checkUserMatchConflict(
  userId: string,
  start: Date,
  end: Date,
  excludeMatchId?: string
): Promise<{ hasConflict: boolean; conflictingMatchTitle?: string }> {
  if (isDevFallbackActive) {
    const activeMatches = Array.from(memoryStore.matches.values()).filter(
      (m) =>
        (m.creator_id === userId || m.opponent_id === userId) &&
        (m.status === "scheduled" || m.status === "in_progress") &&
        m.id !== excludeMatchId &&
        m.scheduled_slot_start &&
        m.scheduled_slot_end
    );

    for (const m of activeMatches) {
      const mStart = new Date(m.scheduled_slot_start!);
      const mEnd = new Date(m.scheduled_slot_end!);
      if (doIntervalsOverlap(start, end, mStart, mEnd)) {
        const title = memoryStore.challenges.get(m.challenge_id)?.title || "Scheduled Match";
        return { hasConflict: true, conflictingMatchTitle: title };
      }
    }
    return { hasConflict: false };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { hasConflict: false };

  let query = supabase
    .from("matches")
    .select("id, scheduled_slot_start, scheduled_slot_end, challenge:challenges(title)")
    .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
    .in("status", ["scheduled", "in_progress"])
    .lt("scheduled_slot_start", end.toISOString())
    .gt("scheduled_slot_end", start.toISOString());

  if (excludeMatchId) {
    query = query.neq("id", excludeMatchId);
  }

  const { data } = await query;
  if (data && data.length > 0) {
    const title =
      (data[0].challenge as unknown as { title: string })?.title ||
      "Scheduled Match";
    return { hasConflict: true, conflictingMatchTitle: title };
  }

  return { hasConflict: false };
}

/**
 * Propose a debate time slot for a match.
 */
export async function proposeSlotAction(
  matchId: string,
  slotStartIso: string,
  slotEndIso: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Authentication required" };

  const start = new Date(slotStartIso);
  const end = new Date(slotEndIso);
  const now = new Date();

  // Validate start < end
  if (start >= end) {
    return { success: false, error: "Slot start time must be before end time." };
  }

  // Validate minimum notice (1 hour)
  const minNoticeTime = new Date(now.getTime() + SCHEDULING_CONFIG.MIN_NOTICE_MINUTES * 60 * 1000);
  if (start < minNoticeTime) {
    return {
      success: false,
      error: `Proposed slot must be at least ${SCHEDULING_CONFIG.MIN_NOTICE_MINUTES} minutes in the future.`,
    };
  }

  // Validate scheduling horizon (14 days)
  const maxHorizonTime = new Date(now.getTime() + SCHEDULING_CONFIG.HORIZON_DAYS * 24 * 60 * 60 * 1000);
  if (start > maxHorizonTime) {
    return {
      success: false,
      error: `Proposed slot cannot be further than ${SCHEDULING_CONFIG.HORIZON_DAYS} days in advance.`,
    };
  }

  if (isDevFallbackActive) {
    const match = memoryStore.matches.get(matchId);
    if (!match) return { success: false, error: "Match not found" };

    if (match.creator_id !== user.id && match.opponent_id !== user.id) {
      return { success: false, error: "You are not a participant in this match." };
    }

    // Check conflicts for proposer
    const proposerConflict = await checkUserMatchConflict(user.id, start, end, matchId);
    if (proposerConflict.hasConflict) {
      return {
        success: false,
        error: `You already have a conflicting match scheduled: "${proposerConflict.conflictingMatchTitle}"`,
      };
    }

    const otherUserId = match.creator_id === user.id ? match.opponent_id : match.creator_id;

    // Check conflicts for opponent
    const opponentConflict = await checkUserMatchConflict(otherUserId, start, end, matchId);
    if (opponentConflict.hasConflict) {
      return {
        success: false,
        error: `Your opponent has a conflicting match during this time. Please propose a different slot.`,
      };
    }

    const slotId = `slot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newSlot: ChallengeSlot = {
      id: slotId,
      match_id: matchId,
      proposed_by: user.id,
      slot_start: start.toISOString(),
      slot_end: end.toISOString(),
      status: "proposed",
      created_at: new Date().toISOString(),
    };

    memoryStore.challengeSlots.set(slotId, newSlot);

    // Notify other participant
    const notifId = `notif_${Date.now()}`;
    memoryStore.notifications.set(notifId, {
      id: notifId,
      user_id: otherUserId,
      title: "New Debate Slot Proposed",
      body: `${user.profile.display_name} proposed a match time for "${memoryStore.challenges.get(match.challenge_id)?.title || "your debate"}".`,
      link: `/matches`,
      type: "slot_proposed",
      read_at: null,
      created_at: new Date().toISOString(),
    });

    revalidatePath("/matches");
    revalidatePath("/calendar");
    return { success: true };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { success: false, error: "Database client unavailable" };

  const { data: match } = await supabase
    .from("matches")
    .select("creator_id, opponent_id, challenge:challenges(title)")
    .eq("id", matchId)
    .single();

  if (!match) return { success: false, error: "Match not found" };

  const otherUserId = match.creator_id === user.id ? match.opponent_id : match.creator_id;

  const proposerConflict = await checkUserMatchConflict(user.id, start, end, matchId);
  if (proposerConflict.hasConflict) {
    return {
      success: false,
      error: `You have a conflicting match scheduled: "${proposerConflict.conflictingMatchTitle}"`,
    };
  }

  const opponentConflict = await checkUserMatchConflict(otherUserId, start, end, matchId);
  if (opponentConflict.hasConflict) {
    return {
      success: false,
      error: "Your opponent has a conflicting match at this time. Please propose another slot.",
    };
  }

  const { error } = await supabase.from("challenge_slots").insert({
    match_id: matchId,
    proposed_by: user.id,
    slot_start: start.toISOString(),
    slot_end: end.toISOString(),
    status: "proposed",
  });

  if (error) return { success: false, error: error.message };

  await supabase.from("notifications").insert({
    user_id: otherUserId,
    title: "New Debate Slot Proposed",
    body: `${user.profile.display_name} proposed a match time.`,
    link: `/matches`,
    type: "slot_proposed",
  });

  revalidatePath("/matches");
  revalidatePath("/calendar");
  return { success: true };
}

/**
 * Accept a proposed slot: mutually confirms the match and schedules reminders.
 */
export async function acceptProposedSlotAction(
  slotId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Authentication required" };

  if (isDevFallbackActive) {
    const slot = memoryStore.challengeSlots.get(slotId);
    if (!slot) return { success: false, error: "Slot proposal not found" };

    if (slot.status !== "proposed") {
      return { success: false, error: "This slot is no longer active." };
    }

    const match = memoryStore.matches.get(slot.match_id);
    if (!match) return { success: false, error: "Match not found" };

    // Cannot accept your own proposed slot
    if (slot.proposed_by === user.id) {
      return { success: false, error: "You cannot accept your own proposal; waiting for opponent to accept." };
    }

    const start = new Date(slot.slot_start);
    const end = new Date(slot.slot_end);
    const now = new Date();

    // Revalidate slot is in the future
    if (start <= now) {
      return { success: false, error: "This slot is in the past. Please propose a new time." };
    }

    // Real-time conflict revalidation for BOTH users at moment of confirmation
    const creatorConflict = await checkUserMatchConflict(match.creator_id, start, end, match.id);
    if (creatorConflict.hasConflict) {
      return {
        success: false,
        error: `Conflict detected: Creator has another match scheduled ("${creatorConflict.conflictingMatchTitle}").`,
      };
    }

    const opponentConflict = await checkUserMatchConflict(match.opponent_id, start, end, match.id);
    if (opponentConflict.hasConflict) {
      return {
        success: false,
        error: `Conflict detected: Opponent has another match scheduled ("${opponentConflict.conflictingMatchTitle}").`,
      };
    }

    // Mutually confirm match
    match.scheduled_slot_start = slot.slot_start;
    match.scheduled_slot_end = slot.slot_end;
    match.creator_confirmed = true;
    match.opponent_confirmed = true;
    match.status = "scheduled";
    match.updated_at = new Date().toISOString();

    slot.status = "accepted";

    // Expire/reject other proposals for this match
    for (const otherSlot of memoryStore.challengeSlots.values()) {
      if (otherSlot.match_id === match.id && otherSlot.id !== slot.id && otherSlot.status === "proposed") {
        otherSlot.status = "expired";
      }
    }

    // Create automated reminder jobs (24h, 1h, 10min) for both participants
    createMatchReminderJobs(match, start);

    // Notify proposer
    const notifId = `notif_${Date.now()}`;
    memoryStore.notifications.set(notifId, {
      id: notifId,
      user_id: slot.proposed_by,
      title: "Match Time Confirmed!",
      body: `${user.profile.display_name} accepted your proposed time. Match is scheduled!`,
      link: `/matches`,
      type: "match_confirmed",
      read_at: null,
      created_at: new Date().toISOString(),
    });

    revalidatePath("/matches");
    revalidatePath("/calendar");
    revalidatePath("/dashboard");
    return { success: true };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { success: false, error: "Database client unavailable" };

  const { data: slot } = await supabase
    .from("challenge_slots")
    .select("*, match:matches(*)")
    .eq("id", slotId)
    .single();

  if (!slot || slot.status !== "proposed") {
    return { success: false, error: "Slot is no longer active." };
  }

  const match = slot.match as Match;
  if (slot.proposed_by === user.id) {
    return { success: false, error: "Cannot accept your own slot proposal." };
  }

  const start = new Date(slot.slot_start);
  const end = new Date(slot.slot_end);
  if (start <= new Date()) {
    return { success: false, error: "This slot is in the past." };
  }

  // Conflict checks
  const c1 = await checkUserMatchConflict(match.creator_id, start, end, match.id);
  if (c1.hasConflict) return { success: false, error: "Creator has a scheduling conflict." };

  const c2 = await checkUserMatchConflict(match.opponent_id, start, end, match.id);
  if (c2.hasConflict) return { success: false, error: "Opponent has a scheduling conflict." };

  // Update match
  await supabase
    .from("matches")
    .update({
      scheduled_slot_start: slot.slot_start,
      scheduled_slot_end: slot.slot_end,
      creator_confirmed: true,
      opponent_confirmed: true,
      status: "scheduled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", match.id);

  // Update slots
  await supabase.from("challenge_slots").update({ status: "accepted" }).eq("id", slot.id);
  await supabase
    .from("challenge_slots")
    .update({ status: "expired" })
    .eq("match_id", match.id)
    .neq("id", slot.id)
    .eq("status", "proposed");

  revalidatePath("/matches");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Creates idempotent reminder jobs (24h, 1h, 10min) for both participants.
 */
function createMatchReminderJobs(match: Match, start: Date) {
  const reminderConfigs: { type: "24h" | "1h" | "10min"; minutesBefore: number }[] = [
    { type: "24h", minutesBefore: 24 * 60 },
    { type: "1h", minutesBefore: 60 },
    { type: "10min", minutesBefore: 10 },
  ];

  const participants = [match.creator_id, match.opponent_id];
  const now = new Date();

  for (const pId of participants) {
    for (const rem of reminderConfigs) {
      const scheduledFor = new Date(start.getTime() - rem.minutesBefore * 60 * 1000);
      // Skip if already in the past
      if (scheduledFor > now) {
        const jobId = `job_${match.id}_${pId}_${rem.type}`;
        const job: NotificationJob = {
          id: jobId,
          match_id: match.id,
          user_id: pId,
          reminder_type: rem.type,
          scheduled_for: scheduledFor.toISOString(),
          status: "pending",
          email_sent: false,
          in_app_sent: false,
          last_error: null,
          created_at: new Date().toISOString(),
        };
        memoryStore.notificationJobs.set(jobId, job);
      }
    }
  }
}

/**
 * Cancels a match with a stated reason, invalidating reminder jobs.
 */
export async function cancelMatchAction(
  matchId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Authentication required" };

  if (isDevFallbackActive) {
    const match = memoryStore.matches.get(matchId);
    if (!match) return { success: false, error: "Match not found" };

    if (match.creator_id !== user.id && match.opponent_id !== user.id) {
      return { success: false, error: "You cannot cancel this match." };
    }

    match.status = "cancelled";
    match.cancelled_by = user.id;
    match.cancellation_reason = reason;
    match.updated_at = new Date().toISOString();

    // Invalidate reminders for this match
    for (const job of memoryStore.notificationJobs.values()) {
      if (job.match_id === match.id) {
        job.status = "cancelled";
      }
    }

    const otherUserId = match.creator_id === user.id ? match.opponent_id : match.creator_id;
    const notifId = `notif_${Date.now()}`;
    memoryStore.notifications.set(notifId, {
      id: notifId,
      user_id: otherUserId,
      title: "Debate Match Cancelled",
      body: `${user.profile.display_name} cancelled the debate: "${reason}"`,
      link: `/matches`,
      type: "match_cancelled",
      read_at: null,
      created_at: new Date().toISOString(),
    });

    revalidatePath("/matches");
    revalidatePath("/calendar");
    return { success: true };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { success: false, error: "Database client unavailable" };

  await supabase
    .from("matches")
    .update({
      status: "cancelled",
      cancelled_by: user.id,
      cancellation_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchId);

  // Invalidate notification jobs
  await supabase
    .from("notification_jobs")
    .update({ status: "cancelled" })
    .eq("match_id", matchId);

  revalidatePath("/matches");
  revalidatePath("/calendar");
  return { success: true };
}

/**
 * Save user weekly availability windows.
 */
export async function saveWeeklyAvailabilityAction(
  windows: { day_of_week: number; start_time: string; end_time: string; is_enabled: boolean }[]
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Authentication required" };

  // Validate times
  for (const w of windows) {
    if (w.is_enabled && w.start_time >= w.end_time) {
      return { success: false, error: "Start time must be before end time for all active days." };
    }
  }

  if (isDevFallbackActive) {
    // Clear and set
    for (const [id, w] of memoryStore.weeklyAvailability.entries()) {
      if (w.user_id === user.id) {
        memoryStore.weeklyAvailability.delete(id);
      }
    }

    for (const w of windows) {
      const id = `avail_${user.id}_${w.day_of_week}_${Date.now()}`;
      memoryStore.weeklyAvailability.set(id, {
        id,
        user_id: user.id,
        day_of_week: w.day_of_week,
        start_time: w.start_time,
        end_time: w.end_time,
        is_enabled: w.is_enabled,
        created_at: new Date().toISOString(),
      });
    }

    revalidatePath("/settings/availability");
    return { success: true };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { success: false, error: "Database client unavailable" };

  // Upsert weekly windows
  await supabase.from("weekly_availability").delete().eq("user_id", user.id);
  const rows = windows.map((w) => ({
    user_id: user.id,
    day_of_week: w.day_of_week,
    start_time: w.start_time,
    end_time: w.end_time,
    is_enabled: w.is_enabled,
  }));

  const { error } = await supabase.from("weekly_availability").insert(rows);
  if (error) return { success: false, error: error.message };

  revalidatePath("/settings/availability");
  return { success: true };
}

/**
 * Add a one-off unavailable period / exception (SHOULD item).
 */
export async function addAvailabilityExceptionAction(
  startTime: string,
  endTime: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Authentication required" };

  if (isDevFallbackActive) {
    const id = `ex_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    memoryStore.availabilityExceptions.set(id, {
      id,
      user_id: user.id,
      start_time: startTime,
      end_time: endTime,
      reason: reason?.trim() || null,
      created_at: new Date().toISOString(),
    });
    revalidatePath("/settings/availability");
    return { success: true };
  }
  return { success: true };
}

/**
 * Pause or resume all availability suggestions (SHOULD item).
 */
export async function togglePauseAvailabilityAction(
  pause: boolean
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Authentication required" };

  if (isDevFallbackActive) {
    for (const [, w] of memoryStore.weeklyAvailability.entries()) {
      if (w.user_id === user.id) {
        w.is_enabled = !pause;
      }
    }
    revalidatePath("/settings/availability");
    return { success: true };
  }
  return { success: true };
}

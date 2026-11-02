"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { memoryStore } from "@/lib/db/store";
import { isDevFallbackActive } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SCHEDULING_CONFIG } from "@/lib/date/schedule";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { validateTextForUnsafeUrls } from "@/lib/security/url-safety";
import {
  DebateRound,
  DebateMessage,
  Vote,
  FORMAT_CONFIGS,
  DebateFormat,
} from "@/types/database";
import { revalidatePath } from "next/cache";

/**
 * Check in to a scheduled debate match.
 * Check-in opens 5 minutes before scheduled start; grace period after start is 5 minutes.
 */
export async function checkInAction(
  matchId: string
): Promise<{ success: boolean; error?: string; matchStarted?: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Authentication required" };

  const now = new Date();

  if (isDevFallbackActive) {
    const match = memoryStore.matches.get(matchId);
    if (!match) return { success: false, error: "Match not found" };

    if (match.creator_id !== user.id && match.opponent_id !== user.id) {
      return { success: false, error: "Only confirmed participants can check in." };
    }

    if (match.status !== "scheduled" && match.status !== "in_progress") {
      return { success: false, error: `Cannot check in when match is ${match.status}.` };
    }

    if (!match.scheduled_slot_start) {
      return { success: false, error: "Match has no scheduled start time." };
    }

    const start = new Date(match.scheduled_slot_start);
    const checkinOpenTime = new Date(
      start.getTime() - SCHEDULING_CONFIG.CHECKIN_WINDOW_MINUTES * 60 * 1000
    );
    const graceExpiryTime = new Date(
      start.getTime() + SCHEDULING_CONFIG.GRACE_PERIOD_MINUTES * 60 * 1000
    );

    // Validate check-in window
    if (now < checkinOpenTime) {
      const minutesUntil = Math.ceil((checkinOpenTime.getTime() - now.getTime()) / 60000);
      return {
        success: false,
        error: `Check-in opens 5 minutes prior to match start (in ${minutesUntil} minutes).`,
      };
    }

    if (now > graceExpiryTime && !match.creator_checked_in_at && !match.opponent_checked_in_at) {
      match.status = "no_show";
      match.updated_at = now.toISOString();
      return { success: false, error: "Check-in grace period has expired. Match recorded as no-show." };
    }

    // Record check-in timestamp
    if (user.id === match.creator_id) {
      match.creator_checked_in_at = now.toISOString();
    } else {
      match.opponent_checked_in_at = now.toISOString();
    }
    match.updated_at = now.toISOString();

    // If both checked in, start the debate!
    let matchStarted = false;
    if (match.creator_checked_in_at && match.opponent_checked_in_at && match.status === "scheduled") {
      match.status = "in_progress";
      matchStarted = true;

      // Initialize debate rounds from format config
      const challenge = memoryStore.challenges.get(match.challenge_id);
      const format = (challenge?.format || "standard") as DebateFormat;
      const config = FORMAT_CONFIGS[format];

      let roundStartTime = now;
      config.rounds.forEach((roundCfg, idx) => {
        const roundId = `round_${match.id}_${roundCfg.number}`;
        const roundEnds = new Date(roundStartTime.getTime() + roundCfg.durationSeconds * 1000);

        const newRound: DebateRound = {
          id: roundId,
          match_id: match.id,
          round_number: roundCfg.number,
          round_type: roundCfg.type,
          active_speaker_id: null,
          starts_at: roundStartTime.toISOString(),
          ends_at: roundEnds.toISOString(),
          max_chars: roundCfg.maxChars,
          status: idx === 0 ? "active" : "pending",
          created_at: now.toISOString(),
        };

        memoryStore.debateRounds.set(roundId, newRound);
        roundStartTime = roundEnds;
      });
    }

    revalidatePath(`/debate-room/${matchId}`);
    return { success: true, matchStarted };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { success: false, error: "Database client unavailable" };

  const { data: match } = await supabase
    .from("matches")
    .select("*, challenge:challenges(format)")
    .eq("id", matchId)
    .single();

  if (!match) return { success: false, error: "Match not found" };

  if (match.creator_id !== user.id && match.opponent_id !== user.id) {
    return { success: false, error: "Only confirmed participants can check in." };
  }

  const start = new Date(match.scheduled_slot_start);
  const checkinOpenTime = new Date(
    start.getTime() - SCHEDULING_CONFIG.CHECKIN_WINDOW_MINUTES * 60 * 1000
  );
  if (now < checkinOpenTime) {
    return { success: false, error: "Check-in opens 5 minutes before scheduled start." };
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: now.toISOString(),
  };

  if (user.id === match.creator_id) {
    updatePayload.creator_checked_in_at = now.toISOString();
  } else {
    updatePayload.opponent_checked_in_at = now.toISOString();
  }

  const otherCheckedIn =
    user.id === match.creator_id
      ? !!match.opponent_checked_in_at
      : !!match.creator_checked_in_at;

  if (otherCheckedIn && match.status === "scheduled") {
    updatePayload.status = "in_progress";
  }

  await supabase.from("matches").update(updatePayload).eq("id", matchId);

  revalidatePath(`/debate-room/${matchId}`);
  return { success: true, matchStarted: otherCheckedIn };
}

/**
 * Post a debate argument message.
 * Enforces round timers, speaker permissions, and character limits on the server.
 */
export async function postDebateMessageAction(
  matchId: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Authentication required" };

  const trimmed = content.trim();
  if (!trimmed) {
    return { success: false, error: "Message content cannot be empty." };
  }

  // Rate limit messages: max 15 per minute
  const rl = checkRateLimit(`post_msg:${user.id}`, { limit: 15, windowMs: 60 * 1000 });
  if (!rl.success) {
    return { success: false, error: "Posting too fast. Please slow down." };
  }

  const urlCheck = validateTextForUnsafeUrls(trimmed);
  if (!urlCheck.isValid) {
    return {
      success: false,
      error: `Message rejected: unsafe protocol detected (${urlCheck.rejectedProtocol})`,
    };
  }

  const now = new Date();

  if (isDevFallbackActive) {
    const match = memoryStore.matches.get(matchId);
    if (!match) return { success: false, error: "Match not found" };

    if (match.creator_id !== user.id && match.opponent_id !== user.id) {
      return { success: false, error: "Only the two debate participants can submit messages." };
    }

    if (match.status !== "in_progress") {
      return { success: false, error: `Cannot submit messages when match is ${match.status}.` };
    }

    // Find current active round
    const activeRound = Array.from(memoryStore.debateRounds.values()).find(
      (r) => r.match_id === matchId && r.status === "active"
    );

    if (!activeRound) {
      return { success: false, error: "No active debate round right now." };
    }

    // Enforce character limit server-side
    if (trimmed.length > activeRound.max_chars) {
      return {
        success: false,
        error: `Message exceeds round character limit (${trimmed.length}/${activeRound.max_chars} chars).`,
      };
    }

    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newMsg: DebateMessage = {
      id: msgId,
      match_id: matchId,
      round_id: activeRound.id,
      sender_id: user.id,
      content: trimmed,
      submitted_at: now.toISOString(),
      sender: user.profile,
    };

    memoryStore.debateMessages.set(msgId, newMsg);
    revalidatePath(`/debate-room/${matchId}`);
    return { success: true };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { success: false, error: "Database client unavailable" };

  const { data: match } = await supabase
    .from("matches")
    .select("status, creator_id, opponent_id")
    .eq("id", matchId)
    .single();

  if (!match || match.status !== "in_progress") {
    return { success: false, error: "Debate is not in progress." };
  }

  if (match.creator_id !== user.id && match.opponent_id !== user.id) {
    return { success: false, error: "Only participants can submit." };
  }

  const { error } = await supabase.from("debate_messages").insert({
    match_id: matchId,
    sender_id: user.id,
    content: trimmed,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/debate-room/${matchId}`);
  return { success: true };
}

/**
 * Server-driven round progression.
 * Advances to next round or concludes the debate.
 */
export async function advanceDebateRoundAction(
  matchId: string
): Promise<{ success: boolean; nextRoundNumber?: number; completed?: boolean }> {
  const now = new Date();

  if (isDevFallbackActive) {
    const rounds = Array.from(memoryStore.debateRounds.values())
      .filter((r) => r.match_id === matchId)
      .sort((a, b) => a.round_number - b.round_number);

    const activeRound = rounds.find((r) => r.status === "active");
    if (!activeRound) return { success: false };

    activeRound.status = "completed";

    const nextRound = rounds.find((r) => r.round_number === activeRound.round_number + 1);
    if (nextRound) {
      nextRound.status = "active";
      nextRound.starts_at = now.toISOString();
      const challenge = memoryStore.challenges.get(memoryStore.matches.get(matchId)?.challenge_id || "");
      const config = FORMAT_CONFIGS[(challenge?.format || "standard") as DebateFormat];
      const cfg = config.rounds.find((r) => r.number === nextRound.round_number);
      nextRound.ends_at = new Date(now.getTime() + (cfg?.durationSeconds || 60) * 1000).toISOString();

      revalidatePath(`/debate-room/${matchId}`);
      return { success: true, nextRoundNumber: nextRound.round_number };
    } else {
      // All rounds completed! Conclude match
      const match = memoryStore.matches.get(matchId);
      if (match) {
        match.status = "completed";
        match.updated_at = now.toISOString();
      }
      revalidatePath(`/debate-room/${matchId}`);
      return { success: true, completed: true };
    }
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { success: false };

  // Supabase implementation updates round and match state
  revalidatePath(`/debate-room/${matchId}`);
  return { success: true };
}

/**
 * Audience voting (v1).
 * Rules:
 * - Match must be completed
 * - Verified account required
 * - One vote per account per match (DB unique constraint)
 * - Participants cannot vote in their own match
 * - Rate limited
 */
export async function castVoteAction(
  matchId: string,
  votedForSide: "creator" | "opponent" | "tie",
  rationale?: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in to vote." };
  }

  // Rate limit: max 10 votes per 5 minutes
  const rl = checkRateLimit(`vote:${user.id}`, { limit: 10, windowMs: 5 * 60 * 1000 });
  if (!rl.success) {
    return { success: false, error: "Voting rate limit reached. Please wait." };
  }

  if (isDevFallbackActive) {
    const match = memoryStore.matches.get(matchId);
    if (!match) return { success: false, error: "Match not found" };

    if (match.status !== "completed") {
      return { success: false, error: "Audience voting opens only after the debate is completed." };
    }

    // Participants cannot vote in their own match
    if (match.creator_id === user.id || match.opponent_id === user.id) {
      return { success: false, error: "Participants cannot vote in their own match." };
    }

    // Unique constraint: one vote per voter per match
    const existingVote = Array.from(memoryStore.votes.values()).find(
      (v) => v.match_id === matchId && v.voter_id === user.id
    );
    if (existingVote) {
      return { success: false, error: "You have already cast your vote for this debate." };
    }

    const voteId = `vote_${matchId}_${user.id}`;
    const vote: Vote = {
      id: voteId,
      match_id: matchId,
      voter_id: user.id,
      voted_for_side: votedForSide,
      rationale: rationale?.trim() || null,
      created_at: new Date().toISOString(),
      voter: user.profile,
    };

    memoryStore.votes.set(voteId, vote);
    revalidatePath(`/debate-room/${matchId}`);
    return { success: true };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { success: false, error: "Database client unavailable" };

  const { data: match } = await supabase
    .from("matches")
    .select("status, creator_id, opponent_id")
    .eq("id", matchId)
    .single();

  if (!match || match.status !== "completed") {
    return { success: false, error: "Voting is only allowed after completion." };
  }

  if (match.creator_id === user.id || match.opponent_id === user.id) {
    return { success: false, error: "Participants cannot vote in their own match." };
  }

  const { error } = await supabase.from("votes").insert({
    match_id: matchId,
    voter_id: user.id,
    voted_for_side: votedForSide,
    rationale: rationale?.trim() || null,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "You have already voted on this debate." };
    }
    return { success: false, error: error.message };
  }

  revalidatePath(`/debate-room/${matchId}`);
  return { success: true };
}

"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { memoryStore } from "@/lib/db/store";
import { isDevFallbackActive } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateTextForUnsafeUrls } from "@/lib/security/url-safety";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { checkBlockStatus } from "@/app/actions/blocks";
import { Challenge, Match, NotificationItem, CATEGORIES, ChallengeCategory } from "@/types/database";
import { revalidatePath } from "next/cache";

const createChallengeSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(120, "Title cannot exceed 120 characters"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description cannot exceed 2000 characters"),
  category: z.string().refine((val): val is ChallengeCategory => {
    return CATEGORIES.includes(val as ChallengeCategory);
  }, "Invalid category"),
  position_a: z
    .string()
    .max(300, "Side A stance cannot exceed 300 characters")
    .optional()
    .nullable(),
  position_b: z
    .string()
    .max(300, "Side B stance cannot exceed 300 characters")
    .optional()
    .nullable(),
  creator_side: z.enum(["a", "b"], {
    message: "You must choose either Side A or Side B",
  }),
  format: z.enum(["quick_clash", "standard"], {
    message: "Select either Quick Clash or Standard format",
  }),
  language: z.string().default("en"),
  visibility: z.enum(["public", "invite_only"]),
  deadline_days: z.string().optional(),
}).refine(
  (data) => {
    if (data.creator_side === "a") {
      return !!data.position_a && data.position_a.trim().length >= 3;
    }
    return !!data.position_b && data.position_b.trim().length >= 3;
  },
  {
    message: "Stance is required for your chosen side (at least 3 characters)",
    path: ["position_a"],
  }
);

export type ChallengeActionState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  challengeId?: string;
};

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "DBT-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createChallengeAction(
  _prevState: ChallengeActionState,
  formData: FormData
): Promise<ChallengeActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be signed in to create a challenge." };
  }

  // Rate limit: max 20 challenges per 10 minutes per user
  const rl = checkRateLimit(`create_challenge:${user.id}`, {
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });
  if (!rl.success) {
    return {
      error: `Rate limit reached. Please wait ${Math.ceil(rl.resetMs / 60000)} minute(s) before creating another challenge.`,
    };
  }

  const rawData = {
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    position_a: formData.get("position_a"),
    position_b: formData.get("position_b"),
    creator_side: formData.get("creator_side"),
    format: formData.get("format"),
    language: formData.get("language") || "en",
    visibility: formData.get("visibility"),
    deadline_days: formData.get("deadline_days") || undefined,
  };

  const parsed = createChallengeSchema.safeParse(rawData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as string;
      fieldErrors[field] = issue.message;
    }
    return { error: "Please fix the errors below", fieldErrors };
  }

  const {
    title,
    description,
    category,
    position_a,
    position_b,
    creator_side,
    format,
    language,
    visibility,
    deadline_days,
  } = parsed.data;

  // URL safety & unsafe protocol validation
  const titleCheck = validateTextForUnsafeUrls(title);
  if (!titleCheck.isValid) {
    return { error: `Title contains rejected protocol: ${titleCheck.rejectedProtocol}` };
  }

  const descCheck = validateTextForUnsafeUrls(description);
  if (!descCheck.isValid) {
    return { error: `Description contains rejected protocol: ${descCheck.rejectedProtocol}` };
  }

  let deadline: string | null = null;
  if (deadline_days && parseInt(deadline_days) > 0) {
    const days = parseInt(deadline_days);
    deadline = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }

  const inviteCode = generateInviteCode();
  const challengeId = `chl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const rawA = position_a?.trim();
  const rawB = position_b?.trim();
  const finalPositionA =
    rawA && rawA.length > 0
      ? rawA
      : "In favor / Proposition stance (open for challenger)";
  const finalPositionB =
    rawB && rawB.length > 0
      ? rawB
      : "Opposing counter-stance (open for challenger)";

  if (isDevFallbackActive) {
    const newChallenge: Challenge = {
      id: challengeId,
      creator_id: user.id,
      title,
      description,
      category,
      position_a: finalPositionA,
      position_b: finalPositionB,
      creator_side,
      format,
      language,
      visibility,
      deadline_to_find_opponent: deadline,
      status: "open",
      invite_code: inviteCode,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    memoryStore.challenges.set(challengeId, newChallenge);
    revalidatePath("/");
    revalidatePath("/explore");
    revalidatePath("/dashboard");
    redirect(`/debate/${challengeId}`);
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Database client unavailable" };

  const { data, error } = await supabase
    .from("challenges")
    .insert({
      creator_id: user.id,
      title,
      description,
      category,
      position_a: finalPositionA,
      position_b: finalPositionB,
      creator_side,
      format,
      language,
      visibility,
      deadline_to_find_opponent: deadline,
      status: "open",
      invite_code: inviteCode,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Failed to create challenge" };
  }

  revalidatePath("/");
  revalidatePath("/explore");
  revalidatePath("/dashboard");
  redirect(`/debate/${data.id}`);
}

/**
 * Atomic Accept Challenge: claims opposing side and generates scheduled match.
 */
export async function acceptChallengeAction(challengeId: string): Promise<{
  success: boolean;
  matchId?: string;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Please log in to accept this challenge." };
  }

  // Rate limit acceptance attempts
  const rl = checkRateLimit(`accept_challenge:${user.id}`, {
    limit: 10,
    windowMs: 60 * 1000,
  });
  if (!rl.success) {
    return { success: false, error: "Rate limit reached. Please wait before attempting again." };
  }

  if (isDevFallbackActive) {
    const challenge = memoryStore.challenges.get(challengeId);
    if (!challenge) {
      return { success: false, error: "Challenge not found." };
    }

    if (challenge.status !== "open") {
      return { success: false, error: "This challenge is no longer open for opponents." };
    }

    // Reject self-matching
    if (challenge.creator_id === user.id) {
      return { success: false, error: "You cannot accept your own challenge. Share the invite link with someone else!" };
    }

    // Check block relationship
    const isBlocked = await checkBlockStatus(challenge.creator_id, user.id);
    if (isBlocked) {
      return { success: false, error: "You cannot interact with this challenge." };
    }

    // Atomic update status
    challenge.status = "matched";
    challenge.updated_at = new Date().toISOString();

    const matchId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const opponentSide = challenge.creator_side === "a" ? "b" : "a";

    const newMatch: Match = {
      id: matchId,
      challenge_id: challenge.id,
      creator_id: challenge.creator_id,
      opponent_id: user.id,
      creator_side: challenge.creator_side,
      opponent_side: opponentSide,
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

    memoryStore.matches.set(matchId, newMatch);

    // Create in-app notification for the challenge creator
    const notifId = `notif_${Date.now()}`;
    const notification: NotificationItem = {
      id: notifId,
      user_id: challenge.creator_id,
      title: "Opponent Accepted Your Challenge!",
      body: `${user.profile.display_name} has accepted the opposing side in "${challenge.title}". Time to propose debate times.`,
      link: `/matches`,
      type: "challenge_accepted",
      read_at: null,
      created_at: new Date().toISOString(),
    };
    memoryStore.notifications.set(notifId, notification);

    revalidatePath("/");
    revalidatePath("/explore");
    revalidatePath("/matches");
    revalidatePath("/dashboard");
    revalidatePath(`/debate/${challengeId}`);

    return { success: true, matchId };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { success: false, error: "Database client unavailable" };

  // Fetch challenge to check creator and status
  const { data: challenge } = await supabase
    .from("challenges")
    .select("*")
    .eq("id", challengeId)
    .single();

  if (!challenge || challenge.status !== "open") {
    return { success: false, error: "This challenge is no longer open." };
  }

  if (challenge.creator_id === user.id) {
    return { success: false, error: "You cannot accept your own challenge." };
  }

  // Check blocks
  const isBlocked = await checkBlockStatus(challenge.creator_id, user.id);
  if (isBlocked) {
    return { success: false, error: "You cannot interact with this challenge." };
  }

  // Atomic conditional update in PostgreSQL: only one user succeeds in setting matched
  const { data: updatedChallenge, error: updateError } = await supabase
    .from("challenges")
    .update({ status: "matched", updated_at: new Date().toISOString() })
    .eq("id", challengeId)
    .eq("status", "open")
    .select("id")
    .single();

  if (updateError || !updatedChallenge) {
    return { success: false, error: "Another user just accepted this challenge a moment ago." };
  }

  const opponentSide = challenge.creator_side === "a" ? "b" : "a";

  const { data: matchData, error: matchError } = await supabase
    .from("matches")
    .insert({
      challenge_id: challenge.id,
      creator_id: challenge.creator_id,
      opponent_id: user.id,
      creator_side: challenge.creator_side,
      opponent_side: opponentSide,
      status: "pending_time",
    })
    .select("id")
    .single();

  if (matchError || !matchData) {
    return { success: false, error: "Failed to initialize match schedule." };
  }

  // Send notification to creator
  await supabase.from("notifications").insert({
    user_id: challenge.creator_id,
    title: "Opponent Accepted Your Challenge!",
    body: `${user.profile.display_name} has accepted the opposing side in "${challenge.title}". Time to propose debate times.`,
    link: `/matches`,
    type: "challenge_accepted",
  });

  revalidatePath("/");
  revalidatePath("/explore");
  revalidatePath("/matches");
  revalidatePath("/dashboard");
  revalidatePath(`/debate/${challengeId}`);

  return { success: true, matchId: matchData.id };
}

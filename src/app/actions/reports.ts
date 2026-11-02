"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { memoryStore } from "@/lib/db/store";
import { isDevFallbackActive } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { validateTextForUnsafeUrls } from "@/lib/security/url-safety";
import { Report } from "@/types/database";
import { revalidatePath } from "next/cache";

export interface CreateReportInput {
  targetType: "user" | "challenge" | "message" | "match" | "appeal";
  targetId: string;
  reason: string;
  description: string;
}

/**
 * Submits a safety report or moderation appeal.
 * Validates text safety and applies sliding-window rate limiting.
 */
export async function createReportAction(
  input: CreateReportInput
): Promise<{ success: boolean; error?: string; reportId?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required to submit reports." };
  }

  const reason = input.reason.trim();
  const description = input.description.trim();

  if (!reason || reason.length < 3) {
    return { success: false, error: "Please select or provide a valid reason (min 3 characters)." };
  }

  if (!description || description.length < 10) {
    return { success: false, error: "Please provide a detailed description (minimum 10 characters)." };
  }

  if (description.length > 1500) {
    return { success: false, error: "Description exceeds maximum length of 1500 characters." };
  }

  // Reject unsafe protocol injections
  const urlCheck = validateTextForUnsafeUrls(description);
  if (!urlCheck.isValid) {
    return {
      success: false,
      error: `Security violation: Prohibited protocol '${urlCheck.rejectedProtocol}' detected.`,
    };
  }

  // Sliding window rate limit: 5 reports per 10 minutes per account
  const rl = checkRateLimit(`report:${user.id}`, { limit: 5, windowMs: 10 * 60 * 1000 });
  if (!rl.success) {
    return {
      success: false,
      error: "You are submitting reports too quickly. Please wait a few minutes before reporting again.",
    };
  }

  const now = new Date();
  const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  if (isDevFallbackActive) {
    const newReport: Report = {
      id: reportId,
      reporter_id: user.id,
      target_type: input.targetType,
      target_id: input.targetId,
      reason,
      description,
      status: "pending",
      reviewed_by: null,
      review_notes: null,
      reviewed_at: null,
      created_at: now.toISOString(),
      reporter: user.profile,
    };

    memoryStore.reports.set(reportId, newReport);
    revalidatePath("/admin");
    return { success: true, reportId };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { success: false, error: "Database client unavailable." };

  const { error } = await supabase.from("reports").insert({
    id: reportId,
    reporter_id: user.id,
    target_type: input.targetType,
    target_id: input.targetId,
    reason,
    description,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin");
  return { success: true, reportId };
}

/**
 * Submits a moderation appeal for suspended or warned users.
 */
export async function submitModerationAppealAction(input: {
  reason: string;
  statement: string;
}): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required to submit an appeal." };
  }

  return createReportAction({
    targetType: "appeal",
    targetId: user.id,
    reason: input.reason,
    description: input.statement,
  });
}

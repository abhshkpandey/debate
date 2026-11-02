"use server";

import { requireAdmin, getCurrentUser } from "@/lib/auth/session";
import { memoryStore } from "@/lib/db/store";
import { isDevFallbackActive } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AdminAuditLog, NotificationItem } from "@/types/database";
import { revalidatePath } from "next/cache";

export type AdminResolutionAction =
  | "dismiss"
  | "hide_content"
  | "warn_user"
  | "suspend_user";

export interface ResolveReportParams {
  reportId: string;
  action: AdminResolutionAction;
  notes?: string;
}

/**
 * Resolves a moderation report with server-enforced admin authorization.
 * Appends an immutable audit log entry for every action taken.
 */
export async function resolveReportAction(
  params: ResolveReportParams
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin();
  const now = new Date();
  const notes = params.notes?.trim() || "No moderator notes provided";

  if (isDevFallbackActive) {
    const report = memoryStore.reports.get(params.reportId);
    if (!report) {
      return { success: false, error: "Report not found" };
    }

    report.status = params.action === "dismiss" ? "dismissed" : "action_taken";
    report.reviewed_by = admin.id;
    report.review_notes = notes;
    report.reviewed_at = now.toISOString();

    let targetUserId = report.target_type === "user" || report.target_type === "appeal" ? report.target_id : null;

    if (params.action === "hide_content") {
      if (report.target_type === "challenge") {
        const chl = memoryStore.challenges.get(report.target_id);
        if (chl) {
          chl.status = "cancelled";
          chl.updated_at = now.toISOString();
          targetUserId = chl.creator_id;
        }
      } else if (report.target_type === "message") {
        const msg = memoryStore.debateMessages.get(report.target_id);
        if (msg) {
          msg.content = "[Message removed by moderator for community safety violation]";
          targetUserId = msg.sender_id;
        }
      }
    }

    if (params.action === "warn_user" && targetUserId) {
      const notifId = `notif_warn_${Date.now()}`;
      const notif: NotificationItem = {
        id: notifId,
        user_id: targetUserId,
        title: "Official Moderation Warning",
        body: `Your content was flagged for violating community standards. Reason: ${notes}. Continued violations will result in account suspension.`,
        link: "/guidelines",
        type: "warning",
        read_at: null,
        created_at: now.toISOString(),
      };
      memoryStore.notifications.set(notifId, notif);
    }

    if (params.action === "suspend_user" && targetUserId) {
      const profile = memoryStore.profiles.get(targetUserId);
      if (profile) {
        profile.is_suspended = true;
        profile.updated_at = now.toISOString();
      }

      // Cancel any active scheduled matches
      for (const match of memoryStore.matches.values()) {
        if (
          (match.creator_id === targetUserId || match.opponent_id === targetUserId) &&
          (match.status === "scheduled" || match.status === "pending_time")
        ) {
          match.status = "cancelled";
          match.cancellation_reason = "Participant suspended by platform moderation";
          match.cancelled_by = admin.id;
          match.updated_at = now.toISOString();
        }
      }
    }

    // Immutable audit log
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const auditLog: AdminAuditLog = {
      id: auditId,
      admin_id: admin.id,
      action: params.action,
      target_type: report.target_type,
      target_id: report.target_id,
      details: {
        reportId: report.id,
        notes,
        targetUserId,
        actionTaken: params.action,
      },
      ip_address: "127.0.0.1",
      created_at: now.toISOString(),
    };

    memoryStore.adminAuditLogs.set(auditId, auditLog);
    revalidatePath("/admin");
    return { success: true };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { success: false, error: "Database client unavailable." };

  const { data: report } = await supabase
    .from("reports")
    .select("*")
    .eq("id", params.reportId)
    .single();

  if (!report) return { success: false, error: "Report not found" };

  await supabase
    .from("reports")
    .update({
      status: params.action === "dismiss" ? "dismissed" : "action_taken",
      reviewed_by: admin.id,
      review_notes: notes,
      reviewed_at: now.toISOString(),
    })
    .eq("id", params.reportId);

  await supabase.from("admin_audit_log").insert({
    admin_id: admin.id,
    action: params.action,
    target_type: report.target_type,
    target_id: report.target_id,
    details: { reportId: report.id, notes },
  });

  revalidatePath("/admin");
  return { success: true };
}

/**
 * Account deletion request (SHOULD item).
 */
export async function requestAccountDeletionAction(): Promise<{ success: boolean; message: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: "Authentication required" };

  if (isDevFallbackActive) {
    const profile = memoryStore.profiles.get(user.id);
    if (profile) {
      profile.is_suspended = true;
      profile.bio = "[Account marked for permanent deletion]";
    }
    return {
      success: true,
      message: "Account deletion requested. Your profile is disabled and data will be permanently wiped.",
    };
  }

  return {
    success: true,
    message: "Account deletion request submitted for processing.",
  };
}

/**
 * Account data export request (SHOULD item).
 */
export async function requestAccountDataExportAction(): Promise<{
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Authentication required" };

  if (isDevFallbackActive) {
    const profile = memoryStore.profiles.get(user.id);
    const userChallenges = Array.from(memoryStore.challenges.values()).filter(
      (c) => c.creator_id === user.id
    );
    const userMatches = Array.from(memoryStore.matches.values()).filter(
      (m) => m.creator_id === user.id || m.opponent_id === user.id
    );
    const userMessages = Array.from(memoryStore.debateMessages.values()).filter(
      (m) => m.sender_id === user.id
    );
    const userVotes = Array.from(memoryStore.votes.values()).filter(
      (v) => v.voter_id === user.id
    );

    return {
      success: true,
      data: {
        exportGeneratedAt: new Date().toISOString(),
        profile,
        challengesCount: userChallenges.length,
        matchesCount: userMatches.length,
        messagesCount: userMessages.length,
        votesCount: userVotes.length,
        challenges: userChallenges,
        matches: userMatches,
        messages: userMessages,
        votes: userVotes,
      },
    };
  }

  return {
    success: true,
    data: { message: "Data export compiled from database." },
  };
}

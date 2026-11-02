import { NextResponse } from "next/server";
import { memoryStore } from "@/lib/db/store";
import { env, isDevFallbackActive } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NotificationItem } from "@/types/database";

export async function GET(request: Request) {
  return handleReminders(request);
}

export async function POST(request: Request) {
  return handleReminders(request);
}

async function handleReminders(request: Request) {
  const url = new URL(request.url);
  const secretFromParam = url.searchParams.get("secret");
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : null;

  const providedSecret = bearerToken || secretFromParam;

  // Protect cron endpoint with secret
  if (!providedSecret || providedSecret !== env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  let processedCount = 0;
  let inAppCount = 0;
  let emailCount = 0;

  if (isDevFallbackActive) {
    const pendingJobs = Array.from(memoryStore.notificationJobs.values()).filter(
      (job) => job.status === "pending" && new Date(job.scheduled_for) <= now
    );

    for (const job of pendingJobs) {
      const match = memoryStore.matches.get(job.match_id);
      if (!match || match.status === "cancelled") {
        job.status = "cancelled";
        continue;
      }

      const challenge = memoryStore.challenges.get(match.challenge_id);
      const title = `Debate Reminder (${job.reminder_type})`;
      const body = `Your debate "${challenge?.title || "Match"}" is starting in approximately ${job.reminder_type}. Prepare your arguments!`;

      // Deliver in-app notification
      const notifId = `notif_rem_${job.id}`;
      const notif: NotificationItem = {
        id: notifId,
        user_id: job.user_id,
        title,
        body,
        link: `/debate-room/${match.id}`,
        type: "reminder",
        read_at: null,
        created_at: now.toISOString(),
      };
      memoryStore.notifications.set(notifId, notif);
      job.in_app_sent = true;
      inAppCount++;

      // Check email delivery (Resend)
      if (env.RESEND_API_KEY) {
        try {
          // Attempt dispatch via Resend HTTP API
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Debate Reminders <reminders@debate.app>",
              to: `${job.user_id}@example.com`,
              subject: title,
              text: body,
            }),
          });

          if (res.ok) {
            job.email_sent = true;
            emailCount++;
          } else {
            job.last_error = `Email dispatch failed: HTTP ${res.status}`;
            // Notice: Failed email never marks as delivered!
            job.email_sent = false;
          }
        } catch (err: unknown) {
          job.last_error = err instanceof Error ? err.message : "Network error";
          job.email_sent = false;
        }
      }

      job.status = "sent";
      processedCount++;
    }

    return NextResponse.json({
      success: true,
      processed: processedCount,
      inAppDelivered: inAppCount,
      emailsDelivered: emailCount,
      timestamp: now.toISOString(),
    });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  }

  // Supabase workflow queries notification_jobs
  const { data: jobs } = await supabase
    .from("notification_jobs")
    .select("*, match:matches(*)")
    .eq("status", "pending")
    .lte("scheduled_for", now.toISOString());

  if (jobs && jobs.length > 0) {
    for (const j of jobs) {
      await supabase.from("notifications").insert({
        user_id: j.user_id,
        title: `Debate Reminder (${j.reminder_type})`,
        body: "Your debate match is starting soon. Check in now!",
        link: `/debate-room/${j.match_id}`,
        type: "reminder",
      });

      await supabase
        .from("notification_jobs")
        .update({ status: "sent", in_app_sent: true })
        .eq("id", j.id);

      processedCount++;
    }
  }

  return NextResponse.json({
    success: true,
    processed: processedCount,
    timestamp: now.toISOString(),
  });
}

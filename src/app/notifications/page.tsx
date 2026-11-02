import React from "react";
import { requireAuth } from "@/lib/auth/session";
import { memoryStore } from "@/lib/db/store";
import { isDevFallbackActive } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NotificationItem } from "@/types/database";
import { EmptyState } from "@/components/ui/empty-state";
import { Bell } from "lucide-react";

export default async function NotificationsPage() {
  const user = await requireAuth("/notifications");

  let notifications: NotificationItem[] = [];

  if (isDevFallbackActive) {
    notifications = Array.from(memoryStore.notifications.values()).filter(
      (n) => n.user_id === user.id
    );
  } else {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      notifications = (data as NotificationItem[]) || [];
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="border-b border-[#E4E0D8] pb-6">
        <h1 className="text-3xl font-black text-[#0B0D10] tracking-tight">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-[#5B6472]">
          Match invitations, slot proposals, reminders, and debate verdicts.
        </p>
      </div>

      <div className="mt-8">
        {notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className="p-4 rounded-xl border border-[#E4E0D8] bg-[#FFFFFF] flex items-start justify-between"
              >
                <div>
                  <h4 className="font-bold text-sm text-[#0B0D10]">{n.title}</h4>
                  <p className="text-xs text-[#5B6472] mt-1">{n.body}</p>
                </div>
                <span className="text-[10px] text-[#5B6472]">
                  {new Date(n.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Bell}
            title="You're all caught up"
            description="You don't have any unread notifications or reminders right now."
          />
        )}
      </div>
    </div>
  );
}

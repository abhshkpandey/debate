import React from "react";
import Link from "next/link";
import { requireAuth } from "@/lib/auth/session";
import { memoryStore } from "@/lib/db/store";
import { isDevFallbackActive } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { WeeklyAvailability } from "@/types/database";
import { AvailabilityEditor } from "./availability-editor";

async function getUserWeeklyAvailability(userId: string): Promise<WeeklyAvailability[]> {
  if (isDevFallbackActive) {
    return Array.from(memoryStore.weeklyAvailability.values()).filter(
      (w) => w.user_id === userId
    );
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("weekly_availability")
    .select("*")
    .eq("user_id", userId);

  return (data as WeeklyAvailability[]) || [];
}

export default async function AvailabilitySettingsPage() {
  const user = await requireAuth("/settings/availability");
  const windows = await getUserWeeklyAvailability(user.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-[#0B0D10] tracking-tight">
          Account Settings
        </h1>
        <p className="text-xs text-[#5B6472]">
          Manage your identity, time zone, and scheduling preferences.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-56 shrink-0 space-y-1">
          <Link
            href="/settings/profile"
            className="block rounded-lg px-3.5 py-2.5 text-xs font-medium text-[#5B6472] hover:bg-[#F1EEE8] hover:text-[#0B0D10]"
          >
            Profile & Privacy
          </Link>
          <Link
            href="/settings/availability"
            className="block rounded-lg bg-[#FFFFFF] px-3.5 py-2.5 text-xs font-bold text-[#0B0D10] border border-[#E4E0D8]"
          >
            Weekly Availability
          </Link>
          <Link
            href="/settings/notifications"
            className="block rounded-lg px-3.5 py-2.5 text-xs font-medium text-[#5B6472] hover:bg-[#F1EEE8] hover:text-[#0B0D10]"
          >
            Notifications
          </Link>
        </aside>

        <div className="flex-1">
          <AvailabilityEditor
            initialWindows={windows}
            userTimezone={user.profile.timezone}
          />
        </div>
      </div>
    </div>
  );
}

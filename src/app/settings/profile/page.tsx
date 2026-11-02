import React from "react";
import { requireAuth } from "@/lib/auth/session";
import { ProfileForm } from "./profile-form";
import { DataRightsForm } from "./data-rights-form";
import Link from "next/link";

export default async function ProfileSettingsPage() {
  const user = await requireAuth("/settings/profile");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-[#0B0D10] tracking-tight">
          Account Settings
        </h1>
        <p className="text-xs text-[#5B6472]">
          Manage your identity, time zone, and privacy preferences.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Settings Navigation Sidebar */}
        <aside className="w-full md:w-56 shrink-0 space-y-1">
          <Link
            href="/settings/profile"
            className="block rounded-lg bg-[#FFFFFF] px-3.5 py-2.5 text-xs font-bold text-[#0B0D10] border border-[#E4E0D8]"
          >
            Profile & Privacy
          </Link>
          <Link
            href="/settings/availability"
            className="block rounded-lg px-3.5 py-2.5 text-xs font-medium text-[#5B6472] hover:bg-[#F1EEE8] hover:text-[#0B0D10]"
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

        {/* Main Settings Form */}
        <div className="flex-1 space-y-6">
          <ProfileForm profile={user.profile} />
          <DataRightsForm isSuspended={user.profile.is_suspended} />
        </div>
      </div>
    </div>
  );
}

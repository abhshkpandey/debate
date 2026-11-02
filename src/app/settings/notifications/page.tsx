import React from "react";
import Link from "next/link";
import { requireAuth } from "@/lib/auth/session";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default async function NotificationSettingsPage() {
  await requireAuth("/settings/notifications");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-[#0B0D10] tracking-tight">
          Account Settings
        </h1>
        <p className="text-xs text-[#5B6472]">
          Manage your notification channels and reminder preferences.
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
            className="block rounded-lg px-3.5 py-2.5 text-xs font-medium text-[#5B6472] hover:bg-[#F1EEE8] hover:text-[#0B0D10]"
          >
            Weekly Availability
          </Link>
          <Link
            href="/settings/notifications"
            className="block rounded-lg bg-[#FFFFFF] px-3.5 py-2.5 text-xs font-bold text-[#0B0D10] border border-[#E4E0D8]"
          >
            Notifications
          </Link>
        </aside>

        <div className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle>Match Reminders & Delivery</CardTitle>
              <CardDescription>
                Configure when and how you receive automated reminders for your upcoming matches.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-[#0B0D10]">
              <div className="flex items-center justify-between py-2 border-b border-[#E4E0D8]">
                <div>
                  <p className="font-semibold">24-Hour Notice</p>
                  <p className="text-xs text-[#5B6472]">Automated alert 24 hours prior to scheduled start.</p>
                </div>
                <span className="text-xs font-bold text-[#1F9D61]">Enabled</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-[#E4E0D8]">
                <div>
                  <p className="font-semibold">1-Hour Check-in Preparation</p>
                  <p className="text-xs text-[#5B6472]">Preparation reminder 60 minutes before check-in opens.</p>
                </div>
                <span className="text-xs font-bold text-[#1F9D61]">Enabled</span>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-semibold">10-Minute Final Warning</p>
                  <p className="text-xs text-[#5B6472]">Direct alert when waiting room check-in is active.</p>
                </div>
                <span className="text-xs font-bold text-[#1F9D61]">Enabled</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

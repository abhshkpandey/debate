import React from "react";
import { requireAuth } from "@/lib/auth/session";
import { memoryStore } from "@/lib/db/store";
import { isDevFallbackActive } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Match } from "@/types/database";
import { CalendarView } from "./calendar-view";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function CalendarPage() {
  const user = await requireAuth("/calendar");

  let matches: Match[] = [];

  if (isDevFallbackActive) {
    matches = Array.from(memoryStore.matches.values()).filter(
      (m) =>
        (m.creator_id === user.id || m.opponent_id === user.id) &&
        m.scheduled_slot_start
    );

    for (const m of matches) {
      m.challenge = memoryStore.challenges.get(m.challenge_id);
      m.creator = memoryStore.profiles.get(m.creator_id);
      m.opponent = memoryStore.profiles.get(m.opponent_id);
    }
  } else {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data } = await supabase
        .from("matches")
        .select("*, challenge:challenges(*), creator:profiles!creator_id(*), opponent:profiles!opponent_id(*)")
        .or(`creator_id.eq.${user.id},opponent_id.eq.${user.id}`)
        .not("scheduled_slot_start", "is", null)
        .order("scheduled_slot_start", { ascending: true });
      matches = (data as Match[]) || [];
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E0D8] pb-6 mb-6">
        <div>
          <h1 className="text-3xl font-black text-[#0B0D10] tracking-tight">
            Debate Calendar
          </h1>
          <p className="mt-1 text-sm text-[#5B6472]">
            Rendered in your local time zone ({user.profile.timezone}).
          </p>
        </div>

        <Link href="/settings/availability">
          <Button variant="outline" size="sm">
            Set Weekly Availability
          </Button>
        </Link>
      </div>

      <CalendarView matches={matches} userTimezone={user.profile.timezone} />
    </div>
  );
}

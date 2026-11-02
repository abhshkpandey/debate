import React from "react";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/session";
import { memoryStore } from "@/lib/db/store";
import { env, isDevFallbackActive } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateSuggestedSlots } from "@/lib/date/schedule";
import { Match, ChallengeSlot, WeeklyAvailability } from "@/types/database";
import { MatchSchedulerView } from "./match-scheduler-view";
import { Badge, type BadgeProps } from "@/components/ui/badge";

async function getMatchSchedulingData(matchId: string) {
  if (isDevFallbackActive) {
    const match = memoryStore.matches.get(matchId);
    if (!match) return null;

    match.challenge = memoryStore.challenges.get(match.challenge_id);
    match.creator = memoryStore.profiles.get(match.creator_id);
    match.opponent = memoryStore.profiles.get(match.opponent_id);

    const slots = Array.from(memoryStore.challengeSlots.values())
      .filter((s) => s.match_id === matchId)
      .sort((a, b) => new Date(a.slot_start).getTime() - new Date(b.slot_start).getTime());

    // Get weekly availability for creator & opponent
    const creatorAvail = Array.from(memoryStore.weeklyAvailability.values()).filter(
      (w) => w.user_id === match.creator_id
    );
    const opponentAvail = Array.from(memoryStore.weeklyAvailability.values()).filter(
      (w) => w.user_id === match.opponent_id
    );

    // Calculate suggestions
    const suggestions = generateSuggestedSlots(
      creatorAvail,
      match.creator?.timezone || "UTC",
      opponentAvail,
      match.opponent?.timezone || "UTC"
    );

    return { match, slots, suggestions };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data: match } = await supabase
    .from("matches")
    .select("*, challenge:challenges(*), creator:profiles!creator_id(*), opponent:profiles!opponent_id(*)")
    .eq("id", matchId)
    .single();

  if (!match) return null;

  const { data: slots } = await supabase
    .from("challenge_slots")
    .select("*")
    .eq("match_id", matchId)
    .order("slot_start", { ascending: true });

  const { data: creatorAvail } = await supabase
    .from("weekly_availability")
    .select("*")
    .eq("user_id", match.creator_id);

  const { data: opponentAvail } = await supabase
    .from("weekly_availability")
    .select("*")
    .eq("user_id", match.opponent_id);

  const suggestions = generateSuggestedSlots(
    (creatorAvail as WeeklyAvailability[]) || [],
    match.creator?.timezone || "UTC",
    (opponentAvail as WeeklyAvailability[]) || [],
    match.opponent?.timezone || "UTC"
  );

  return {
    match: match as Match,
    slots: (slots as ChallengeSlot[]) || [],
    suggestions,
  };
}

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAuth(`/matches/${id}`);
  const data = await getMatchSchedulingData(id);

  if (!data) {
    notFound();
  }

  const { match, slots, suggestions } = data;
  const isParticipant =
    user.id === match.creator_id || user.id === match.opponent_id;

  if (!isParticipant && !user.profile.is_admin) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h3 className="font-bold text-base text-[#0B0D10]">Access Denied</h3>
        <p className="mt-2 text-xs text-[#5B6472]">
          Only participants can view slot proposals and coordinate schedule.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="border-b border-[#E4E0D8] pb-6 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <Badge variant={match.status as BadgeProps["variant"]}>
            {match.status.replace("_", " ")}
          </Badge>
          <span className="text-xs font-semibold text-[#5B6472]">
            {match.challenge?.category} • {match.challenge?.format === "quick_clash" ? "Quick Clash" : "Standard Debate"}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-[#0B0D10] tracking-tight">
          {match.challenge?.title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-6 text-xs text-[#5B6472]">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[#0B0D10]">Side A:</span>
            <span>{match.challenge?.position_a}</span>
            <span className="text-[#0B0D10]">({match.creator?.display_name})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[#0B0D10]">Side B:</span>
            <span>{match.challenge?.position_b}</span>
            <span className="text-[#0B0D10]">({match.opponent?.display_name})</span>
          </div>
        </div>
      </div>

      {/* Main Scheduling View */}
      <MatchSchedulerView
        match={match}
        slots={slots}
        suggestedSlots={suggestions}
        currentUserId={user.id}
        userTimezone={user.profile.timezone}
        appUrl={env.NEXT_PUBLIC_APP_URL}
      />
    </div>
  );
}

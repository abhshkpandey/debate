import React from "react";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { memoryStore } from "@/lib/db/store";
import { isDevFallbackActive } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Match, DebateRound, DebateMessage, Vote } from "@/types/database";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { DebateRoomClient } from "./debate-room-client";

async function getDebateArenaData(matchId: string) {
  if (isDevFallbackActive) {
    const match = memoryStore.matches.get(matchId);
    if (!match) return null;

    match.challenge = memoryStore.challenges.get(match.challenge_id);
    match.creator = memoryStore.profiles.get(match.creator_id);
    match.opponent = memoryStore.profiles.get(match.opponent_id);

    const rounds = Array.from(memoryStore.debateRounds.values())
      .filter((r) => r.match_id === matchId)
      .sort((a, b) => a.round_number - b.round_number);

    const messages = Array.from(memoryStore.debateMessages.values())
      .filter((m) => m.match_id === matchId)
      .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());

    for (const msg of messages) {
      msg.sender = memoryStore.profiles.get(msg.sender_id);
    }

    const votes = Array.from(memoryStore.votes.values())
      .filter((v) => v.match_id === matchId);

    return { match, rounds, messages, votes };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data: match } = await supabase
    .from("matches")
    .select("*, challenge:challenges(*), creator:profiles!creator_id(*), opponent:profiles!opponent_id(*)")
    .eq("id", matchId)
    .single();

  if (!match) return null;

  const { data: rounds } = await supabase
    .from("debate_rounds")
    .select("*")
    .eq("match_id", matchId)
    .order("round_number", { ascending: true });

  const { data: messages } = await supabase
    .from("debate_messages")
    .select("*, sender:profiles(*)")
    .eq("match_id", matchId)
    .order("submitted_at", { ascending: true });

  const { data: votes } = await supabase
    .from("votes")
    .select("*")
    .eq("match_id", matchId);

  return {
    match: match as Match,
    rounds: (rounds as DebateRound[]) || [],
    messages: (messages as DebateMessage[]) || [],
    votes: (votes as Vote[]) || [],
  };
}

export default async function DebateRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getDebateArenaData(id);
  const currentUser = await getCurrentUser();

  if (!data) {
    notFound();
  }

  const { match, rounds, messages, votes } = data;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="border-b border-[#E4E0D8] pb-6 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <Badge variant={match.status as BadgeProps["variant"]}>
            {match.status.replace("_", " ")}
          </Badge>
          <span className="text-xs font-semibold text-[#5B6472]">
            {match.challenge?.category} •{" "}
            {match.challenge?.format === "quick_clash"
              ? "⚡ Quick Clash (~2m)"
              : "⏱ Standard Debate (~10m)"}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-[#0B0D10] tracking-tight">
          {match.challenge?.title}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-6 text-xs text-[#5B6472]">
          <div>
            <span className="font-bold text-[#0B0D10]">Side A: </span>
            <span>{match.challenge?.position_a}</span>
            <span className="font-semibold text-[#0B0D10]">
              {" "}
              ({match.creator?.display_name})
            </span>
          </div>
          <div>
            <span className="font-bold text-[#0B0D10]">Side B: </span>
            <span>{match.challenge?.position_b}</span>
            <span className="font-semibold text-[#0B0D10]">
              {" "}
              ({match.opponent?.display_name})
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Arena Client */}
      <DebateRoomClient
        match={match}
        rounds={rounds}
        messages={messages}
        votes={votes}
        currentUserId={currentUser?.id}
        userTimezone={currentUser?.profile.timezone || "UTC"}
      />
    </div>
  );
}

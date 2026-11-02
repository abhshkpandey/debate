import React from "react";
import Link from "next/link";
import { requireAuth } from "@/lib/auth/session";
import { memoryStore } from "@/lib/db/store";
import { isDevFallbackActive } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Match } from "@/types/database";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User } from "lucide-react";

export default async function MatchesPage() {
  const user = await requireAuth("/matches");

  let matches: Match[] = [];

  if (isDevFallbackActive) {
    matches = Array.from(memoryStore.matches.values()).filter(
      (m) => m.creator_id === user.id || m.opponent_id === user.id
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
        .order("created_at", { ascending: false });
      matches = (data as Match[]) || [];
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E0D8] pb-6">
        <div>
          <h1 className="text-3xl font-black text-[#0B0D10] tracking-tight">
            My Debate Matches
          </h1>
          <p className="mt-1 text-sm text-[#5B6472]">
            All scheduled, pending, and completed head-to-head matches.
          </p>
        </div>

        <Link href="/explore">
          <Button variant="primary">Find an Opponent</Button>
        </Link>
      </div>

      <div className="mt-8">
        {matches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.map((m) => {
              const opponent = user.id === m.creator_id ? m.opponent : m.creator;
              return (
                <div
                  key={m.id}
                  className="rounded-xl border border-[#E4E0D8] bg-[#FFFFFF] p-5 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase font-bold text-[#5B6472] bg-[#FAF8F4] px-2 py-0.5 rounded border border-[#E4E0D8]">
                        {m.challenge?.category}
                      </span>
                      <Badge variant={m.status as BadgeProps["variant"]}>
                        {m.status.replace("_", " ")}
                      </Badge>
                    </div>

                    <h3 className="mt-3 font-bold text-base text-[#0B0D10] line-clamp-2">
                      {m.challenge?.title}
                    </h3>

                    <div className="mt-3 flex items-center gap-1.5 text-xs text-[#5B6472]">
                      <User className="h-3.5 w-3.5" />
                      <span>vs @{opponent?.username} ({opponent?.display_name})</span>
                    </div>

                    {m.scheduled_slot_start && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[#0B0D10] bg-[#FAF8F4] p-2 rounded border border-[#E4E0D8]">
                        <Clock className="h-3.5 w-3.5 text-[#6B5CE6]" />
                        <span>Confirmed: {new Date(m.scheduled_slot_start).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 border-t border-[#E4E0D8] pt-3 flex justify-end">
                    {m.status === "pending_time" ? (
                      <Link href={`/matches/${m.id}`} className="w-full">
                        <Button variant="primary" size="sm" className="w-full font-bold">
                          Coordinate Schedule
                        </Button>
                      </Link>
                    ) : m.status === "scheduled" ? (
                      <Link href={`/matches/${m.id}`} className="w-full">
                        <Button variant="secondary" size="sm" className="w-full font-bold">
                          View Calendar & Schedule
                        </Button>
                      </Link>
                    ) : m.status === "completed" ? (
                      <div className="flex items-center gap-2 w-full">
                        <Link href={`/debate/${m.challenge_id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full text-xs">
                            View Verdict
                          </Button>
                        </Link>
                        <Link href={`/debate-room/${m.id}`} className="flex-1">
                          <Button variant="secondary" size="sm" className="w-full text-xs font-bold">
                            Transcript
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <Link href={`/debate-room/${m.id}`} className="w-full">
                        <Button variant="primary" size="sm" className="w-full font-bold">
                          Enter Live Arena
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Calendar}
            title="No matches found"
            description="You don't have any scheduled or active debate matches yet."
            action={
              <Link href="/explore">
                <Button variant="outline">Browse Open Challenges</Button>
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}

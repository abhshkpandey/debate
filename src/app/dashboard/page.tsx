import React from "react";
import Link from "next/link";
import { requireAuth } from "@/lib/auth/session";
import { memoryStore } from "@/lib/db/store";
import { isDevFallbackActive } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Challenge, Match } from "@/types/database";
import { Button } from "@/components/ui/button";
import { DebateCard } from "@/components/debate/debate-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PlusCircle, Swords, Calendar } from "lucide-react";

async function getUserDashboardData(userId: string) {
  if (isDevFallbackActive) {
    const userChallenges = Array.from(memoryStore.challenges.values())
      .filter((c) => c.creator_id === userId)
      .slice(0, 5);

    for (const c of userChallenges) {
      c.creator = memoryStore.profiles.get(userId);
    }

    const userMatches = Array.from(memoryStore.matches.values())
      .filter((m) => m.creator_id === userId || m.opponent_id === userId)
      .slice(0, 5);

    for (const m of userMatches) {
      m.challenge = memoryStore.challenges.get(m.challenge_id);
      m.creator = memoryStore.profiles.get(m.creator_id);
      m.opponent = memoryStore.profiles.get(m.opponent_id);
    }

    return { userChallenges, userMatches };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { userChallenges: [], userMatches: [] };

  const { data: challenges } = await supabase
    .from("challenges")
    .select("*, creator:profiles(*)")
    .eq("creator_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: matches } = await supabase
    .from("matches")
    .select("*, challenge:challenges(*), creator:profiles!creator_id(*), opponent:profiles!opponent_id(*)")
    .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
    .order("updated_at", { ascending: false })
    .limit(5);

  return {
    userChallenges: (challenges as Challenge[]) || [],
    userMatches: (matches as Match[]) || [],
  };
}

export default async function DashboardPage() {
  const user = await requireAuth("/dashboard");
  const { userChallenges, userMatches } = await getUserDashboardData(user.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E0D8] pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0B0D10] tracking-tight">
            Welcome back, {user.profile.display_name}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#5B6472]">
            @{user.profile.username} • Timezone: {user.profile.timezone}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/challenges/new">
            <Button variant="primary" className="font-bold gap-2">
              <PlusCircle className="h-4 w-4" />
              New Challenge
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active & Scheduled Matches */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0B0D10] flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#6B5CE6]" />
              My Matches
            </h2>
            <Link href="/matches" className="text-xs font-semibold text-[#0B0D10] hover:underline">
              View all
            </Link>
          </div>

          {userMatches.length > 0 ? (
            <div className="space-y-4">
              {userMatches.map((m) => (
                <DebateCard key={m.id} match={m} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Swords}
              title="No matches scheduled"
              description="Accept an open challenge or share an invite link to book a match."
              action={
                <Link href="/explore">
                  <Button variant="outline" size="sm">
                    Find an Opponent
                  </Button>
                </Link>
              }
            />
          )}
        </section>

        {/* My Created Challenges */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0B0D10] flex items-center gap-2">
              <Swords className="h-5 w-5 text-[#0B0D10]" />
              My Challenges
            </h2>
            <Link href="/challenges/new" className="text-xs font-semibold text-[#0B0D10] hover:underline">
              Create new
            </Link>
          </div>

          {userChallenges.length > 0 ? (
            <div className="space-y-4">
              {userChallenges.map((c) => (
                <DebateCard key={c.id} challenge={c} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={PlusCircle}
              title="No challenges created"
              description="Post a topic you have a strong opinion on and challenge someone to refute you."
              action={
                <Link href="/challenges/new">
                  <Button variant="primary" size="sm">
                    Start a Challenge
                  </Button>
                </Link>
              }
            />
          )}
        </section>
      </div>
    </div>
  );
}

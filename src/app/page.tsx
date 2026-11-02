import React from "react";
import Link from "next/link";
import { memoryStore } from "@/lib/db/store";
import { isDevFallbackActive } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Challenge, Match, CATEGORIES } from "@/types/database";
import { Button } from "@/components/ui/button";
import { DebateCard } from "@/components/debate/debate-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Swords, ArrowRight } from "lucide-react";

async function getHomepageData(): Promise<{
  openChallenges: Challenge[];
  upcomingMatches: Match[];
}> {
  if (isDevFallbackActive) {
    const openChallenges = Array.from(memoryStore.challenges.values())
      .filter((c) => c.status === "open" && c.visibility === "public")
      .slice(0, 6);

    // Attach creator profiles
    for (const c of openChallenges) {
      c.creator = memoryStore.profiles.get(c.creator_id);
    }

    const upcomingMatches = Array.from(memoryStore.matches.values())
      .filter((m) => m.status === "scheduled")
      .slice(0, 4);

    for (const m of upcomingMatches) {
      m.challenge = memoryStore.challenges.get(m.challenge_id);
      m.creator = memoryStore.profiles.get(m.creator_id);
      m.opponent = memoryStore.profiles.get(m.opponent_id);
    }

    return { openChallenges, upcomingMatches };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { openChallenges: [], upcomingMatches: [] };

  const { data: challenges } = await supabase
    .from("challenges")
    .select("*, creator:profiles(*)")
    .eq("status", "open")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(6);

  const { data: matches } = await supabase
    .from("matches")
    .select("*, challenge:challenges(*), creator:profiles!creator_id(*), opponent:profiles!opponent_id(*)")
    .eq("status", "scheduled")
    .order("scheduled_slot_start", { ascending: true })
    .limit(4);

  return {
    openChallenges: (challenges as Challenge[]) || [],
    upcomingMatches: (matches as Match[]) || [],
  };
}

export default async function HomePage() {
  const { openChallenges, upcomingMatches } = await getHomepageData();

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative border-b border-[#E4E0D8] bg-[#FAF8F4] px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E4E0D8] bg-[#FFFFFF] px-3 py-1 text-xs font-semibold text-[#0B0D10] shadow-xs mb-6">
            <span className="h-2 w-2 rounded-full bg-[#C7F36B]" />
            Competitive, Real-Time Structured Debates
          </div>

          <h1 className="font-black text-4xl sm:text-6xl md:text-7xl tracking-tight text-[#0B0D10] uppercase leading-[1.05]">
            YOU TALK. THEY TALK. <br className="hidden sm:inline" />
            <span className="underline decoration-[#C7F36B] decoration-4 underline-offset-8">
              THE INTERNET DECIDES.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-[#5B6472] leading-relaxed">
            Challenge strangers, defend your opinions, schedule your matches, and prove you can actually win an argument.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/explore">
              <Button size="lg" variant="primary" className="font-extrabold tracking-tight">
                Find a debate
              </Button>
            </Link>
            <Link href="/challenges/new">
              <Button size="lg" variant="secondary" className="font-bold">
                Start a challenge
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 3 Core Benefits */}
      <section className="border-b border-[#E4E0D8] bg-[#FFFFFF] py-14 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-xl border border-[#E4E0D8] bg-[#FAF8F4] p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0B0D10] text-[#C7F36B] font-bold text-sm mb-4">
                1
              </div>
              <h3 className="text-lg font-bold text-[#0B0D10]">Pick your side.</h3>
              <p className="mt-2 text-sm text-[#5B6472] leading-relaxed">
                Post your stance on politics, tech, culture, or philosophy. Set the rules, choose the round format, and invite an opponent or open it to the public.
              </p>
            </div>

            <div className="rounded-xl border border-[#E4E0D8] bg-[#FAF8F4] p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0B0D10] text-[#C7F36B] font-bold text-sm mb-4">
                2
              </div>
              <h3 className="text-lg font-bold text-[#0B0D10]">Schedule your match.</h3>
              <p className="mt-2 text-sm text-[#5B6472] leading-relaxed">
                Agree on a slot that fits both time zones. Automated calendar exports (.ics, Google Calendar, Outlook) ensure you never miss your scheduled round.
              </p>
            </div>

            <div className="rounded-xl border border-[#E4E0D8] bg-[#FAF8F4] p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0B0D10] text-[#C7F36B] font-bold text-sm mb-4">
                3
              </div>
              <h3 className="text-lg font-bold text-[#0B0D10]">Show up and argue.</h3>
              <p className="mt-2 text-sm text-[#5B6472] leading-relaxed">
                Check in 5 minutes before start. Engage in strict, timed text rounds. Once the debate concludes, verified audience voters decide who made the stronger case.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Explorer */}
      <section className="border-b border-[#E4E0D8] bg-[#FAF8F4] py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold uppercase tracking-tight text-[#0B0D10]">
              Browse by Category
            </h2>
            <Link
              href="/explore"
              className="text-xs font-semibold text-[#0B0D10] hover:underline flex items-center gap-1"
            >
              All Categories <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat}
                href={`/explore?category=${encodeURIComponent(cat)}`}
                className="rounded-lg border border-[#E4E0D8] bg-[#FFFFFF] px-3.5 py-2 text-xs font-semibold text-[#0B0D10] transition-colors hover:border-[#0B0D10] hover:bg-[#F1EEE8]"
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Open Challenges Section */}
      <section className="border-b border-[#E4E0D8] bg-[#FFFFFF] py-14 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold uppercase tracking-tight text-[#0B0D10]">
                Open Challenges
              </h2>
              <p className="text-sm text-[#5B6472] mt-1">
                Opponents wanted right now. Step up and take the opposing side.
              </p>
            </div>
            <Link href="/explore">
              <Button variant="outline" size="sm">
                View All Open
              </Button>
            </Link>
          </div>

          {openChallenges.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {openChallenges.map((challenge) => (
                <DebateCard key={challenge.id} challenge={challenge} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Swords}
              title="No open public challenges right now"
              description="Be the first debater to lay down a challenge for the community."
              action={
                <Link href="/challenges/new">
                  <Button variant="primary">Create Challenge</Button>
                </Link>
              }
            />
          )}
        </div>
      </section>

      {/* Upcoming Scheduled Debates */}
      {upcomingMatches.length > 0 && (
        <section className="bg-[#FAF8F4] py-14 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold uppercase tracking-tight text-[#0B0D10]">
                  Upcoming Debates
                </h2>
                <p className="text-sm text-[#5B6472] mt-1">
                  Scheduled matches preparing to go live.
                </p>
              </div>
              <Link href="/calendar">
                <Button variant="outline" size="sm">
                  View Full Calendar
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {upcomingMatches.map((match) => (
                <DebateCard key={match.id} match={match} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

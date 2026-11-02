import React from "react";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { memoryStore } from "@/lib/db/store";
import { isDevFallbackActive } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Profile, Match } from "@/types/database";
import { ProfileCard } from "@/components/profile/profile-card";
import { DebateCard } from "@/components/debate/debate-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Swords, Lock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProfileSafetyControls } from "@/components/profile/profile-safety-controls";

async function getProfileByUsername(username: string): Promise<{
  profile: Profile | null;
  matches: Match[];
  attendanceRate: number;
  totalCompleted: number;
}> {
  if (isDevFallbackActive) {
    const profile = Array.from(memoryStore.profiles.values()).find(
      (p) => p.username.toLowerCase() === username.toLowerCase()
    );

    if (!profile) return { profile: null, matches: [], attendanceRate: 100, totalCompleted: 0 };

    const matches = Array.from(memoryStore.matches.values())
      .filter(
        (m) =>
          (m.creator_id === profile.id || m.opponent_id === profile.id) &&
          m.status === "completed"
      )
      .slice(0, 10);

    for (const m of matches) {
      m.challenge = memoryStore.challenges.get(m.challenge_id);
      m.creator = memoryStore.profiles.get(m.creator_id);
      m.opponent = memoryStore.profiles.get(m.opponent_id);
    }

    const allUserMatches = Array.from(memoryStore.matches.values()).filter(
      (m) => m.creator_id === profile.id || m.opponent_id === profile.id
    );
    const scheduledOrFinished = allUserMatches.filter((m) =>
      ["scheduled", "in_progress", "completed", "no_show"].includes(m.status)
    );
    const attended = scheduledOrFinished.filter((m) => {
      if (m.creator_id === profile.id) {
        return !!m.creator_checked_in_at || m.status === "completed";
      }
      return !!m.opponent_checked_in_at || m.status === "completed";
    });
    const attendanceRate =
      scheduledOrFinished.length > 0
        ? Math.round((attended.length / scheduledOrFinished.length) * 100)
        : 100;

    return { profile, matches, attendanceRate, totalCompleted: matches.length };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { profile: null, matches: [], attendanceRate: 100, totalCompleted: 0 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .ilike("username", username)
    .single();

  if (!profile) return { profile: null, matches: [], attendanceRate: 100, totalCompleted: 0 };

  const { data: matches } = await supabase
    .from("matches")
    .select("*, challenge:challenges(*), creator:profiles!creator_id(*), opponent:profiles!opponent_id(*)")
    .or(`creator_id.eq.${profile.id},opponent_id.eq.${profile.id}`)
    .eq("status", "completed")
    .order("scheduled_slot_start", { ascending: false })
    .limit(10);

  return {
    profile: profile as Profile,
    matches: (matches as Match[]) || [],
    attendanceRate: 100,
    totalCompleted: matches?.length || 0,
  };
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const { profile, matches, attendanceRate, totalCompleted } = await getProfileByUsername(username);
  const currentUser = await getCurrentUser();

  if (!profile) {
    notFound();
  }

  const isOwner = currentUser?.id === profile.id;

  // Check if profile is private
  if (!profile.is_public && !isOwner && !currentUser?.profile.is_admin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <EmptyState
          icon={Lock}
          title="This profile is private"
          description="The user has set their profile visibility to private."
        />
      </div>
    );
  }

  let isBlocked = false;
  let isMuted = false;
  if (currentUser && !isOwner) {
    const { checkBlockStatus, checkMuteStatus } = await import("@/app/actions/blocks");
    isBlocked = await checkBlockStatus(currentUser.id, profile.id);
    isMuted = await checkMuteStatus(currentUser.id, profile.id);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-[#0B0D10] tracking-tight">
            Debater Profile
          </h1>
          <p className="text-xs text-[#5B6472]">
            Public debate records and verified participation stats.
          </p>
        </div>

        {isOwner ? (
          <Link href="/settings/profile">
            <Button variant="outline" size="sm">
              Edit Profile Settings
            </Button>
          </Link>
        ) : currentUser ? (
          <ProfileSafetyControls
            targetUserId={profile.id}
            targetUsername={profile.username}
            initialIsBlocked={isBlocked}
            initialIsMuted={isMuted}
          />
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <ProfileCard
            profile={profile}
            debatesCompleted={totalCompleted}
            attendanceRate={attendanceRate}
          />
        </div>

        <div className="md:col-span-2 space-y-6">
          <h2 className="text-lg font-bold text-[#0B0D10] border-b border-[#E4E0D8] pb-2">
            Completed Debates ({matches.length})
          </h2>

          {matches.length > 0 ? (
            <div className="space-y-4">
              {matches.map((m) => (
                <DebateCard key={m.id} match={m} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Swords}
              title="No completed debates yet"
              description={`${profile.display_name} has not concluded any public matches so far.`}
            />
          )}
        </div>
      </div>
    </div>
  );
}

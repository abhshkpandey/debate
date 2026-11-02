import React from "react";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { memoryStore } from "@/lib/db/store";
import { env, isDevFallbackActive } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkBlockStatus } from "@/app/actions/blocks";
import { Challenge } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DebateDetailActions } from "./debate-detail-actions";
import { User, Shield } from "lucide-react";
import Link from "next/link";

async function getChallenge(id: string): Promise<Challenge | null> {
  if (isDevFallbackActive) {
    const c = memoryStore.challenges.get(id);
    if (!c) return null;
    c.creator = memoryStore.profiles.get(c.creator_id);
    return c;
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("challenges")
    .select("*, creator:profiles(*)")
    .eq("id", id)
    .single();

  return data as Challenge | null;
}

export default async function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const challenge = await getChallenge(id);
  const currentUser = await getCurrentUser();

  if (!challenge) {
    notFound();
  }

  // Check if either user has blocked the other
  if (currentUser) {
    const isBlocked = await checkBlockStatus(currentUser.id, challenge.creator_id);
    if (isBlocked) {
      return (
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <div className="rounded-xl border border-[#E4E0D8] bg-[#FAF8F4] p-6">
            <Shield className="h-8 w-8 mx-auto text-[#D93A47] mb-2" />
            <h3 className="font-bold text-base text-[#0B0D10]">Access Restricted</h3>
            <p className="mt-2 text-xs text-[#5B6472]">
              You cannot view or accept this challenge due to account blocking restrictions.
            </p>
          </div>
        </div>
      );
    }
  }

  const isCreator = currentUser?.id === challenge.creator_id;
  const isDemo = challenge.creator?.display_name.includes("[Demo]");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4E0D8] pb-6 mb-8">
        <div className="flex items-center gap-2">
          <Badge variant={challenge.status === "open" ? "open" : "default"}>
            {challenge.status}
          </Badge>
          <span className="text-xs font-semibold text-[#5B6472]">
            {challenge.category} • {challenge.format === "quick_clash" ? "Quick Clash (2m)" : "Standard (10m)"}
          </span>
          {isDemo && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
              Demo Content
            </span>
          )}
        </div>

        <Link href={`/u/${challenge.creator?.username}`}>
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#0B0D10] hover:underline">
            <User className="h-3.5 w-3.5 text-[#5B6472]" />
            Created by {challenge.creator?.display_name}
          </div>
        </Link>
      </div>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black text-[#0B0D10] tracking-tight">
            {challenge.title}
          </h1>
          <p className="mt-3 text-base text-[#5B6472] leading-relaxed">
            {challenge.description}
          </p>
        </div>

        {/* Position Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <Card className={challenge.creator_side === "a" ? "border-2 border-[#0B0D10]" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#5B6472]">
                  Side A
                </span>
                {challenge.creator_side === "a" && (
                  <Badge variant="scheduled">Creator&apos;s Stance</Badge>
                )}
              </div>
              <CardTitle className="text-lg mt-2">{challenge.position_a}</CardTitle>
            </CardHeader>
          </Card>

          <Card className={challenge.creator_side === "b" ? "border-2 border-[#0B0D10]" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#5B6472]">
                  Side B
                </span>
                {challenge.creator_side === "b" && (
                  <Badge variant="scheduled">Creator&apos;s Stance</Badge>
                )}
              </div>
              <CardTitle className="text-lg mt-2">{challenge.position_b}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Actions Component (Accept / Share Invite / Block) */}
        <div className="pt-4">
          <DebateDetailActions
            challengeId={challenge.id}
            inviteCode={challenge.invite_code}
            creatorId={challenge.creator_id}
            creatorUsername={challenge.creator?.username || "creator"}
            creatorSide={challenge.creator_side}
            isCreator={isCreator}
            isAuthenticated={!!currentUser}
            isOpen={challenge.status === "open"}
            appUrl={env.NEXT_PUBLIC_APP_URL}
          />
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { memoryStore } from "@/lib/db/store";
import { isDevFallbackActive } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Challenge } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { InviteActions } from "./invite-actions";
import { User } from "lucide-react";
import Link from "next/link";

async function getChallengeByInviteCode(code: string): Promise<Challenge | null> {
  if (isDevFallbackActive) {
    const challenge = Array.from(memoryStore.challenges.values()).find(
      (c) => c.invite_code.toUpperCase() === code.toUpperCase()
    );
    if (!challenge) return null;
    challenge.creator = memoryStore.profiles.get(challenge.creator_id);
    return challenge;
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("challenges")
    .select("*, creator:profiles(*)")
    .ilike("invite_code", code)
    .single();

  return data as Challenge | null;
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const challenge = await getChallengeByInviteCode(code);
  const currentUser = await getCurrentUser();

  if (!challenge) {
    notFound();
  }

  const isCreator = currentUser?.id === challenge.creator_id;
  const opposingSide = challenge.creator_side === "a" ? "Side B" : "Side A";
  const opposingText =
    challenge.creator_side === "a" ? challenge.position_b : challenge.position_a;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between border-b border-[#E4E0D8] pb-4">
        <div className="flex items-center gap-2">
          <Badge variant={challenge.status === "open" ? "open" : "default"}>
            {challenge.status}
          </Badge>
          <span className="text-xs font-semibold text-[#5B6472]">
            {challenge.category} • {challenge.format === "quick_clash" ? "Quick Clash (2m)" : "Standard (10m)"}
          </span>
        </div>

        <Link
          href={`/u/${challenge.creator?.username}`}
          className="flex items-center gap-1.5 text-xs text-[#5B6472] hover:text-[#0B0D10]"
        >
          <User className="h-3.5 w-3.5" />
          <span>@{challenge.creator?.username}</span>
        </Link>
      </div>

      <div className="space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#6B5CE6]">
            Direct Debate Invitation
          </span>
          <h1 className="mt-1 text-3xl font-black text-[#0B0D10] tracking-tight">
            {challenge.title}
          </h1>
          <p className="mt-3 text-sm text-[#5B6472] leading-relaxed">
            {challenge.description}
          </p>
        </div>

        {/* Side Comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-[#E4E0D8] bg-[#FAF8F4] p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6472] block">
              Side A {challenge.creator_side === "a" && "(Creator's Stance)"}
            </span>
            <p className="mt-2 text-xs font-medium text-[#0B0D10] leading-relaxed">
              {challenge.position_a}
            </p>
          </div>

          <div className="rounded-xl border border-[#E4E0D8] bg-[#FAF8F4] p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6472] block">
              Side B {challenge.creator_side === "b" && "(Creator's Stance)"}
            </span>
            <p className="mt-2 text-xs font-medium text-[#0B0D10] leading-relaxed">
              {challenge.position_b}
            </p>
          </div>
        </div>

        {/* Actions Component */}
        <InviteActions
          challengeId={challenge.id}
          inviteCode={challenge.invite_code}
          isCreator={isCreator}
          isAuthenticated={!!currentUser}
          opposingSideLabel={opposingSide}
          opposingSideText={opposingText}
          isMatched={challenge.status !== "open"}
        />
      </div>
    </div>
  );
}

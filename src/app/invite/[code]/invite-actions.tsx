"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptChallengeAction } from "@/app/actions/challenges";
import { Button } from "@/components/ui/button";
import { Copy, Check, Swords, AlertCircle } from "lucide-react";
import Link from "next/link";

interface InviteActionsProps {
  challengeId: string;
  inviteCode: string;
  isCreator: boolean;
  isAuthenticated: boolean;
  opposingSideLabel: string;
  opposingSideText: string;
  isMatched: boolean;
}

export function InviteActions({
  challengeId,
  inviteCode,
  isCreator,
  isAuthenticated,
  opposingSideLabel,
  opposingSideText,
  isMatched,
}: InviteActionsProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCopy = () => {
    if (typeof window !== "undefined") {
      const url = window.location.href;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAccept = () => {
    setError(null);
    startTransition(async () => {
      const res = await acceptChallengeAction(challengeId);
      if (res.success && res.matchId) {
        router.push(`/matches`);
      } else {
        setError(res.error || "Failed to accept challenge.");
      }
    });
  };

  if (isMatched) {
    return (
      <div className="rounded-xl border border-[#E4E0D8] bg-[#FAF8F4] p-5 text-center">
        <h4 className="font-bold text-[#0B0D10]">This challenge has already been matched</h4>
        <p className="mt-1 text-xs text-[#5B6472]">
          An opponent has already accepted the opposing side and a match is pending or scheduled.
        </p>
        <div className="mt-4">
          <Link href="/explore">
            <Button variant="outline" size="sm">
              Explore Open Challenges
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isCreator) {
    return (
      <div className="rounded-xl border border-[#0B0D10] bg-[#FAF8F4] p-6 text-center space-y-4">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#0B0D10] text-[#C7F36B]">
          <Swords className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-bold text-[#0B0D10] text-base">You created this challenge</h4>
          <p className="mt-1 text-xs text-[#5B6472] max-w-md mx-auto">
            Share this link directly with a friend, colleague, or rival on social media or chat. When they accept, you will both be notified to agree on a time.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Button
            type="button"
            variant="primary"
            onClick={handleCopy}
            className="gap-2 font-bold cursor-pointer"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Invite Link Copied!" : "Copy Secret Invite Link"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#E4E0D8] bg-[#FFFFFF] p-6 shadow-sm space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-[#D93A47]/10 p-3 text-xs font-semibold text-[#D93A47] border border-[#D93A47]/20">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6B5CE6]">
          Your Assigned Position If You Accept
        </span>
        <h4 className="font-bold text-base text-[#0B0D10] mt-1">{opposingSideLabel}</h4>
        <p className="mt-2 text-xs text-[#5B6472] bg-[#FAF8F4] p-3 rounded-lg border border-[#E4E0D8]">
          {opposingSideText}
        </p>
      </div>

      <div className="pt-2 flex flex-col sm:flex-row gap-3">
        {isAuthenticated ? (
          <Button
            type="button"
            variant="primary"
            onClick={handleAccept}
            disabled={isPending}
            className="w-full font-bold justify-center gap-2 cursor-pointer"
          >
            <Swords className="h-4 w-4" />
            {isPending ? "Accepting Challenge..." : `Accept ${opposingSideLabel} & Match`}
          </Button>
        ) : (
          <Link
            href={`/login?next=${encodeURIComponent(`/invite/${inviteCode}`)}`}
            className="w-full"
          >
            <Button variant="primary" className="w-full font-bold justify-center">
              Sign In to Accept Challenge
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

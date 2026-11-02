"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptChallengeAction } from "@/app/actions/challenges";
import { blockUserAction } from "@/app/actions/blocks";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Swords, Copy, Check, AlertCircle } from "lucide-react";
import Link from "next/link";
import { ReportDialog } from "@/components/safety/report-dialog";

interface DebateDetailActionsProps {
  challengeId: string;
  inviteCode: string;
  creatorId: string;
  creatorUsername: string;
  creatorSide: "a" | "b";
  isCreator: boolean;
  isAuthenticated: boolean;
  isOpen: boolean;
  appUrl: string;
}

export function DebateDetailActions({
  challengeId,
  inviteCode,
  creatorId,
  creatorUsername,
  creatorSide,
  isCreator,
  isAuthenticated,
  isOpen,
  appUrl,
}: DebateDetailActionsProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCopy = () => {
    const inviteUrl = `${appUrl}/invite/${inviteCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAccept = () => {
    setError(null);
    startTransition(async () => {
      const res = await acceptChallengeAction(challengeId);
      if (res.success && res.matchId) {
        router.push("/matches");
      } else {
        setError(res.error || "Failed to accept challenge.");
      }
    });
  };

  const handleBlock = () => {
    startTransition(async () => {
      const res = await blockUserAction(creatorId);
      if (res.success) {
        setShowBlockDialog(false);
        router.push("/explore");
      } else {
        setError(res.error || "Failed to block user.");
      }
    });
  };

  const opposingSideLabel = creatorSide === "a" ? "Side B" : "Side A";

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-[#D93A47]/10 p-3 text-xs font-semibold text-[#D93A47] border border-[#D93A47]/20">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isCreator ? (
        <div className="rounded-xl border border-[#0B0D10] bg-[#FAF8F4] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0B0D10]">
              Your Challenge Invite Link
            </span>
            <span className="text-[11px] font-mono text-[#5B6472] bg-[#FFFFFF] px-2 py-0.5 rounded border border-[#E4E0D8]">
              {inviteCode}
            </span>
          </div>
          <p className="text-xs text-[#5B6472]">
            Share this link to challenge an opponent directly.
          </p>
          <Button
            type="button"
            variant="primary"
            onClick={handleCopy}
            className="w-full font-bold gap-2 cursor-pointer"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Invite Link Copied to Clipboard!" : "Copy Direct Invite Link"}
          </Button>
        </div>
      ) : isOpen ? (
        <div className="rounded-xl border border-[#E4E0D8] bg-[#FFFFFF] p-5 space-y-4 shadow-sm">
          <div>
            <h4 className="font-bold text-sm text-[#0B0D10]">
              Step up and claim the opposing argument
            </h4>
            <p className="text-xs text-[#5B6472] mt-1">
              Taking this stance locks you into a head-to-head match against @{creatorUsername}.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {isAuthenticated ? (
              <Button
                type="button"
                variant="primary"
                onClick={handleAccept}
                disabled={isPending}
                className="w-full font-bold justify-center gap-2 cursor-pointer"
              >
                <Swords className="h-4 w-4" />
                {isPending ? "Accepting..." : `Accept & Take ${opposingSideLabel}`}
              </Button>
            ) : (
              <Link
                href={`/login?next=${encodeURIComponent(`/debate/${challengeId}`)}`}
                className="w-full"
              >
                <Button variant="primary" className="w-full font-bold justify-center">
                  Log In to Take {opposingSideLabel}
                </Button>
              </Link>
            )}

            {isAuthenticated && (
              <div className="flex items-center gap-2">
                <ReportDialog
                  targetType="challenge"
                  targetId={challengeId}
                  targetLabel="Challenge"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowBlockDialog(true)}
                  className="text-xs text-[#5B6472] hover:text-[#D93A47]"
                >
                  Block Creator
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[#E4E0D8] bg-[#FAF8F4] p-4 text-center">
          <p className="text-xs font-semibold text-[#5B6472]">
            This challenge is matched or closed.
          </p>
        </div>
      )}

      {/* Block Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showBlockDialog}
        title={`Block @${creatorUsername}?`}
        description="Blocked users will not be able to challenge you, accept your challenges, or view your private profile. This can be undone later."
        confirmText="Block User"
        variant="danger"
        isLoading={isPending}
        onConfirm={handleBlock}
        onCancel={() => setShowBlockDialog(false)}
      />
    </div>
  );
}

"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ReportDialog } from "@/components/safety/report-dialog";
import { blockUserAction, unblockUserAction, muteUserAction, unmuteUserAction } from "@/app/actions/blocks";
import { Ban, VolumeX, Volume2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface ProfileSafetyControlsProps {
  targetUserId: string;
  targetUsername: string;
  initialIsBlocked: boolean;
  initialIsMuted: boolean;
}

export function ProfileSafetyControls({
  targetUserId,
  targetUsername,
  initialIsBlocked,
  initialIsMuted,
}: ProfileSafetyControlsProps) {
  const [isBlocked, setIsBlocked] = useState(initialIsBlocked);
  const [isMuted, setIsMuted] = useState(initialIsMuted);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleToggleBlock = () => {
    if (!isBlocked) {
      setShowBlockConfirm(true);
    } else {
      startTransition(async () => {
        const res = await unblockUserAction(targetUserId);
        if (res.success) {
          setIsBlocked(false);
        }
      });
    }
  };

  const handleConfirmBlock = () => {
    startTransition(async () => {
      const res = await blockUserAction(targetUserId);
      if (res.success) {
        setIsBlocked(true);
      }
      setShowBlockConfirm(false);
    });
  };

  const handleToggleMute = () => {
    startTransition(async () => {
      if (isMuted) {
        const res = await unmuteUserAction(targetUserId);
        if (res.success) setIsMuted(false);
      } else {
        const res = await muteUserAction(targetUserId);
        if (res.success) setIsMuted(true);
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ReportDialog
        targetType="user"
        targetId={targetUserId}
        targetLabel={`@${targetUsername}`}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleToggleMute}
        disabled={isPending}
        className="text-[#5B6472] hover:text-[#0B0D10]"
      >
        {isMuted ? (
          <>
            <Volume2 className="h-3.5 w-3.5 mr-1" />
            Unmute
          </>
        ) : (
          <>
            <VolumeX className="h-3.5 w-3.5 mr-1" />
            Mute
          </>
        )}
      </Button>

      <Button
        type="button"
        variant={isBlocked ? "outline" : "danger"}
        size="sm"
        onClick={handleToggleBlock}
        disabled={isPending}
      >
        <Ban className="h-3.5 w-3.5 mr-1" />
        {isBlocked ? "Unblock" : "Block"}
      </Button>

      <ConfirmDialog
        isOpen={showBlockConfirm}
        title={`Block @${targetUsername}?`}
        description={`Blocked users cannot challenge you, accept your challenges, or send you messages. Existing scheduled matches will be cancelled.`}
        confirmText="Block User"
        variant="danger"
        isLoading={isPending}
        onConfirm={handleConfirmBlock}
        onCancel={() => setShowBlockConfirm(false)}
      />
    </div>
  );
}

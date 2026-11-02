"use client";

import React, { useTransition } from "react";
import { devSwitchUserAction } from "@/app/actions/auth";
import { AlertTriangle } from "lucide-react";

interface DevBannerProps {
  currentUser?: {
    id: string;
    username: string;
    display_name: string;
    is_admin: boolean;
  } | null;
}

export function DevBanner({ currentUser }: DevBannerProps) {
  const [isPending, startTransition] = useTransition();

  const handleSwitch = (userId: string) => {
    startTransition(async () => {
      await devSwitchUserAction(userId);
    });
  };

  return (
    <div className="bg-[#FAF8F4] border-b border-[#E4E0D8] px-4 py-2 text-xs text-[#0B0D10]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 font-bold text-amber-900 border border-amber-300">
            <AlertTriangle className="h-3 w-3" />
            DEV FALLBACK ACTIVE
          </span>
          <span className="text-[#5B6472]">
            Supabase keys not configured in .env.local. In-memory data store with demo content active.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#5B6472]">Switch Demo Persona:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleSwitch("usr_alex_01")}
              disabled={isPending || currentUser?.id === "usr_alex_01"}
              className={`rounded px-2 py-0.5 font-medium transition-colors cursor-pointer ${
                currentUser?.id === "usr_alex_01"
                  ? "bg-[#C7F36B] text-[#0B0D10] font-bold"
                  : "bg-[#FFFFFF] border border-[#E4E0D8] text-[#0B0D10] hover:bg-[#F1EEE8]"
              }`}
            >
              Alex (User A)
            </button>
            <button
              onClick={() => handleSwitch("usr_sam_02")}
              disabled={isPending || currentUser?.id === "usr_sam_02"}
              className={`rounded px-2 py-0.5 font-medium transition-colors cursor-pointer ${
                currentUser?.id === "usr_sam_02"
                  ? "bg-[#C7F36B] text-[#0B0D10] font-bold"
                  : "bg-[#FFFFFF] border border-[#E4E0D8] text-[#0B0D10] hover:bg-[#F1EEE8]"
              }`}
            >
              Sam (User B)
            </button>
            <button
              onClick={() => handleSwitch("usr_admin_01")}
              disabled={isPending || currentUser?.id === "usr_admin_01"}
              className={`rounded px-2 py-0.5 font-medium transition-colors cursor-pointer ${
                currentUser?.id === "usr_admin_01"
                  ? "bg-[#6B5CE6] text-[#FFFFFF] font-bold"
                  : "bg-[#FFFFFF] border border-[#E4E0D8] text-[#0B0D10] hover:bg-[#F1EEE8]"
              }`}
            >
              Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

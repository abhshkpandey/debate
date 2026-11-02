import React from "react";
import Link from "next/link";
import { Profile } from "@/types/database";
import { Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProfileCardProps {
  profile: Profile;
  debatesCompleted?: number;
  attendanceRate?: number;
}

export function ProfileCard({
  profile,
  debatesCompleted = 0,
  attendanceRate = 100,
}: ProfileCardProps) {
  const isDemo = profile.display_name.includes("[Demo]");

  return (
    <div className="rounded-xl border border-[#E4E0D8] bg-[#FFFFFF] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F1EEE8] text-[#0B0D10] font-bold text-lg border border-[#E4E0D8]">
            {profile.display_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-[#0B0D10]">{profile.display_name}</h3>
              {profile.is_admin && (
                <Badge variant="scheduled" className="text-[10px] py-0 px-1.5">
                  Admin
                </Badge>
              )}
              {isDemo && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                  Demo
                </span>
              )}
            </div>
            <Link
              href={`/u/${profile.username}`}
              className="text-xs text-[#5B6472] hover:text-[#0B0D10] hover:underline"
            >
              @{profile.username}
            </Link>
          </div>
        </div>
      </div>

      {profile.bio && (
        <p className="mt-3 text-xs text-[#5B6472] leading-relaxed line-clamp-3">
          {profile.bio}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[#E4E0D8] pt-3 text-xs text-[#5B6472]">
        <div className="flex items-center gap-1">
          <Globe className="h-3.5 w-3.5" />
          <span>{profile.timezone}</span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="font-semibold text-[#0B0D10]">{debatesCompleted}</span>
          <span>debates</span>
          <span className="text-[#E4E0D8]">|</span>
          <span className="font-semibold text-[#0B0D10]">{attendanceRate}%</span>
          <span>attendance</span>
        </div>
      </div>
    </div>
  );
}

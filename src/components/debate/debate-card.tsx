import React from "react";
import Link from "next/link";
import { Challenge, Match, MatchStatus } from "@/types/database";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";

interface DebateCardProps {
  challenge?: Challenge;
  match?: Match;
}

function getBadgeVariant(status: MatchStatus): BadgeProps["variant"] {
  switch (status) {
    case "scheduled":
      return "scheduled";
    case "in_progress":
      return "in_progress";
    case "completed":
      return "completed";
    case "cancelled":
    case "no_show":
    case "disputed":
      return "cancelled";
    default:
      return "default";
  }
}

export function DebateCard({ challenge, match }: DebateCardProps) {
  const item = challenge ?? match?.challenge;
  if (!item) return null;

  const isQuickClash = item.format === "quick_clash";
  const creator = challenge?.creator ?? match?.creator;
  const isDemo = creator?.display_name.includes("[Demo]");

  return (
    <div className="group flex flex-col justify-between rounded-xl border border-[#E4E0D8] bg-[#FFFFFF] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition-all hover:border-[#0B0D10] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-[#F1EEE8] px-2.5 py-0.5 text-xs font-semibold text-[#0B0D10] border border-[#E4E0D8]">
              {item.category}
            </span>
            <span className="rounded-full bg-[#FAF8F4] px-2 py-0.5 text-xs font-medium text-[#5B6472] border border-[#E4E0D8]">
              {isQuickClash ? "⚡ Quick Clash (2m)" : "⏱ Standard (10m)"}
            </span>
            {isDemo && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                Demo
              </span>
            )}
          </div>
          {match ? (
            <Badge variant={getBadgeVariant(match.status)}>
              {match.status.replace("_", " ")}
            </Badge>
          ) : (
            <Badge variant="open">Open</Badge>
          )}
        </div>

        <Link
          href={match ? `/debate-room/${match.id}` : `/debate/${item.id}`}
          className="mt-3 block"
        >
          <h3 className="text-lg font-bold text-[#0B0D10] line-clamp-2 group-hover:underline">
            {item.title}
          </h3>
          <p className="mt-1.5 text-xs text-[#5B6472] line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        </Link>

        {/* The Two Sides Stance Box */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-[#FAF8F4] p-2.5 border border-[#E4E0D8]">
            <span className="block font-bold text-[#0B0D10] uppercase tracking-wider text-[10px] text-[#5B6472]">
              Side A {item.creator_side === "a" && "(Creator)"}
            </span>
            <p className="mt-1 text-[#0B0D10] line-clamp-2">{item.position_a}</p>
          </div>
          <div className="rounded-lg bg-[#FAF8F4] p-2.5 border border-[#E4E0D8]">
            <span className="block font-bold text-[#0B0D10] uppercase tracking-wider text-[10px] text-[#5B6472]">
              Side B {item.creator_side === "b" && "(Creator)"}
            </span>
            <p className="mt-1 text-[#0B0D10] line-clamp-2">{item.position_b}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-[#E4E0D8] pt-3 text-xs text-[#5B6472]">
        <div className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 text-[#5B6472]" />
          <span>{creator?.display_name || "Creator"}</span>
        </div>

        {match ? (
          <Link href={`/debate-room/${match.id}`}>
            <Button size="sm" variant="primary">
              View Debate
            </Button>
          </Link>
        ) : (
          <Link href={`/debate/${item.id}`}>
            <Button size="sm" variant="primary">
              Take Other Side
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

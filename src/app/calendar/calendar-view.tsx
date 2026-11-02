"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatLocalTime } from "@/lib/date/schedule";
import { Match } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react";
import { addDays, startOfWeek, format } from "date-fns";

interface CalendarViewProps {
  matches: Match[];
  userTimezone: string;
}

export function CalendarView({ matches, userTimezone }: CalendarViewProps) {
  const [viewMode, setViewMode] = useState<"agenda" | "week" | "month">("agenda");
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

  // Filter only matches that have a scheduled start time
  const scheduledMatches = matches.filter(
    (m) => m.scheduled_slot_start && (m.status === "scheduled" || m.status === "in_progress")
  );

  // Compute week dates for Week View
  const today = new Date();
  const startOfCurrentWeek = startOfWeek(addDays(today, currentWeekOffset * 7), {
    weekStartsOn: 0,
  });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startOfCurrentWeek, i));

  return (
    <div className="space-y-6">
      {/* View Switcher and Navigation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E0D8] pb-4">
        {/* Toggle Buttons */}
        <div className="flex items-center gap-1 bg-[#F1EEE8] p-1 rounded-lg border border-[#E4E0D8]">
          <button
            onClick={() => setViewMode("agenda")}
            className={`rounded-md px-3 py-1 text-xs font-bold transition-colors cursor-pointer ${
              viewMode === "agenda"
                ? "bg-[#FFFFFF] text-[#0B0D10] shadow-xs"
                : "text-[#5B6472] hover:text-[#0B0D10]"
            }`}
          >
            Agenda View
          </button>
          <button
            onClick={() => setViewMode("week")}
            className={`rounded-md px-3 py-1 text-xs font-bold transition-colors cursor-pointer ${
              viewMode === "week"
                ? "bg-[#FFFFFF] text-[#0B0D10] shadow-xs"
                : "text-[#5B6472] hover:text-[#0B0D10]"
            }`}
          >
            Week View
          </button>
          <button
            onClick={() => setViewMode("month")}
            className={`rounded-md px-3 py-1 text-xs font-bold transition-colors cursor-pointer ${
              viewMode === "month"
                ? "bg-[#FFFFFF] text-[#0B0D10] shadow-xs"
                : "text-[#5B6472] hover:text-[#0B0D10]"
            }`}
          >
            Month View
          </button>
        </div>

        {/* Week controls */}
        {viewMode === "week" && (
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeekOffset((prev) => prev - 1)}
              className="h-8 w-8 p-0"
              aria-label="Previous week"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-[#0B0D10]">
              {format(weekDays[0], "MMM d")} – {format(weekDays[6], "MMM d, yyyy")}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeekOffset((prev) => prev + 1)}
              className="h-8 w-8 p-0"
              aria-label="Next week"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {currentWeekOffset !== 0 && (
              <button
                onClick={() => setCurrentWeekOffset(0)}
                className="text-[#5B6472] hover:underline cursor-pointer ml-1"
              >
                Today
              </button>
            )}
          </div>
        )}
      </div>

      {/* AGENDA VIEW */}
      {viewMode === "agenda" && (
        <div className="space-y-4">
          {scheduledMatches.length > 0 ? (
            scheduledMatches.map((match) => (
              <div
                key={match.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-[#E4E0D8] bg-[#FFFFFF] shadow-xs hover:border-[#0B0D10] transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant={match.status as BadgeProps["variant"]}>
                      {match.status.replace("_", " ")}
                    </Badge>
                    <span className="text-xs font-semibold text-[#5B6472]">
                      {match.challenge?.category}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#0B0D10]">
                    {match.challenge?.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#5B6472]">
                    <div className="flex items-center gap-1 font-semibold text-[#0B0D10]">
                      <Clock className="h-3.5 w-3.5 text-[#6B5CE6]" />
                      <span>
                        {formatLocalTime(
                          match.scheduled_slot_start!,
                          userTimezone,
                          "EEEE, MMMM d, yyyy 'at' h:mm a (zzz)"
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      <span>
                        {match.creator?.display_name} vs {match.opponent?.display_name}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/matches/${match.id}`}>
                    <Button variant="outline" size="sm">
                      Details & .ics
                    </Button>
                  </Link>
                  <Link href={`/debate-room/${match.id}`}>
                    <Button variant="primary" size="sm" className="font-bold">
                      Debate Room
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center rounded-xl border border-dashed border-[#E4E0D8] bg-[#F1EEE8]/40">
              <CalendarIcon className="h-8 w-8 mx-auto text-[#5B6472] mb-2" />
              <h4 className="font-bold text-sm text-[#0B0D10]">No upcoming scheduled debates</h4>
              <p className="mt-1 text-xs text-[#5B6472]">
                Once a match proposal is mutually confirmed, it will appear here.
              </p>
            </div>
          )}
        </div>
      )}

      {/* WEEK VIEW (Mobile Scrollable) */}
      {viewMode === "week" && (
        <div className="overflow-x-auto pb-4">
          <div className="min-w-[700px] grid grid-cols-7 gap-2">
            {weekDays.map((day, idx) => {
              const dayStr = format(day, "yyyy-MM-dd");
              const isToday = format(today, "yyyy-MM-dd") === dayStr;

              // Find matches falling on this day in viewer's timezone
              const dayMatches = scheduledMatches.filter((m) => {
                const matchDay = formatLocalTime(
                  m.scheduled_slot_start!,
                  userTimezone,
                  "yyyy-MM-dd"
                );
                return matchDay === dayStr;
              });

              return (
                <div
                  key={idx}
                  className={`rounded-xl border p-3 min-h-[220px] flex flex-col justify-between ${
                    isToday
                      ? "border-[#0B0D10] bg-[#FAF8F4]"
                      : "border-[#E4E0D8] bg-[#FFFFFF]"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-[#E4E0D8] pb-1.5 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6472]">
                        {format(day, "EEE")}
                      </span>
                      <span
                        className={`text-xs font-black ${
                          isToday
                            ? "flex h-5 w-5 items-center justify-center rounded-full bg-[#0B0D10] text-[#C7F36B]"
                            : "text-[#0B0D10]"
                        }`}
                      >
                        {format(day, "d")}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {dayMatches.map((m) => (
                        <Link
                          key={m.id}
                          href={`/matches/${m.id}`}
                          className="block rounded-lg bg-[#F1EEE8] p-2 hover:bg-[#C7F36B]/20 border border-[#E4E0D8] transition-colors"
                        >
                          <span className="text-[10px] font-bold text-[#6B5CE6] block">
                            {formatLocalTime(
                              m.scheduled_slot_start!,
                              userTimezone,
                              "h:mm a"
                            )}
                          </span>
                          <span className="text-xs font-semibold text-[#0B0D10] line-clamp-2">
                            {m.challenge?.title}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MONTH VIEW (SHOULD) */}
      {viewMode === "month" && (
        <div className="rounded-xl border border-[#E4E0D8] bg-[#FFFFFF] p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E4E0D8] pb-3 mb-4">
            <h3 className="font-bold text-base text-[#0B0D10]">
              {format(today, "MMMM yyyy")}
            </h3>
            <span className="text-xs text-[#5B6472]">{scheduledMatches.length} scheduled</span>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-[#5B6472] mb-2 uppercase tracking-wider">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 35 }).map((_, i) => {
              const dayNum = (i % 31) + 1;
              const hasMatch = scheduledMatches.some((m) => {
                const dayStr = formatLocalTime(m.scheduled_slot_start!, userTimezone, "d");
                return parseInt(dayStr) === dayNum;
              });

              return (
                <div
                  key={i}
                  className={`h-16 rounded-lg border p-1 text-left flex flex-col justify-between ${
                    hasMatch
                      ? "border-[#0B0D10] bg-[#FAF8F4]"
                      : "border-[#E4E0D8] bg-[#FFFFFF]"
                  }`}
                >
                  <span className="text-[11px] font-bold text-[#5B6472]">{dayNum}</span>
                  {hasMatch && (
                    <span className="h-2 w-2 rounded-full bg-[#6B5CE6] self-end mb-1 mr-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

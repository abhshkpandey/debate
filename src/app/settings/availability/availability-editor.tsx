"use client";

import React, { useState, useTransition } from "react";
import {
  saveWeeklyAvailabilityAction,
  addAvailabilityExceptionAction,
} from "@/app/actions/scheduling";
import { WeeklyAvailability } from "@/types/database";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Check, AlertCircle } from "lucide-react";

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface AvailabilityEditorProps {
  initialWindows: WeeklyAvailability[];
  userTimezone: string;
}

export function AvailabilityEditor({
  initialWindows,
  userTimezone,
}: AvailabilityEditorProps) {
  // State for all 7 days
  const [windows, setWindows] = useState(() => {
    return DAYS_OF_WEEK.map((_, dayIndex) => {
      const existing = initialWindows.find((w) => w.day_of_week === dayIndex);
      return {
        day_of_week: dayIndex,
        start_time: existing?.start_time || "09:00",
        end_time: existing?.end_time || "17:00",
        is_enabled: existing ? existing.is_enabled : dayIndex >= 1 && dayIndex <= 5,
      };
    });
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // One-off exception state
  const [exceptionDate, setExceptionDate] = useState("");
  const [exceptionStart, setExceptionStart] = useState("09:00");
  const [exceptionEnd, setExceptionEnd] = useState("17:00");
  const [exceptionReason, setExceptionReason] = useState("");
  const [exceptionAdded, setExceptionAdded] = useState(false);

  const handleToggle = (dayIndex: number) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.day_of_week === dayIndex ? { ...w, is_enabled: !w.is_enabled } : w
      )
    );
  };

  const handleTimeChange = (
    dayIndex: number,
    field: "start_time" | "end_time",
    val: string
  ) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.day_of_week === dayIndex ? { ...w, [field]: val } : w
      )
    );
  };

  const handlePauseAll = () => {
    setWindows((prev) => prev.map((w) => ({ ...w, is_enabled: false })));
  };

  const handleEnableWeekdays = () => {
    setWindows((prev) =>
      prev.map((w) => ({
        ...w,
        is_enabled: w.day_of_week >= 1 && w.day_of_week <= 5,
      }))
    );
  };

  const handleSave = () => {
    setError(null);
    setSuccess(null);

    // Validate times
    for (const w of windows) {
      if (w.is_enabled && w.start_time >= w.end_time) {
        setError(
          `Start time must be earlier than end time for ${DAYS_OF_WEEK[w.day_of_week]}.`
        );
        return;
      }
    }

    startTransition(async () => {
      const res = await saveWeeklyAvailabilityAction(windows);
      if (res.success) {
        setSuccess("Weekly availability saved successfully.");
      } else {
        setError(res.error || "Failed to save availability.");
      }
    });
  };

  const handleAddException = () => {
    if (!exceptionDate) {
      setError("Please select a date for the unavailable exception.");
      return;
    }

    startTransition(async () => {
      const startIso = `${exceptionDate}T${exceptionStart}:00.000Z`;
      const endIso = `${exceptionDate}T${exceptionEnd}:00.000Z`;

      const res = await addAvailabilityExceptionAction(startIso, endIso, exceptionReason);
      if (res.success) {
        setExceptionAdded(true);
        setExceptionDate("");
        setExceptionReason("");
        setTimeout(() => setExceptionAdded(false), 2500);
      } else {
        setError(res.error || "Failed to record unavailable exception.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Weekly Availability Schedule</CardTitle>
              <CardDescription>
                Define recurring local hours in your timezone ({userTimezone}) when you are typically open for debates.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePauseAll}
                className="text-xs text-[#5B6472]"
              >
                Pause All
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleEnableWeekdays}
                className="text-xs text-[#0B0D10]"
              >
                Reset Weekdays
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-[#D93A47]/10 p-3 text-xs font-semibold text-[#D93A47] border border-[#D93A47]/20">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-lg bg-[#1F9D61]/10 p-3 text-xs font-semibold text-[#1F9D61] border border-[#1F9D61]/20">
              <Check className="h-4 w-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="divide-y divide-[#E4E0D8]">
            {windows.map((w) => (
              <div
                key={w.day_of_week}
                className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-3"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={`day-${w.day_of_week}`}
                    checked={w.is_enabled}
                    onChange={() => handleToggle(w.day_of_week)}
                    className="h-4 w-4 rounded border-[#E4E0D8] text-[#0B0D10] focus:ring-[#0B0D10]"
                  />
                  <label
                    htmlFor={`day-${w.day_of_week}`}
                    className="text-xs font-bold text-[#0B0D10] w-24 cursor-pointer"
                  >
                    {DAYS_OF_WEEK[w.day_of_week]}
                  </label>
                </div>

                {w.is_enabled ? (
                  <div className="flex items-center gap-2 text-xs">
                    <input
                      type="time"
                      value={w.start_time}
                      onChange={(e) =>
                        handleTimeChange(w.day_of_week, "start_time", e.target.value)
                      }
                      className="rounded border border-[#E4E0D8] bg-[#FAF8F4] px-2 py-1 text-xs text-[#0B0D10]"
                    />
                    <span className="text-[#5B6472]">to</span>
                    <input
                      type="time"
                      value={w.end_time}
                      onChange={(e) =>
                        handleTimeChange(w.day_of_week, "end_time", e.target.value)
                      }
                      className="rounded border border-[#E4E0D8] bg-[#FAF8F4] px-2 py-1 text-xs text-[#0B0D10]"
                    />
                  </div>
                ) : (
                  <span className="text-xs text-[#5B6472] italic">Unavailable</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>

        <CardFooter className="flex justify-end">
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={isPending}
            className="font-bold"
          >
            {isPending ? "Saving..." : "Save Availability Windows"}
          </Button>
        </CardFooter>
      </Card>

      {/* One-off Unavailable Exceptions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">One-off Unavailable Period</CardTitle>
          <CardDescription>
            Block out specific dates when you will be away or unavailable for debates without clearing your weekly schedule.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {exceptionAdded && (
            <div className="flex items-center gap-2 rounded-lg bg-[#1F9D61]/10 p-3 text-xs font-medium text-[#1F9D61] border border-[#1F9D61]/20">
              <Check className="h-4 w-4 shrink-0" />
              <span>Unavailable period exception recorded.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#0B0D10] mb-1">
                Date:
              </label>
              <input
                type="date"
                value={exceptionDate}
                onChange={(e) => setExceptionDate(e.target.value)}
                className="w-full rounded border border-[#E4E0D8] bg-[#FAF8F4] px-2 py-1.5 text-xs text-[#0B0D10]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#0B0D10] mb-1">
                From:
              </label>
              <input
                type="time"
                value={exceptionStart}
                onChange={(e) => setExceptionStart(e.target.value)}
                className="w-full rounded border border-[#E4E0D8] bg-[#FAF8F4] px-2 py-1.5 text-xs text-[#0B0D10]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#0B0D10] mb-1">
                To:
              </label>
              <input
                type="time"
                value={exceptionEnd}
                onChange={(e) => setExceptionEnd(e.target.value)}
                className="w-full rounded border border-[#E4E0D8] bg-[#FAF8F4] px-2 py-1.5 text-xs text-[#0B0D10]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0B0D10] mb-1">
              Reason (optional):
            </label>
            <input
              type="text"
              value={exceptionReason}
              onChange={(e) => setExceptionReason(e.target.value)}
              placeholder="e.g., Vacation, exam week, travel"
              className="w-full rounded border border-[#E4E0D8] bg-[#FAF8F4] px-2.5 py-1.5 text-xs text-[#0B0D10]"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddException}
              disabled={isPending || !exceptionDate}
            >
              Add Unavailable Exception
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

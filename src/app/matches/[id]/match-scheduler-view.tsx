"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  proposeSlotAction,
  acceptProposedSlotAction,
  cancelMatchAction,
} from "@/app/actions/scheduling";
import { formatLocalTime } from "@/lib/date/schedule";
import {
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
} from "@/lib/calendar/export";
import { Match, ChallengeSlot } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Countdown } from "@/components/ui/countdown";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Calendar as CalendarIcon,
  Clock,
  Check,
  Download,
  ExternalLink,
  AlertCircle,
  PlusCircle,
  Ban,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

interface MatchSchedulerViewProps {
  match: Match;
  slots: ChallengeSlot[];
  suggestedSlots: { isoStart: string; isoEnd: string }[];
  currentUserId: string;
  userTimezone: string;
  appUrl: string;
}

export function MatchSchedulerView({
  match,
  slots,
  suggestedSlots,
  currentUserId,
  userTimezone,
  appUrl,
}: MatchSchedulerViewProps) {
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const isCreator = currentUserId === match.creator_id;
  const opponent = isCreator ? match.opponent : match.creator;
  const isScheduled = match.status === "scheduled" && match.scheduled_slot_start;

  // Manual Proposal Handler
  const handleManualPropose = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!selectedDate || !selectedTime) {
      setError("Please choose both a date and time for the slot.");
      return;
    }

    startTransition(async () => {
      // Create local ISO and let UTC math handle it
      const localString = `${selectedDate}T${selectedTime}:00`;
      const startUtc = new Date(localString);
      const endUtc = new Date(startUtc.getTime() + 15 * 60 * 1000);

      const res = await proposeSlotAction(
        match.id,
        startUtc.toISOString(),
        endUtc.toISOString()
      );

      if (res.success) {
        setSuccessMsg("Proposal sent! Waiting for your opponent to confirm.");
        setSelectedDate("");
        setSelectedTime("");
        router.refresh();
      } else {
        setError(res.error || "Failed to propose slot.");
      }
    });
  };

  // Quick Suggestion Proposal Handler
  const handleProposeSuggested = (isoStart: string, isoEnd: string) => {
    setError(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const res = await proposeSlotAction(match.id, isoStart, isoEnd);
      if (res.success) {
        setSuccessMsg("Suggested slot proposed! Waiting for opponent to confirm.");
        router.refresh();
      } else {
        setError(res.error || "Failed to propose slot.");
      }
    });
  };

  // Accept Proposal Handler
  const handleAcceptSlot = (slotId: string) => {
    setError(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const res = await acceptProposedSlotAction(slotId);
      if (res.success) {
        setSuccessMsg("Match time confirmed! Calendar exports are now available.");
        router.refresh();
      } else {
        setError(res.error || "Failed to accept slot.");
      }
    });
  };

  // Cancel Match Handler
  const handleCancelMatch = () => {
    if (!cancelReason.trim()) {
      setError("Please provide a reason for cancelling.");
      return;
    }
    startTransition(async () => {
      const res = await cancelMatchAction(match.id, cancelReason);
      if (res.success) {
        setShowCancelDialog(false);
        router.refresh();
      } else {
        setError(res.error || "Failed to cancel match.");
      }
    });
  };

  // Calendar URLs
  const calendarEventDetails = isScheduled
    ? {
        matchId: match.id,
        title: match.challenge?.title || "Debate Match",
        description: match.challenge?.description || "",
        start: new Date(match.scheduled_slot_start!),
        end: new Date(match.scheduled_slot_end!),
        matchUrl: `${appUrl}/debate-room/${match.id}`,
        creatorName: match.creator?.display_name || "Creator",
        opponentName: match.opponent?.display_name || "Opponent",
      }
    : null;

  return (
    <div className="space-y-8">
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-[#D93A47]/10 p-4 text-xs font-semibold text-[#D93A47] border border-[#D93A47]/20">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-[#1F9D61]/10 p-4 text-xs font-semibold text-[#1F9D61] border border-[#1F9D61]/20">
          <Check className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* CONFIRMED & SCHEDULED STATE */}
      {isScheduled && calendarEventDetails && (
        <div className="rounded-xl border border-[#0B0D10] bg-[#FFFFFF] p-6 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E0D8] pb-6">
            <div>
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1F9D61]">
                <Check className="h-4 w-4" />
                Match Confirmed & Scheduled
              </span>
              <h2 className="text-2xl font-black text-[#0B0D10] mt-1">
                {formatLocalTime(
                  match.scheduled_slot_start!,
                  userTimezone,
                  "EEEE, MMMM d, yyyy 'at' h:mm a (zzz)"
                )}
              </h2>
              <p className="text-xs text-[#5B6472] mt-1">
                Viewer timezone: {userTimezone} • Opponent: {opponent?.display_name} ({opponent?.timezone})
              </p>
            </div>

            <Countdown
              targetDate={match.scheduled_slot_start!}
              label="Starts In"
            />
          </div>

          {/* Calendar Export Suite */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0B0D10] block">
              Export to Your Calendar (No Account Linking Required)
            </span>
            <div className="flex flex-wrap gap-3">
              <a
                href={`/api/matches/${match.id}/calendar.ics`}
                download
                className="inline-flex items-center justify-center rounded-md text-xs font-bold h-9 px-3.5 bg-[#F1EEE8] text-[#0B0D10] hover:bg-[#e4e0d8] border border-[#E4E0D8] transition-colors"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Download .ics
              </a>

              <a
                href={generateGoogleCalendarUrl(calendarEventDetails)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md text-xs font-bold h-9 px-3.5 bg-[#FFFFFF] text-[#0B0D10] hover:bg-[#FAF8F4] border border-[#E4E0D8] transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Google Calendar
              </a>

              <a
                href={generateOutlookCalendarUrl(calendarEventDetails)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md text-xs font-bold h-9 px-3.5 bg-[#FFFFFF] text-[#0B0D10] hover:bg-[#FAF8F4] border border-[#E4E0D8] transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Outlook Live
              </a>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E4E0D8] flex flex-wrap items-center justify-between gap-4">
            <Link href={`/debate-room/${match.id}`}>
              <Button variant="primary" className="font-bold gap-2">
                Enter Debate Arena <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCancelDialog(true)}
              className="text-[#D93A47] hover:bg-[#D93A47]/10"
            >
              Cancel Match
            </Button>
          </div>
        </div>
      )}

      {/* PENDING TIME / PROPOSALS STATE */}
      {match.status === "pending_time" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Proposals & Mutual Suggestions (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active Proposals List */}
            <div className="rounded-xl border border-[#E4E0D8] bg-[#FFFFFF] p-6 shadow-sm">
              <h3 className="font-bold text-base text-[#0B0D10] flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#6B5CE6]" />
                Active Slot Proposals
              </h3>
              <p className="text-xs text-[#5B6472] mt-1">
                Both debaters must confirm a slot. Accepting a proposal immediately books the match.
              </p>

              <div className="mt-4 space-y-3">
                {slots.filter((s) => s.status === "proposed").length > 0 ? (
                  slots
                    .filter((s) => s.status === "proposed")
                    .map((slot) => {
                      const isMyProposal = slot.proposed_by === currentUserId;
                      return (
                        <div
                          key={slot.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-[#E4E0D8] bg-[#FAF8F4]"
                        >
                          <div>
                            <span className="font-bold text-sm text-[#0B0D10] block">
                              {formatLocalTime(
                                slot.slot_start,
                                userTimezone,
                                "EEE, MMM d, yyyy 'at' h:mm a (zzz)"
                              )}
                            </span>
                            <span className="text-[11px] text-[#5B6472]">
                              {isMyProposal
                                ? "Proposed by you (waiting for opponent)"
                                : `Proposed by @${opponent?.username}`}
                            </span>
                          </div>

                          {!isMyProposal && (
                            <Button
                              size="sm"
                              variant="primary"
                              disabled={isPending}
                              onClick={() => handleAcceptSlot(slot.id)}
                              className="font-bold shrink-0 cursor-pointer"
                            >
                              Confirm This Time
                            </Button>
                          )}
                        </div>
                      );
                    })
                ) : (
                  <p className="text-xs text-[#5B6472] italic py-2">
                    No active slot proposals yet. Choose a suggested slot or propose a manual time below.
                  </p>
                )}
              </div>
            </div>

            {/* Smart Suggested Slots (Calculated from Weekly Windows) */}
            <div className="rounded-xl border border-[#E4E0D8] bg-[#FFFFFF] p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#C7F36B] fill-[#0B0D10]" />
                <h3 className="font-bold text-base text-[#0B0D10]">
                  Suggested Overlapping Slots
                </h3>
              </div>
              <p className="text-xs text-[#5B6472] mt-1">
                Calculated from both users&apos; weekly availability windows in local time zones.
              </p>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {suggestedSlots.length > 0 ? (
                  suggestedSlots.map((slot, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={isPending}
                      onClick={() => handleProposeSuggested(slot.isoStart, slot.isoEnd)}
                      className="flex items-center justify-between p-3 rounded-lg border border-[#E4E0D8] bg-[#FAF8F4] hover:border-[#0B0D10] hover:bg-[#F1EEE8] text-left transition-colors cursor-pointer"
                    >
                      <div>
                        <span className="text-xs font-bold text-[#0B0D10] block">
                          {formatLocalTime(
                            slot.isoStart,
                            userTimezone,
                            "EEE, MMM d • h:mm a"
                          )}
                        </span>
                        <span className="text-[10px] text-[#5B6472]">15 min debate</span>
                      </div>
                      <PlusCircle className="h-4 w-4 text-[#5B6472]" />
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-[#5B6472] col-span-2 italic py-2">
                    No automatic overlapping windows found. You can always propose any custom time using the manual picker.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Manual Slot Proposer Sidebar (Right col) */}
          <div className="space-y-6">
            <div className="rounded-xl border border-[#E4E0D8] bg-[#FFFFFF] p-6 shadow-sm">
              <h3 className="font-bold text-base text-[#0B0D10] flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Propose Any Time
              </h3>
              <p className="text-xs text-[#5B6472] mt-1">
                Propose a custom slot in your local time ({userTimezone}).
              </p>

              <form onSubmit={handleManualPropose} className="mt-4 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#0B0D10]">
                    Match Date
                  </label>
                  <input
                    type="date"
                    required
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-md border border-[#E4E0D8] bg-[#FAF8F4] px-3 py-2 text-xs text-[#0B0D10] focus:outline-none focus:ring-2 focus:ring-[#0B0D10]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#0B0D10]">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full rounded-md border border-[#E4E0D8] bg-[#FAF8F4] px-3 py-2 text-xs text-[#0B0D10] focus:outline-none focus:ring-2 focus:ring-[#0B0D10]"
                  />
                  <span className="text-[10px] text-[#5B6472]">
                    Minimum 1 hour notice required.
                  </span>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={isPending}
                  className="w-full font-bold cursor-pointer"
                >
                  {isPending ? "Submitting..." : "Propose Time Slot"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* CANCELLED STATE */}
      {match.status === "cancelled" && (
        <div className="rounded-xl border border-[#D93A47]/20 bg-[#D93A47]/5 p-6 text-center space-y-2">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#D93A47]/10 text-[#D93A47]">
            <Ban className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-base text-[#0B0D10]">Match Cancelled</h3>
          <p className="text-xs text-[#5B6472] max-w-md mx-auto">
            Reason: {match.cancellation_reason || "Cancelled by participant."}
          </p>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showCancelDialog}
        title="Cancel this scheduled match?"
        description="Cancelling will invalidate all calendar reminders and record a voluntary cancellation in platform logs. Please state your reason:"
        confirmText="Confirm Cancellation"
        variant="danger"
        isLoading={isPending}
        onConfirm={handleCancelMatch}
        onCancel={() => setShowCancelDialog(false)}
      >
        <textarea
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="State your reason for cancellation..."
          rows={3}
          className="w-full rounded-md border border-[#E4E0D8] bg-[#FAF8F4] p-2.5 text-xs text-[#0B0D10] focus:outline-none focus:ring-2 focus:ring-[#0B0D10]"
        />
      </ConfirmDialog>
    </div>
  );
}

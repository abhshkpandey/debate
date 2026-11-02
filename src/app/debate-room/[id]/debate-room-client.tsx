"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  checkInAction,
  postDebateMessageAction,
  advanceDebateRoundAction,
  castVoteAction,
} from "@/app/actions/debate";
import { formatLocalTime } from "@/lib/date/schedule";
import {
  Match,
  DebateRound,
  DebateMessage,
  Vote,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import { Countdown } from "@/components/ui/countdown";
import {
  Send,
  CheckCircle2,
  AlertCircle,
  Vote as VoteIcon,
  RotateCcw,
  HelpCircle,
  Flag,
} from "lucide-react";
import Link from "next/link";
import { ReportDialog } from "@/components/safety/report-dialog";

interface DebateRoomClientProps {
  match: Match;
  rounds: DebateRound[];
  messages: DebateMessage[];
  votes: Vote[];
  currentUserId?: string;
  userTimezone: string;
}

export function DebateRoomClient({
  match,
  rounds,
  messages,
  votes,
  currentUserId,
  userTimezone,
}: DebateRoomClientProps) {
  const [inputContent, setInputContent] = useState("");
  const [rationale, setRationale] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Polling for live updates during active or scheduled match
  useEffect(() => {
    if (match.status === "in_progress" || match.status === "scheduled") {
      const interval = setInterval(() => {
        router.refresh();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [match.status, router]);

  const isCreator = currentUserId === match.creator_id;
  const isOpponent = currentUserId === match.opponent_id;
  const isParticipant = isCreator || isOpponent;

  const myCheckedIn = isCreator
    ? !!match.creator_checked_in_at
    : isOpponent
    ? !!match.opponent_checked_in_at
    : false;

  const activeRound = rounds.find((r) => r.status === "active");
  const maxChars = activeRound?.max_chars || 500;
  const charsLeft = maxChars - inputContent.length;

  // Check-In Handler
  const handleCheckIn = () => {
    setError(null);
    startTransition(async () => {
      const res = await checkInAction(match.id);
      if (res.success) {
        setSuccessMsg(
          res.matchStarted
            ? "Both debaters present! Round 1 is active!"
            : "You have checked in! Waiting for opponent to check in."
        );
        router.refresh();
      } else {
        setError(res.error || "Failed to check in.");
      }
    });
  };

  // Submit Message Handler
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputContent.trim()) return;

    setError(null);
    startTransition(async () => {
      const res = await postDebateMessageAction(match.id, inputContent);
      if (res.success) {
        setInputContent("");
        router.refresh();
      } else {
        setError(res.error || "Failed to send message.");
      }
    });
  };

  // Advance Round Handler (Server timer expired or manual trigger)
  const handleAdvanceRound = () => {
    startTransition(async () => {
      await advanceDebateRoundAction(match.id);
      router.refresh();
    });
  };

  // Cast Vote Handler
  const handleVote = (side: "creator" | "opponent" | "tie") => {
    setError(null);
    startTransition(async () => {
      const res = await castVoteAction(match.id, side, rationale);
      if (res.success) {
        setSuccessMsg("Your vote has been counted in the crowd verdict!");
        setRationale("");
        router.refresh();
      } else {
        setError(res.error || "Failed to cast vote.");
      }
    });
  };

  // Vote tally calculations
  const totalVotes = votes.length;
  const creatorVotes = votes.filter((v) => v.voted_for_side === "creator").length;
  const opponentVotes = votes.filter((v) => v.voted_for_side === "opponent").length;
  const tieVotes = votes.filter((v) => v.voted_for_side === "tie").length;

  const creatorPct = totalVotes > 0 ? Math.round((creatorVotes / totalVotes) * 100) : 0;
  const opponentPct = totalVotes > 0 ? Math.round((opponentVotes / totalVotes) * 100) : 0;
  const tiePct = totalVotes > 0 ? Math.round((tieVotes / totalVotes) * 100) : 0;

  const hasVoted = currentUserId
    ? votes.some((v) => v.voter_id === currentUserId)
    : false;

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-[#D93A47]/10 p-4 text-xs font-semibold text-[#D93A47] border border-[#D93A47]/20">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-[#1F9D61]/10 p-4 text-xs font-semibold text-[#1F9D61] border border-[#1F9D61]/20">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 1. WAITING ROOM / CHECK-IN STATE */}
      {match.status === "scheduled" && (
        <div className="rounded-xl border border-[#0B0D10] bg-[#FFFFFF] p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E0D8] pb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#6B5CE6]">
                Debate Waiting Room
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[#0B0D10] mt-1">
                Scheduled Start:{" "}
                {formatLocalTime(
                  match.scheduled_slot_start!,
                  userTimezone,
                  "h:mm a (zzz)"
                )}
              </h2>
              <p className="text-xs text-[#5B6472] mt-1">
                Both participants must check in to initiate Round 1.
              </p>
            </div>

            <Countdown
              targetDate={match.scheduled_slot_start!}
              label="Match Countdown"
            />
          </div>

          {/* Participant Check-In Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-[#E4E0D8] bg-[#FAF8F4] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#0B0D10]">
                  {match.creator?.display_name} (Side A)
                </span>
                <p className="text-[11px] text-[#5B6472]">
                  {match.creator_checked_in_at ? "Checked in" : "Awaiting check-in"}
                </p>
              </div>
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  match.creator_checked_in_at
                    ? "bg-[#1F9D61] text-white"
                    : "bg-[#E4E0D8] text-[#5B6472]"
                }`}
              >
                {match.creator_checked_in_at ? "✓" : "•"}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-[#E4E0D8] bg-[#FAF8F4] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#0B0D10]">
                  {match.opponent?.display_name} (Side B)
                </span>
                <p className="text-[11px] text-[#5B6472]">
                  {match.opponent_checked_in_at ? "Checked in" : "Awaiting check-in"}
                </p>
              </div>
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  match.opponent_checked_in_at
                    ? "bg-[#1F9D61] text-white"
                    : "bg-[#E4E0D8] text-[#5B6472]"
                }`}
              >
                {match.opponent_checked_in_at ? "✓" : "•"}
              </span>
            </div>
          </div>

          {/* Check-In Action Button */}
          {isParticipant && (
            <div className="flex justify-center pt-2">
              <Button
                variant={myCheckedIn ? "secondary" : "primary"}
                size="lg"
                disabled={myCheckedIn || isPending}
                onClick={handleCheckIn}
                className="font-bold cursor-pointer"
              >
                {myCheckedIn ? "✓ You Are Checked In" : "Check In to Debate Arena"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 2. LIVE DEBATE ARENA (IN PROGRESS) */}
      {match.status === "in_progress" && (
        <div className="rounded-xl border border-[#0B0D10] bg-[#FFFFFF] shadow-md overflow-hidden">
          {/* Active Round Banner */}
          {activeRound ? (
            <div className="bg-[#0B0D10] text-[#FFFFFF] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#C7F36B]">
                  Round {activeRound.round_number} of {rounds.length}
                </span>
                <h3 className="text-lg font-black uppercase tracking-tight">
                  {activeRound.round_type.replace("_", " ")} Statement
                </h3>
                <p className="text-xs text-[#E4E0D8]">
                  Max length: {activeRound.max_chars} characters
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Countdown
                  targetDate={activeRound.ends_at}
                  label="Round Ends In"
                  onComplete={handleAdvanceRound}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAdvanceRound}
                  className="text-xs bg-transparent text-white border-white/30 hover:bg-white/10"
                >
                  Next Round ➔
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-[#0B0D10] text-white p-4 text-center">
              <p className="text-sm font-bold">Synchronizing Round Transitions...</p>
            </div>
          )}

          {/* Argument Messages Feed */}
          <div className="p-6 min-h-[320px] max-h-[500px] overflow-y-auto space-y-4 bg-[#FAF8F4]">
            {messages.length > 0 ? (
              messages.map((msg) => {
                const isMsgCreator = msg.sender_id === match.creator_id;
                const sideLabel = isMsgCreator ? "Side A" : "Side B";
                return (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-xl border max-w-xl ${
                      isMsgCreator
                        ? "bg-[#FFFFFF] border-[#E4E0D8] mr-auto"
                        : "bg-[#F1EEE8] border-[#E4E0D8] ml-auto"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-[#E4E0D8]/60 pb-1.5 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-[#0B0D10]">
                          {msg.sender?.display_name || "Debater"} ({sideLabel})
                        </span>
                        {currentUserId && msg.sender_id !== currentUserId && (
                          <ReportDialog
                            targetType="message"
                            targetId={msg.id}
                            targetLabel="Argument"
                            triggerButton={
                              <button
                                type="button"
                                className="text-[#5B6472]/60 hover:text-[#D93A47] p-0.5 rounded cursor-pointer transition-colors"
                                title="Report this message"
                                aria-label="Report message"
                              >
                                <Flag className="h-2.5 w-2.5" />
                              </button>
                            }
                          />
                        )}
                      </div>
                      <span className="text-[10px] text-[#5B6472]">
                        {new Date(msg.submitted_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-[#0B0D10] whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-16 text-xs text-[#5B6472]">
                Round is open. Debaters may enter their arguments below.
              </div>
            )}
          </div>

          {/* Participant Input Bar */}
          {isParticipant ? (
            <form
              onSubmit={handleSendMessage}
              className="border-t border-[#E4E0D8] p-4 bg-[#FFFFFF]"
            >
              <div className="flex items-center justify-between mb-1.5 text-xs">
                <span className="font-semibold text-[#0B0D10] flex items-center gap-2">
                  Your Argument
                  <span className="hidden sm:inline text-[10px] text-[#5B6472] font-normal">
                    (Ctrl + Enter to send)
                  </span>
                </span>
                <span
                  className={
                    charsLeft < 0
                      ? "text-[#D93A47] font-bold"
                      : charsLeft < 25
                      ? "text-[#D93A47] font-semibold"
                      : "text-[#5B6472]"
                  }
                >
                  {charsLeft} chars remaining
                </span>
              </div>
              <div className="flex gap-2">
                <textarea
                  rows={2}
                  value={inputContent}
                  onChange={(e) => setInputContent(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                      e.preventDefault();
                      if (inputContent.trim() && charsLeft >= 0 && !isPending) {
                        handleSendMessage(e);
                      }
                    }
                  }}
                  placeholder="Type your rebuttal or statement here... (Ctrl+Enter to send)"
                  maxLength={maxChars}
                  className="flex-1 rounded-md border border-[#E4E0D8] bg-[#FAF8F4] p-2.5 text-sm text-[#0B0D10] focus:outline-none focus:ring-2 focus:ring-[#0B0D10]"
                />
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isPending || !inputContent.trim() || charsLeft < 0}
                  className="font-bold shrink-0 self-end h-10 px-4"
                  title="Submit argument (Ctrl+Enter)"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          ) : (
            <div className="border-t border-[#E4E0D8] p-4 bg-[#FFFFFF] text-center text-xs text-[#5B6472]">
              You are watching as an audience member. Audience voting unlocks immediately when the final round concludes.
            </div>
          )}
        </div>
      )}

      {/* 3. COMPLETED DEBATE & TRANSCRIPT & VOTING (AUDIENCE VOTING V1) */}
      {match.status === "completed" && (
        <div className="space-y-8">
          {/* Verdict Banner */}
          <div className="rounded-xl border border-[#0B0D10] bg-[#FAF8F4] p-6 text-center space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1F9D61]">
              Debate Completed
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0B0D10]">
              The Internet Decides: Crowd Verdict
            </h2>

            {/* Crowd Voting Percentage Breakdown */}
            <div className="max-w-xl mx-auto space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span>{match.creator?.display_name} ({creatorPct}%)</span>
                <span>Tie ({tiePct}%)</span>
                <span>{match.opponent?.display_name} ({opponentPct}%)</span>
              </div>

              {/* Progress bar */}
              <div className="h-4 w-full rounded-full bg-[#E4E0D8] overflow-hidden flex">
                <div
                  style={{ width: `${creatorPct}%` }}
                  className="bg-[#C7F36B] transition-all duration-500"
                  title="Side A"
                />
                <div
                  style={{ width: `${tiePct}%` }}
                  className="bg-[#5B6472] transition-all duration-500"
                  title="Tie"
                />
                <div
                  style={{ width: `${opponentPct}%` }}
                  className="bg-[#6B5CE6] transition-all duration-500"
                  title="Side B"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#5B6472]">
                <span>Total crowd votes cast: {totalVotes}</span>
                <span className="flex items-center gap-1">
                  <HelpCircle className="h-3.5 w-3.5" />
                  Crowd verdict, not factual truth
                </span>
              </div>
            </div>

            {/* Challenge Again Button */}
            <div className="pt-2">
              <Link href={`/challenges/new`}>
                <Button variant="outline" size="sm" className="gap-2 font-bold">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Challenge Again with New Topic
                </Button>
              </Link>
            </div>
          </div>

          {/* Audience Voting Box */}
          <div className="rounded-xl border border-[#E4E0D8] bg-[#FFFFFF] p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-[#0B0D10] flex items-center gap-2">
              <VoteIcon className="h-5 w-5 text-[#6B5CE6]" />
              Cast Your Verified Crowd Vote
            </h3>

            {isParticipant ? (
              <p className="text-xs text-[#5B6472] italic bg-[#FAF8F4] p-3 rounded-lg border border-[#E4E0D8]">
                Participants cannot vote in their own debate. Audience voting is reserved for impartial community members.
              </p>
            ) : hasVoted ? (
              <p className="text-xs font-semibold text-[#1F9D61] bg-[#1F9D61]/10 p-3 rounded-lg border border-[#1F9D61]/20">
                ✓ You have cast your vote for this debate. Thank you for participating in the verdict!
              </p>
            ) : currentUserId ? (
              <div className="space-y-4">
                <p className="text-xs text-[#5B6472]">
                  Who presented the more convincing argument and evidence? (One vote per account).
                </p>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#0B0D10]">
                    Voting Rationale (optional):
                  </label>
                  <input
                    type="text"
                    value={rationale}
                    onChange={(e) => setRationale(e.target.value)}
                    placeholder="Briefly explain your reasoning..."
                    maxLength={200}
                    className="w-full rounded-md border border-[#E4E0D8] bg-[#FAF8F4] p-2 text-xs text-[#0B0D10] focus:outline-none focus:ring-2 focus:ring-[#0B0D10]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Button
                    variant="primary"
                    disabled={isPending}
                    onClick={() => handleVote("creator")}
                    className="font-bold text-xs"
                  >
                    Vote for {match.creator?.display_name}
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={isPending}
                    onClick={() => handleVote("tie")}
                    className="font-bold text-xs"
                  >
                    Vote Tie / Draw
                  </Button>
                  <Button
                    variant="primary"
                    disabled={isPending}
                    onClick={() => handleVote("opponent")}
                    className="font-bold text-xs"
                  >
                    Vote for {match.opponent?.display_name}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 space-y-2">
                <p className="text-xs text-[#5B6472]">
                  Sign in with an account to cast your verified vote.
                </p>
                <Link href={`/login?next=/debate-room/${match.id}`}>
                  <Button variant="outline" size="sm">
                    Log in to Vote
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Full Permanent Transcript View */}
          <div className="rounded-xl border border-[#E4E0D8] bg-[#FFFFFF] p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-[#0B0D10]">Full Debate Transcript</h3>
            <div className="space-y-4 divide-y divide-[#E4E0D8]">
              {messages.map((msg) => {
                const isMsgCreator = msg.sender_id === match.creator_id;
                const sideLabel = isMsgCreator ? "Side A" : "Side B";
                return (
                  <div key={msg.id} className="pt-4 first:pt-0 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-[#0B0D10]">
                      <div className="flex items-center gap-1.5">
                        <span>
                          {msg.sender?.display_name} ({sideLabel})
                        </span>
                        {currentUserId && msg.sender_id !== currentUserId && (
                          <ReportDialog
                            targetType="message"
                            targetId={msg.id}
                            targetLabel="Transcript Statement"
                            triggerButton={
                              <button
                                type="button"
                                className="text-[#5B6472]/60 hover:text-[#D93A47] p-0.5 rounded cursor-pointer transition-colors"
                                title="Report this argument message"
                                aria-label="Report argument message"
                              >
                                <Flag className="h-2.5 w-2.5" />
                              </button>
                            }
                          />
                        )}
                      </div>
                      <span className="text-[10px] text-[#5B6472] font-normal">
                        {new Date(msg.submitted_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-[#0B0D10] whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

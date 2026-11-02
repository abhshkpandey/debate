import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="border-b border-[#E4E0D8] pb-8">
        <span className="text-xs font-bold uppercase tracking-wider text-[#6B5CE6]">
          Rules & Format
        </span>
        <h1 className="mt-2 text-3xl sm:text-4xl font-black text-[#0B0D10] tracking-tight">
          How Debate Works
        </h1>
        <p className="mt-3 text-base text-[#5B6472] leading-relaxed">
          Structured, time-capped, turn-based arguments where the audience decides the verdict. No noise, no endless circular threads.
        </p>
      </div>

      <div className="mt-10 space-y-12">
        {/* Step 1 */}
        <section className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0B0D10] font-mono text-base font-bold text-[#C7F36B]">
            1
          </div>
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#0B0D10]">Create or Accept a Challenge</h2>
            <p className="text-sm text-[#5B6472] leading-relaxed">
              Every challenge has two distinct positions: Side A and Side B. The creator defines the proposition, chooses their side, and selects the debate format:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="rounded-xl border border-[#E4E0D8] bg-[#FFFFFF] p-4">
                <div className="flex items-center gap-2 font-bold text-sm text-[#0B0D10]">
                  <Clock className="h-4 w-4 text-[#C7F36B]" />
                  <span>Quick Clash (~2 minutes)</span>
                </div>
                <p className="mt-1.5 text-xs text-[#5B6472] leading-relaxed">
                  2 rapid rounds: Opening statement (60s, max 500 chars) followed by Closing verdict (60s, max 500 chars). Fast, punchy, high-stakes.
                </p>
              </div>
              <div className="rounded-xl border border-[#E4E0D8] bg-[#FFFFFF] p-4">
                <div className="flex items-center gap-2 font-bold text-sm text-[#0B0D10]">
                  <Clock className="h-4 w-4 text-[#6B5CE6]" />
                  <span>Standard Debate (~10 minutes)</span>
                </div>
                <p className="mt-1.5 text-xs text-[#5B6472] leading-relaxed">
                  3 rounds: Opening (60s, 500 chars), Rebuttal & Cross (60s, 500 chars), and Closing (30s, 300 chars).
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Step 2 */}
        <section className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0B0D10] font-mono text-base font-bold text-[#C7F36B]">
            2
          </div>
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#0B0D10]">Agree on a Match Time</h2>
            <p className="text-sm text-[#5B6472] leading-relaxed">
              Debates take place synchronously. Either participant can propose time slots based on their weekly availability windows. Both debaters must confirm a slot for the match to become <strong className="text-[#0B0D10]">scheduled</strong>.
            </p>
            <p className="text-xs text-[#5B6472]">
              Timestamps are stored in UTC and seamlessly rendered in your local IANA time zone. Calendar invitations (.ics files, Google Calendar links, Outlook web links) are provided immediately.
            </p>
          </div>
        </section>

        {/* Step 3 */}
        <section className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0B0D10] font-mono text-base font-bold text-[#C7F36B]">
            3
          </div>
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#0B0D10]">Check-In and Argue in Real-Time</h2>
            <p className="text-sm text-[#5B6472] leading-relaxed">
              Check-in opens 5 minutes before the scheduled match. Both debaters must check in. If a debater fails to show within the grace period, a confirmed <strong className="text-[#D93A47]">no-show</strong> is recorded.
            </p>
            <p className="text-sm text-[#5B6472] leading-relaxed">
              Once both are present, the debate room opens. The server strictly drives round timers and character limits. Reconnecting loses nothing—every message is saved.
            </p>
          </div>
        </section>

        {/* Step 4 */}
        <section className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0B0D10] font-mono text-base font-bold text-[#C7F36B]">
            4
          </div>
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#0B0D10]">The Crowd Verdict</h2>
            <p className="text-sm text-[#5B6472] leading-relaxed">
              Once the final round concludes, audience voting opens. Any verified user who is not a participant in the match can cast one vote with an optional rationale. Votes represent the collective crowd verdict on which side presented the more persuasive argument.
            </p>
          </div>
        </section>
      </div>

      <div className="mt-12 rounded-xl border border-[#E4E0D8] bg-[#F1EEE8] p-6 text-center">
        <h3 className="text-lg font-bold text-[#0B0D10]">Ready to test your arguments?</h3>
        <p className="mt-1 text-sm text-[#5B6472]">
          Browse open challenges or create your own topic right now.
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Link href="/explore">
            <Button variant="outline">Browse Challenges</Button>
          </Link>
          <Link href="/challenges/new">
            <Button variant="primary">Start a Challenge</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

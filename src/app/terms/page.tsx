import React from "react";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 mb-6">
        <span className="font-bold text-xs uppercase tracking-wider text-amber-800">
          Notice: Requires Legal Review
        </span>
        <p className="text-xs text-amber-700 mt-1">
          This document is an operational policy draft prepared for development and requires formal attorney review prior to commercial production deployment.
        </p>
      </div>

      <div className="border-b border-[#E4E0D8] pb-6">
        <h1 className="text-3xl font-black text-[#0B0D10] tracking-tight">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-[#5B6472]">
          Effective Date: October 2026
        </p>
      </div>

      <div className="mt-8 space-y-6 text-sm text-[#5B6472] leading-relaxed">
        <section>
          <h2 className="text-base font-bold text-[#0B0D10] mb-2">1. Eligibility (Age 18+)</h2>
          <p>
            You must be at least 18 years of age to register an account or use Debate. By creating an account, you represent and warrant that you have the legal capacity to form a binding contract.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#0B0D10] mb-2">2. Content & Debate Submissions</h2>
          <p>
            You retain ownership of the arguments and statements you submit. By participating in public debates, you grant Debate a non-exclusive license to display, archive, and facilitate audience voting on your debate transcripts.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#0B0D10] mb-2">3. Moderation and Termination</h2>
          <p>
            We reserve the right to investigate reports, remove content, warn users, or suspend accounts that violate our Community Guidelines or compromise platform safety.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#0B0D10] mb-2">4. Disclaimers</h2>
          <p>
            Audience votes represent subjective crowd verdicts and do not constitute factual determinations or endorsements by Debate.
          </p>
        </section>
      </div>
    </div>
  );
}

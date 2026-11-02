import React from "react";
import { Shield, AlertTriangle, CheckCircle, Flag } from "lucide-react";

export default function GuidelinesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="border-b border-[#E4E0D8] pb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-[#6B5CE6]">
          Safety & Ethics
        </span>
        <h1 className="mt-2 text-3xl font-black text-[#0B0D10] tracking-tight">
          Community Guidelines
        </h1>
        <p className="mt-2 text-sm text-[#5B6472]">
          Debate is built for rigorous intellectual sparring, not personal destruction.
        </p>
      </div>

      <div className="mt-8 space-y-8 text-sm text-[#0B0D10] leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2 text-[#0B0D10]">
            <CheckCircle className="h-5 w-5 text-[#1F9D61]" />
            1. Argue the Proposition, Not the Person
          </h2>
          <p className="text-[#5B6472]">
            Strong disagreement is welcome. Ad hominem attacks, doxxing, harassment, threats, or intimidation are strictly forbidden. Critique logic, evidence, and premises, not the character or personal traits of your opponent.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2 text-[#0B0D10]">
            <AlertTriangle className="h-5 w-5 text-[#D93A47]" />
            2. Zero Tolerance for Hate Speech & Unlawful Content
          </h2>
          <p className="text-[#5B6472]">
            We prohibit dehumanizing speech, incitement to violence, non-consensual imagery, malware/phishing links, and content that promotes discrimination against protected characteristics. Violators face immediate suspension and content deletion.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2 text-[#0B0D10]">
            <Flag className="h-5 w-5 text-[#6B5CE6]" />
            3. Reporting and Blocking
          </h2>
          <p className="text-[#5B6472]">
            Every user, challenge, message, and match has a built-in report button. Reports are reviewed by human moderators. If you do not wish to interact with another user, you can block them instantly; blocked users cannot view or challenge your matches.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2 text-[#0B0D10]">
            <Shield className="h-5 w-5 text-[#0B0D10]" />
            4. Fair Play & Attendance
          </h2>
          <p className="text-[#5B6472]">
            Respect your opponent’s time. If you confirm a scheduled match, you are expected to check in promptly. Repeated unexcused no-shows will trigger account restrictions.
          </p>
        </section>
      </div>
    </div>
  );
}

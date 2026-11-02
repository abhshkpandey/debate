import React from "react";

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-[#5B6472]">
          Effective Date: October 2026
        </p>
      </div>

      <div className="mt-8 space-y-6 text-sm text-[#5B6472] leading-relaxed">
        <section>
          <h2 className="text-base font-bold text-[#0B0D10] mb-2">1. Information We Collect</h2>
          <p>
            We collect information you provide directly to us: username, email address, display name, optional biography, and your configured IANA time zone (used strictly for match coordination).
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#0B0D10] mb-2">2. How Your Information Is Used</h2>
          <p>
            Your profile details and public debate transcripts are visible to users. Your email address is never shared publicly and is used only for essential transactional notifications (reminders, password resets) when enabled.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#0B0D10] mb-2">3. Data Retention & Account Deletion</h2>
          <p>
            You may request an export of your personal data or permanent deletion of your account from your Account Settings.
          </p>
        </section>
      </div>
    </div>
  );
}

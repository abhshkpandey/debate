import React from "react";
import { requireAuth } from "@/lib/auth/session";
import { ChallengeCreateWizard } from "./challenge-create-wizard";

export default async function NewChallengePage() {
  await requireAuth("/challenges/new");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="border-b border-[#E4E0D8] pb-6 mb-8">
        <h1 className="text-3xl font-black text-[#0B0D10] tracking-tight">
          Start a Challenge
        </h1>
        <p className="mt-1 text-sm text-[#5B6472]">
          Define your topic, choose your side, and invite an opponent or open it to the public.
        </p>
      </div>

      <ChallengeCreateWizard />
    </div>
  );
}

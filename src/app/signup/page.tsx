"use client";

import React, { useActionState, useState } from "react";
import Link from "next/link";
import { signUpAction, type ActionState } from "@/app/actions/auth";
import { COMMON_TIMEZONES } from "@/lib/date/timezone";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    signUpAction,
    {}
  );

  const [detectedTz] = useState<string>(() => {
    try {
      if (typeof window !== "undefined") {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      }
    } catch {
      // fallback
    }
    return "UTC";
  });

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-[#0B0D10] text-[#C7F36B] font-mono font-bold text-lg mb-2">
            D
          </div>
          <CardTitle className="text-2xl">Create Your Debate Account</CardTitle>
          <CardDescription>
            Join to challenge opponents, defend positions, and let the audience vote.
          </CardDescription>
        </CardHeader>

        <form action={formAction}>
          <CardContent className="space-y-4">
            {state?.error && (
              <div className="flex items-center gap-2 rounded-lg bg-[#D93A47]/10 p-3 text-xs font-medium text-[#D93A47] border border-[#D93A47]/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{state.error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="username"
                  className="text-xs font-bold uppercase tracking-wider text-[#0B0D10]"
                >
                  Username *
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  placeholder="e.g. sokrates_99"
                  className="w-full rounded-md border border-[#E4E0D8] bg-[#FAF8F4] px-3.5 py-2.5 text-sm text-[#0B0D10] placeholder:text-[#5B6472]/60 focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#0B0D10]"
                />
                {state?.fieldErrors?.username && (
                  <p className="text-[11px] text-[#D93A47] font-medium">
                    {state.fieldErrors.username}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="display_name"
                  className="text-xs font-bold uppercase tracking-wider text-[#0B0D10]"
                >
                  Display Name *
                </label>
                <input
                  id="display_name"
                  name="display_name"
                  type="text"
                  required
                  placeholder="e.g. S. Plato"
                  className="w-full rounded-md border border-[#E4E0D8] bg-[#FAF8F4] px-3.5 py-2.5 text-sm text-[#0B0D10] placeholder:text-[#5B6472]/60 focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#0B0D10]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-xs font-bold uppercase tracking-wider text-[#0B0D10]"
              >
                Email Address *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@domain.com"
                className="w-full rounded-md border border-[#E4E0D8] bg-[#FAF8F4] px-3.5 py-2.5 text-sm text-[#0B0D10] placeholder:text-[#5B6472]/60 focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#0B0D10]"
              />
              {state?.fieldErrors?.email && (
                <p className="text-[11px] text-[#D93A47] font-medium">
                  {state.fieldErrors.email}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-xs font-bold uppercase tracking-wider text-[#0B0D10]"
              >
                Password * (min 8 chars)
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="w-full rounded-md border border-[#E4E0D8] bg-[#FAF8F4] px-3.5 py-2.5 text-sm text-[#0B0D10] placeholder:text-[#5B6472]/60 focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#0B0D10]"
              />
              {state?.fieldErrors?.password && (
                <p className="text-[11px] text-[#D93A47] font-medium">
                  {state.fieldErrors.password}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="timezone"
                className="text-xs font-bold uppercase tracking-wider text-[#0B0D10]"
              >
                Your Timezone (IANA) *
              </label>
              <select
                id="timezone"
                name="timezone"
                defaultValue={detectedTz}
                className="w-full rounded-md border border-[#E4E0D8] bg-[#FAF8F4] px-3.5 py-2.5 text-sm text-[#0B0D10] focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#0B0D10]"
              >
                {!COMMON_TIMEZONES.includes(detectedTz) && (
                  <option value={detectedTz}>{detectedTz} (Detected)</option>
                )}
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-[#5B6472]">
                Used to suggest debate slots that fit your real availability.
              </p>
            </div>

            {/* Age 18+ requirement */}
            <div className="pt-2 border-t border-[#E4E0D8] space-y-3">
              <label className="flex items-start gap-2.5 text-xs text-[#0B0D10] cursor-pointer">
                <input
                  type="checkbox"
                  name="age_verified"
                  required
                  className="mt-0.5 h-4 w-4 rounded border-[#E4E0D8] text-[#0B0D10] focus:ring-[#0B0D10]"
                />
                <span className="leading-tight">
                  <strong className="font-bold">I confirm that I am at least 18 years old.</strong>{" "}
                  Debate is strictly for adults aged 18 and older.
                </span>
              </label>

              {/* Terms of Service & Guidelines */}
              <label className="flex items-start gap-2.5 text-xs text-[#0B0D10] cursor-pointer">
                <input
                  type="checkbox"
                  name="terms_accepted"
                  required
                  className="mt-0.5 h-4 w-4 rounded border-[#E4E0D8] text-[#0B0D10] focus:ring-[#0B0D10]"
                />
                <span className="leading-tight">
                  I agree to the{" "}
                  <Link href="/terms" className="underline font-semibold" target="_blank">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/guidelines" className="underline font-semibold" target="_blank">
                    Community Guidelines
                  </Link>
                  .
                </span>
              </label>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              variant="primary"
              className="w-full font-bold"
              disabled={isPending}
            >
              {isPending ? "Creating account..." : "Sign Up & Get Started"}
            </Button>

            <p className="text-center text-xs text-[#5B6472]">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-[#0B0D10] underline hover:text-black"
              >
                Log in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

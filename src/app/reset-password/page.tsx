"use client";

import React, { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction, type ActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function ResetPasswordPage() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    requestPasswordResetAction,
    {}
  );

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Reset Your Password</CardTitle>
          <CardDescription>
            Enter your registered email address and we will dispatch a reset link.
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

            {state?.success && (
              <div className="flex items-center gap-2 rounded-lg bg-[#1F9D61]/10 p-3 text-xs font-medium text-[#1F9D61] border border-[#1F9D61]/20">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{state.message}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-xs font-bold uppercase tracking-wider text-[#0B0D10]"
              >
                Account Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@domain.com"
                className="w-full rounded-md border border-[#E4E0D8] bg-[#FAF8F4] px-3.5 py-2.5 text-sm text-[#0B0D10] placeholder:text-[#5B6472]/60 focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#0B0D10]"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              variant="primary"
              className="w-full font-bold"
              disabled={isPending}
            >
              {isPending ? "Sending..." : "Send Reset Link"}
            </Button>

            <p className="text-center text-xs text-[#5B6472]">
              Remembered your password?{" "}
              <Link
                href="/login"
                className="font-semibold text-[#0B0D10] underline hover:text-black"
              >
                Back to log in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

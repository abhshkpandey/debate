"use client";

import React, { useActionState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAction, type ActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

function NextParamInput() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  return <input type="hidden" name="next" value={next} />;
}

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    loginAction,
    {}
  );

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-[#0B0D10] text-[#C7F36B] font-mono font-bold text-lg mb-2">
            D
          </div>
          <CardTitle className="text-2xl">Log In to Debate</CardTitle>
          <CardDescription>
            Enter your email or username to access your challenges and matches.
          </CardDescription>
        </CardHeader>

        <form action={formAction}>
          <Suspense fallback={null}>
            <NextParamInput />
          </Suspense>
          <CardContent className="space-y-4">
            {state?.error && (
              <div className="flex items-center gap-2 rounded-lg bg-[#D93A47]/10 p-3 text-xs font-medium text-[#D93A47] border border-[#D93A47]/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{state.error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-xs font-bold uppercase tracking-wider text-[#0B0D10]"
              >
                Email or Username
              </label>
              <input
                id="email"
                name="email"
                type="text"
                autoComplete="username"
                required
                placeholder="alex_debater or alex@example.com"
                className="w-full rounded-md border border-[#E4E0D8] bg-[#FAF8F4] px-3.5 py-2.5 text-sm text-[#0B0D10] placeholder:text-[#5B6472]/60 focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#0B0D10]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-xs font-bold uppercase tracking-wider text-[#0B0D10]"
                >
                  Password
                </label>
                <Link
                  href="/reset-password"
                  className="text-xs text-[#5B6472] hover:text-[#0B0D10] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
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
              {isPending ? "Logging in..." : "Log In"}
            </Button>

            <p className="text-center text-xs text-[#5B6472]">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-semibold text-[#0B0D10] underline hover:text-black"
              >
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

"use client";

import React, { useActionState } from "react";
import { updateProfileAction, type ProfileActionState } from "@/app/actions/profile";
import { COMMON_TIMEZONES } from "@/lib/date/timezone";
import { Profile } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { CheckCircle2, AlertCircle } from "lucide-react";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction, isPending] = useActionState<ProfileActionState, FormData>(
    updateProfileAction,
    {}
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Details</CardTitle>
        <CardDescription>
          This information is displayed publicly to other debaters and viewers.
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
            <label className="text-xs font-bold uppercase tracking-wider text-[#0B0D10]">
              Username
            </label>
            <input
              type="text"
              disabled
              value={profile.username}
              className="w-full rounded-md border border-[#E4E0D8] bg-[#F1EEE8] px-3.5 py-2.5 text-sm text-[#5B6472] cursor-not-allowed"
            />
            <p className="text-[11px] text-[#5B6472]">
              Usernames are immutable to preserve historical debate and audit integrity.
            </p>
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
              defaultValue={profile.display_name}
              className="w-full rounded-md border border-[#E4E0D8] bg-[#FAF8F4] px-3.5 py-2.5 text-sm text-[#0B0D10] focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#0B0D10]"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="bio"
              className="text-xs font-bold uppercase tracking-wider text-[#0B0D10]"
            >
              Bio (optional)
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={3}
              defaultValue={profile.bio || ""}
              placeholder="Tell others what topics you like to debate..."
              className="w-full rounded-md border border-[#E4E0D8] bg-[#FAF8F4] px-3.5 py-2.5 text-sm text-[#0B0D10] focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#0B0D10]"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="timezone"
              className="text-xs font-bold uppercase tracking-wider text-[#0B0D10]"
            >
              IANA Timezone *
            </label>
            <select
              id="timezone"
              name="timezone"
              defaultValue={profile.timezone}
              className="w-full rounded-md border border-[#E4E0D8] bg-[#FAF8F4] px-3.5 py-2.5 text-sm text-[#0B0D10] focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#0B0D10]"
            >
              {!COMMON_TIMEZONES.includes(profile.timezone) && (
                <option value={profile.timezone}>{profile.timezone}</option>
              )}
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-[#5B6472]">
              Note: Updating your time zone updates availability suggestions, but will never alter the UTC timestamps of existing confirmed matches.
            </p>
          </div>

          <div className="pt-2 border-t border-[#E4E0D8]">
            <label className="flex items-start gap-2.5 text-xs text-[#0B0D10] cursor-pointer">
              <input
                type="checkbox"
                name="is_public"
                defaultChecked={profile.is_public}
                className="mt-0.5 h-4 w-4 rounded border-[#E4E0D8] text-[#0B0D10] focus:ring-[#0B0D10]"
              />
              <div>
                <span className="font-bold">Public Profile</span>
                <p className="text-[#5B6472] mt-0.5">
                  When enabled, other debaters can view your debate history and completed match transcripts.
                </p>
              </div>
            </label>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end">
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

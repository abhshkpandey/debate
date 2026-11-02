"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { isDevFallbackActive } from "@/lib/env";
import { memoryStore } from "@/lib/db/store";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isValidIanaTimeZone } from "@/lib/date/timezone";
import { revalidatePath } from "next/cache";

const profileSchema = z.object({
  display_name: z.string().min(2, "Display name must be at least 2 characters").max(50),
  bio: z.string().max(500, "Bio cannot exceed 500 characters").optional(),
  timezone: z.string().refine(isValidIanaTimeZone, "Invalid IANA timezone"),
  is_public: z.boolean(),
});

export type ProfileActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};

export async function updateProfileAction(
  _prevState: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Authentication required" };
  }

  const rawData = {
    display_name: formData.get("display_name"),
    bio: formData.get("bio") || "",
    timezone: formData.get("timezone"),
    is_public: formData.get("is_public") === "on",
  };

  const parsed = profileSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form input" };
  }

  const { display_name, bio, timezone, is_public } = parsed.data;

  if (isDevFallbackActive) {
    const profile = memoryStore.profiles.get(user.id);
    if (!profile) return { error: "Profile not found" };

    profile.display_name = display_name;
    profile.bio = bio || null;
    profile.timezone = timezone;
    profile.is_public = is_public;
    profile.updated_at = new Date().toISOString();

    revalidatePath("/settings/profile");
    revalidatePath(`/u/${profile.username}`);
    return { success: true, message: "Profile updated successfully." };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Database client unavailable" };

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name,
      bio: bio || null,
      timezone,
      is_public,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings/profile");
  revalidatePath(`/u/${user.profile.username}`);
  return { success: true, message: "Profile updated successfully." };
}

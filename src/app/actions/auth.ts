"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isDevFallbackActive } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { memoryStore } from "@/lib/db/store";
import { isValidIanaTimeZone } from "@/lib/date/timezone";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { sanitizeRedirectUrl } from "@/lib/security/url-safety";
import { Profile } from "@/types/database";

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username must contain only letters, numbers, and underscores"),
  display_name: z.string().min(2, "Display name must be at least 2 characters").max(50),
  timezone: z.string().refine(isValidIanaTimeZone, "Invalid IANA time zone"),
  age_verified: z.boolean().refine((val) => val === true, {
    message: "You must be at least 18 years of age to register",
  }),
  terms_accepted: z.boolean().refine((val) => val === true, {
    message: "You must agree to the Terms of Service and Guidelines",
  }),
});

const loginSchema = z.object({
  email: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

export type ActionState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
};

export async function signUpAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
    username: formData.get("username"),
    display_name: formData.get("display_name"),
    timezone: formData.get("timezone") || "UTC",
    age_verified: formData.get("age_verified") === "on",
    terms_accepted: formData.get("terms_accepted") === "on",
  };

  const parsed = signupSchema.safeParse(rawData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as string;
      fieldErrors[field] = issue.message;
    }
    return { error: "Please fix the form errors", fieldErrors };
  }

  const { email, password, username, display_name, timezone } = parsed.data;

  // Rate limit signups: max 10 per 10 minutes
  const rl = checkRateLimit(`signup:${email.toLowerCase().trim()}`, {
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!rl.success) {
    return { error: "Too many registration attempts. Please try again later." };
  }

  const cookieStore = await cookies();

  if (isDevFallbackActive) {
    // Check if username already exists in dev store
    const existing = Array.from(memoryStore.profiles.values()).find(
      (p) => p.username.toLowerCase() === username.toLowerCase()
    );
    if (existing) {
      return { error: "This username is already taken", fieldErrors: { username: "Username already taken" } };
    }

    const newId = `usr_${Date.now()}`;
    const newProfile: Profile = {
      id: newId,
      username,
      display_name,
      avatar_url: null,
      bio: null,
      timezone,
      is_public: true,
      is_admin: false,
      is_suspended: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    memoryStore.profiles.set(newId, newProfile);
    memoryStore.credentials.set(newId, password);
    cookieStore.set("debate_dev_session", newId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });

    redirect("/dashboard");
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { error: "Database client unavailable" };
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        display_name,
        timezone,
      },
    },
  });

  if (authError || !authData.user) {
    return { error: authError?.message ?? "Failed to create account" };
  }

  // Create or initialize profile row using service role client to bypass RLS during signup
  const adminClient = createServiceRoleClient() ?? supabase;
  const { error: profileError } = await adminClient.from("profiles").upsert(
    {
      id: authData.user.id,
      username,
      display_name,
      timezone,
      is_public: true,
      is_admin: false,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    return { error: "Created user account but failed to initialize profile: " + profileError.message };
  }

  redirect("/dashboard");
}

export async function loginAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = loginSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: "Email/username and password are required" };
  }

  const { email, password } = parsed.data;

  // Rate limit: max 30 login attempts per minute per email/username
  const rl = checkRateLimit(`login_attempt:${email.toLowerCase().trim()}`, {
    limit: 30,
    windowMs: 60 * 1000,
  });
  if (!rl.success) {
    return {
      error: `Too many login attempts. Please wait ${Math.ceil(rl.resetMs / 1000)} seconds before trying again.`,
    };
  }

  const cookieStore = await cookies();
  const nextParam = formData.get("next") as string | null;
  const targetUrl = sanitizeRedirectUrl(nextParam);

  if (isDevFallbackActive) {
    // Match by email or username in dev memory store
    const profile = Array.from(memoryStore.profiles.values()).find(
      (p) =>
        p.username.toLowerCase() === email.toLowerCase() ||
        `${p.username}@example.com`.toLowerCase() === email.toLowerCase()
    );

    const validPassword = profile ? memoryStore.credentials?.get(profile.id) ?? "password123" : null;

    if (!profile || password !== validPassword) {
      return { error: "Invalid email/username or password." };
    }

    if (profile.is_suspended) {
      return { error: "This account has been suspended by a moderator." };
    }

    cookieStore.set("debate_dev_session", profile.id, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });

    redirect(targetUrl);
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Database client unavailable" };

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect(targetUrl);
}

export async function logoutAction() {
  const cookieStore = await cookies();

  if (isDevFallbackActive) {
    cookieStore.delete("debate_dev_session");
  } else {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
  }

  redirect("/login");
}

export async function requestPasswordResetAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = formData.get("email") as string;
  if (!email || !email.includes("@")) {
    return { error: "Please enter a valid email address." };
  }

  const rl = checkRateLimit(`reset_pwd:${email.toLowerCase().trim()}`, {
    limit: 3,
    windowMs: 15 * 60 * 1000,
  });
  if (!rl.success) {
    return {
      error: `Too many password reset requests. Please wait ${Math.ceil(rl.resetMs / 60000)} minute(s) before trying again.`,
    };
  }

  if (isDevFallbackActive) {
    return {
      success: true,
      message: `[Dev Fallback] Password reset link sent to ${email} (check dev console or sign in directly with username).`,
    };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Database client unavailable" };

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: true,
    message: "A password reset link has been dispatched to your email address.",
  };
}

/**
 * Developer helper: Quick-switch current persona in dev mode
 */
export async function devSwitchUserAction(userId: string) {
  if (!isDevFallbackActive) return;
  const cookieStore = await cookies();
  cookieStore.set("debate_dev_session", userId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });
  redirect("/dashboard");
}

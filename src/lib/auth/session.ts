import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isDevFallbackActive } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { memoryStore } from "@/lib/db/store";
import { Profile } from "@/types/database";

export const DEV_SESSION_COOKIE = "debate_dev_session";

export interface UserSession {
  id: string;
  email: string;
  profile: Profile;
}

/**
 * Retrieves the current session user and their profile on the server.
 */
export async function getCurrentUser(): Promise<UserSession | null> {
  const cookieStore = await cookies();

  if (isDevFallbackActive) {
    const devUserId = cookieStore.get(DEV_SESSION_COOKIE)?.value;
    if (!devUserId) return null;

    const profile = memoryStore.profiles.get(devUserId);
    if (!profile || profile.is_suspended) return null;

    return {
      id: profile.id,
      email: `${profile.username}@example.com`,
      profile,
    };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (!profile || (profile as Profile).is_suspended) return null;

  return {
    id: session.user.id,
    email: session.user.email ?? "",
    profile: profile as Profile,
  };
}

/**
 * Server-side route protection: redirects to /login if not authenticated.
 */
export async function requireAuth(returnUrl?: string): Promise<UserSession> {
  const user = await getCurrentUser();
  if (!user) {
    const query = returnUrl ? `?next=${encodeURIComponent(returnUrl)}` : "";
    redirect(`/login${query}`);
  }
  return user;
}

/**
 * Server-side route protection: requires admin role.
 */
export async function requireAdmin(): Promise<UserSession> {
  const user = await requireAuth("/admin");
  if (!user.profile.is_admin) {
    redirect("/dashboard");
  }
  return user;
}

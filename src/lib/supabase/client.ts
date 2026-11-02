import { createBrowserClient } from "@supabase/ssr";
import { env, isDevFallbackActive } from "@/lib/env";

export function createClient() {
  if (isDevFallbackActive) {
    // In dev fallback mode when credentials are not configured
    return null;
  }
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

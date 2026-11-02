import { createClient } from "@supabase/supabase-js";
import { env, isDevFallbackActive } from "@/lib/env";

export function createServiceRoleClient() {
  if (isDevFallbackActive || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

function isServiceRoleKey(key: string): boolean {
  if (!key) return false;

  if (key.startsWith("sb_secret_")) return true;
  if (key.startsWith("sb_publishable_")) return false;

  const parts = key.split(".");
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(
        Buffer.from(parts[1], "base64url").toString("utf8"),
      ) as { role?: string };
      return payload.role === "service_role";
    } catch {
      return false;
    }
  }

  return false;
}

export function createSupabaseAdminClient() {
  if (!env.supabaseServiceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY/Supabase_KEY)",
    );
  }

  if (!isServiceRoleKey(env.supabaseServiceRoleKey)) {
    throw new Error(
      "Invalid admin key: use SUPABASE_SERVICE_ROLE_KEY with a service role/secret key, not publishable key",
    );
  }

  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

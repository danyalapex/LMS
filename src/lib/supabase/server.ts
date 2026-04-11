import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export async function createSupabaseServerClient() {
  // `cookies()` returns the request cookie store. Its `.set` method
  // can only be called in Server Actions or Route Handlers — calling
  // it from other server contexts will throw. Wrap `set` calls so the
  // Dev server and non-action server code do not crash.
  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          try {
            // Safe-guard: if this is called outside a Server Action/Route
            // handler, `cookieStore.set` will throw. Catch and warn instead
            // of letting the process crash.
            cookieStore.set(cookie.name, cookie.value, cookie.options);
          } catch (err) {
            // Prefer a non-fatal warning so dev server keeps running.
            // In Server Actions / Route Handlers the .set call will succeed
            // and cookies will be written as expected.
            // eslint-disable-next-line no-console
            console.warn("[supabase] unable to set cookie (not in Server Action/Route Handler)", err);
          }
        }
      },
    },
  });
}

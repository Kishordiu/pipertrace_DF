import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function readEnvironment() {
  const browserEnv = import.meta.env;
  const serverEnv = typeof process !== "undefined" ? process.env : undefined;
  const url = browserEnv["VITE_SUPABASE_URL"] || serverEnv?.["SUPABASE_URL"];
  const key = browserEnv["VITE_SUPABASE_PUBLISHABLE_KEY"] || serverEnv?.["SUPABASE_PUBLISHABLE_KEY"];

  if (!url || !key) {
    throw new Error("PiperTrace authentication is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY for the browser, and SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY for the server runtime.");
  }
  return { url, key };
}

function createSupabaseClient() {
  const { url, key } = readEnvironment();
  const isBrowser = typeof window !== "undefined";

  return createClient<Database>(url, key, {
    auth: {
      persistSession: isBrowser,
      autoRefreshToken: isBrowser,
      detectSessionInUrl: isBrowser,
      flowType: "pkce",
    },
  });
}

type SupabaseClient = ReturnType<typeof createSupabaseClient>;
let instance: SupabaseClient | undefined;

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    if (!instance) instance = createSupabaseClient();
    const value = Reflect.get(instance, property, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

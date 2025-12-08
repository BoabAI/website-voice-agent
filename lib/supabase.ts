import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Create an Admin client for backend tasks (bypasses RLS)
// Supports both:
// - Legacy service_role key (JWT format: eyJ...)
// - New secret API key (format: sb_secret_...)
// Only use this on the server side!
const supabaseSecretKey =
  process.env.SUPABASE_SECRET_API_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = supabaseSecretKey
  ? createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

/**
 * Sign in anonymously if no session exists
 * Returns the user ID
 */
export async function ensureAnonymousSession(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user) {
    return session.user.id;
  }

  const { data, error } = await supabase.auth.signInAnonymously();

  if (error) {
    throw new Error(`Failed to sign in anonymously: ${error.message}`);
  }

  if (!data.user) {
    throw new Error("No user returned from anonymous sign in");
  }

  return data.user.id;
}

/**
 * Get current user ID if signed in
 */
export async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.user?.id ?? null;
}

/**
 * Client-side Supabase client hook
 */
export function createClientSupabase() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

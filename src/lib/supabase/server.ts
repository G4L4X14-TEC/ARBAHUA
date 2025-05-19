
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/supabase/database.types';

export function createSupabaseServerClient() {
  const envSupabaseUrl = process.env.SUPABASE_URL;
  const envSupabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const envNextPublicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envNextPublicSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // console.log('[SupabaseServerClient] Checking Environment Variables:');
  // console.log(`  process.env.SUPABASE_URL: ${envSupabaseUrl ? 'SET - ' + envSupabaseUrl.substring(0,20) + '...' : 'NOT SET'}`);
  // console.log(`  process.env.SUPABASE_ANON_KEY: ${envSupabaseAnonKey ? 'SET - ' + envSupabaseAnonKey.substring(0,10) + '...' : 'NOT SET'}`);
  // console.log(`  process.env.NEXT_PUBLIC_SUPABASE_URL: ${envNextPublicSupabaseUrl ? 'SET - ' + envNextPublicSupabaseUrl.substring(0,20) + '...' : 'NOT SET'}`);
  // console.log(`  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY: ${envNextPublicSupabaseAnonKey ? 'SET - ' + envNextPublicSupabaseAnonKey.substring(0,10) + '...' : 'NOT SET'}`);

  const supabaseUrl = envSupabaseUrl || envNextPublicSupabaseUrl;
  const supabaseAnonKey = envSupabaseAnonKey || envNextPublicSupabaseAnonKey;

  // console.log(`  Resolved supabaseUrl for client: ${supabaseUrl ? supabaseUrl.substring(0,20) + '...' : 'UNDEFINED'}`);
  // console.log(`  Resolved supabaseAnonKey for client: ${supabaseAnonKey ? supabaseAnonKey.substring(0,10) + '...' : 'UNDEFINED'}`);

  if (!supabaseUrl || !supabaseAnonKey) {
    // console.error(
    //   `[SupabaseServerClient] CRITICAL ERROR: Supabase URL or Anon Key is missing before client creation. ` +
    //   `Resolved URL: '${supabaseUrl || "MISSING"}' | Resolved Anon Key: '${supabaseAnonKey ? "PRESENT_BUT_WONT_LOG_VALUE" : "MISSING"}'`
    // );
    throw new Error(
      'Supabase URL and Anon Key are required for the server client. Check your environment variables.'
    );
  }

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        const cookieStore = cookies();
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        const cookieStore = cookies();
        // Removed try...catch for simplification, as per previous discussion.
        // If this causes issues (e.g., during static prerendering attempting to set cookies),
        // it might need to be re-added or handled differently.
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        const cookieStore = cookies();
        // Removed try...catch for simplification.
        cookieStore.set({ name, value: '', ...options });
      },
    },
  });
}

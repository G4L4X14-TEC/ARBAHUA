
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/supabase/database.types';

export function createSupabaseServerClient() {
  const cookieStore = cookies();

  // Attempt to read server-specific (non-prefixed) first, then fall back to NEXT_PUBLIC_ prefixed
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('[SupabaseServerClient] Checking Environment Variables:');
  console.log(`  process.env.SUPABASE_URL: ${process.env.SUPABASE_URL ? 'SET - ' + process.env.SUPABASE_URL.substring(0,20) + '...' : 'NOT SET'}`);
  console.log(`  process.env.SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? 'SET - ' + process.env.SUPABASE_ANON_KEY.substring(0,10) + '...' : 'NOT SET'}`);
  console.log(`  process.env.NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET - ' + process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0,20) + '...' : 'NOT SET'}`);
  console.log(`  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET - ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0,10) + '...' : 'NOT SET'}`);
  console.log(`  Resolved supabaseUrl for client: ${supabaseUrl ? supabaseUrl.substring(0,20) + '...' : 'UNDEFINED'}`);
  console.log(`  Resolved supabaseAnonKey for client: ${supabaseAnonKey ? supabaseAnonKey.substring(0,10) + '...' : 'UNDEFINED'}`);

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      `[SupabaseServerClient] CRITICAL ERROR: Supabase URL or Anon Key is missing before client creation. ` +
      `Resolved URL: '${supabaseUrl || "MISSING"}' | Resolved Anon Key: '${supabaseAnonKey ? "PRESENT_BUT_WONT_LOG_VALUE" : "MISSING"}'`
    );
    throw new Error(
      'Supabase URL and Anon Key are required for the server client. Check your environment variables.'
    );
  }

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Server Components might not be able to set cookies.
            // console.log(`Note: Could not set cookie ${name} in Server Component context.`);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // console.log(`Note: Could not remove cookie ${name} in Server Component context.`);
          }
        },
      },
    }
  );
}

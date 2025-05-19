
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/supabase/database.types';

export function createSupabaseServerClient() {
  // Log environment variable status (helps in debugging Vercel/Cloud Workstation deployments)
  const envSupabaseUrl = process.env.SUPABASE_URL;
  const envSupabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const envNextPublicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envNextPublicSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('[SupabaseServerClient] Checking Environment Variables:');
  console.log(`  process.env.SUPABASE_URL: ${envSupabaseUrl ? 'SET - ' + envSupabaseUrl.substring(0,20) + '...' : 'NOT SET'}`);
  console.log(`  process.env.SUPABASE_ANON_KEY: ${envSupabaseAnonKey ? 'SET - ' + envSupabaseAnonKey.substring(0,10) + '...' : 'NOT SET'}`);
  console.log(`  process.env.NEXT_PUBLIC_SUPABASE_URL: ${envNextPublicSupabaseUrl ? 'SET - ' + envNextPublicSupabaseUrl.substring(0,20) + '...' : 'NOT SET'}`);
  console.log(`  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY: ${envNextPublicSupabaseAnonKey ? 'SET - ' + envNextPublicSupabaseAnonKey.substring(0,10) + '...' : 'NOT SET'}`);

  const supabaseUrl = envSupabaseUrl || envNextPublicSupabaseUrl;
  const supabaseAnonKey = envSupabaseAnonKey || envNextPublicSupabaseAnonKey;

  console.log(`  Resolved supabaseUrl for client: ${supabaseUrl ? supabaseUrl.substring(0,20) + '...' : 'UNDEFINED'}`);
  console.log(`  Resolved supabaseAnonKey for client: ${supabaseAnonKey ? supabaseAnonKey.substring(0,10) + '...' : 'UNDEFINED'}`);

  if (!supabaseUrl || !supabaseAnonKey) {
    // This console.error will appear in server logs if env vars are missing.
    console.error(
      `[SupabaseServerClient] CRITICAL ERROR: Supabase URL or Anon Key is missing before client creation. ` +
      `Resolved URL: '${supabaseUrl || "MISSING"}' | Resolved Anon Key: '${supabaseAnonKey ? "PRESENT_BUT_WONT_LOG_VALUE" : "MISSING"}'`
    );
    // Throwing an error here makes sense as the client cannot be created.
    throw new Error(
      'Supabase URL and Anon Key are required for the server client. Check your environment variables.'
    );
  }

  // The 'cookies' object from next/headers is a dynamic function.
  // We pass it directly to createServerClient.
  // The functions within the 'cookies' option object will be called by Supabase's library.
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        // cookies() must be called within the functions, not outside,
        // to ensure it's accessed in the correct RSC context.
        const cookieStore = cookies();
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        const cookieStore = cookies();
        try {
          cookieStore.set({ name, value, ...options });
        } catch (error) {
          // Server Components might not be able to set cookies.
          // This usually happens when trying to set cookies during prerendering.
          // console.log(`Note: Could not set cookie ${name} in Server Component context.`);
        }
      },
      remove(name: string, options: CookieOptions) {
        const cookieStore = cookies();
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch (error) {
          // console.log(`Note: Could not remove cookie ${name} in Server Component context.`);
        }
      },
    },
  });
}

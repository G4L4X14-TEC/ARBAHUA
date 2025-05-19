
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/supabase/database.types';

export function createSupabaseServerClient() {
  const cookieStore = cookies();

  // Ensure these environment variables are set in your Vercel project settings
  // (and .env.local for local server-side development)
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
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
          // Server Components can only read cookies, not set them directly.
          // For mutations or auth actions that set cookies, use Server Actions or Route Handlers.
          // However, Supabase client needs this structure. For read-only in SC, it's fine.
          // If you encounter issues with auth state in SC after login/logout,
          // you might need to refresh or use a client-side router push.
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // In Server Components, setting cookies might be restricted.
            // Supabase's SSR client is designed to handle this gracefully for reads.
            // console.log(`Note: Could not set cookie ${name} in Server Component context.`);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options }); // Clearing cookie by setting empty value
          } catch (error) {
            // console.log(`Note: Could not remove cookie ${name} in Server Component context.`);
          }
        },
      },
    }
  );
}

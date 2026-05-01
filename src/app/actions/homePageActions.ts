
'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Tables, Database, Json } from '@/lib/supabase/database.types';

// Type for products fetched from Supabase, including nested data for display
type ProductFromSupabase = Tables<'productos'> & {
  tiendas: Pick<Tables<'tiendas'>, 'nombre'> | null;
  imagenes_productos: Array<{ url: string | null; es_principal: boolean | null }>;
};

// Type for products as they will be used in the component
export type ProductForDisplay = Tables<'productos'> & {
  imagen_url: string;
  tienda_nombre: string | null;
};

export type StoreForDisplay = Tables<'tiendas'>;


// Helper function to create a Supabase client for Server Actions.
// Uses service role key when available (server-only) so that RLS policies
// don't block reads of public data (featured products, stores) on the home page.
function createSupabaseServerClientAction() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('[SupabaseServerClientAction] Initializing Supabase client for Server Action.');
  console.log(`  NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? 'SET' : 'NOT SET'}`);
  console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${serviceRoleKey ? 'SET' : 'NOT SET'}`);
  console.log(`  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'SET' : 'NOT SET'}`);

  if (!supabaseUrl) {
    console.error("[SupabaseServerClientAction] CRITICAL ERROR: Supabase URL is missing in env for Server Action.");
    return null;
  }

  // Prefer service role key for server-side reads so RLS doesn't block public data
  if (serviceRoleKey) {
    return createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
  }

  if (!supabaseAnonKey) {
    console.error("[SupabaseServerClientAction] CRITICAL ERROR: Neither service role key nor anon key is set.");
    return null;
  }

  const cookieStore = cookies();
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
            // ignore in server actions
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.delete({ name, ...options });
          } catch (error) {
            // ignore in server actions
          }
        },
      },
    }
  );
}


export async function getFeaturedProductsAction(): Promise<ProductForDisplay[]> {
  console.log('[getFeaturedProductsAction] Attempting to fetch products.');
  const supabase = createSupabaseServerClientAction();

  if (!supabase) {
    console.error("[getFeaturedProductsAction] Failed to initialize Supabase client. Env vars might be missing for server action.");
    return []; 
  }
  
  console.log('[getFeaturedProductsAction] Supabase client initialized. Fetching products...');

  try {
    const { data: productsData, error } = await supabase
      .from('productos')
      .select(
        '*, tiendas(nombre), imagenes_productos(url, es_principal)'
      )
      .eq('estado', 'activo') // Solo productos activos
      .order('fecha_creacion', { ascending: false }) // Mostrar los más recientes primero
      .limit(6); // Limitar a 6 productos destacados

    if (error) {
      console.error("[getFeaturedProductsAction] Error fetching featured products:", error.message);
      return []; 
    }

    if (!productsData) {
      console.log("[getFeaturedProductsAction] No products data returned.");
      return [];
    }

    console.log(`[getFeaturedProductsAction] Fetched ${productsData.length} products.`);

    return productsData.map((pProduct: ProductFromSupabase): ProductForDisplay => {
      const { imagenes_productos, tiendas, ...coreProductFields } = pProduct;
      const principalImage = imagenes_productos?.find(img => img.es_principal === true);
      const anyImage = imagenes_productos?.[0]; 
      const placeholderText = encodeURIComponent(coreProductFields.nombre);
      const imageUrl = principalImage?.url || anyImage?.url || 'https://placehold.co/400x300.png?text=' + placeholderText;
      
      console.log(`[getFeaturedProductsAction] Product: ${coreProductFields.nombre}, Principal Image URL: ${principalImage?.url}, Any Image URL: ${anyImage?.url}, Final imageUrl: ${imageUrl}`);

      return {
        ...coreProductFields,
        imagen_url: imageUrl,
        tienda_nombre: tiendas?.nombre || 'Artesano Independiente',
      };
    });
  } catch (e: any) {
    console.error("[getFeaturedProductsAction] Critical error in action:", e.message);
    return []; 
  }
}

export async function getFeaturedStoresAction(): Promise<StoreForDisplay[]> {
  console.log('[getFeaturedStoresAction] Attempting to fetch stores.');
  const supabase = createSupabaseServerClientAction();

  if (!supabase) {
    console.error("[getFeaturedStoresAction] Failed to initialize Supabase client. Env vars might be missing for server action.");
    return [];
  }

  console.log('[getFeaturedStoresAction] Supabase client initialized. Fetching stores...');
  
  try {
    const { data: storesData, error } = await supabase
      .from('tiendas')
      .select('*')
      .eq('estado', 'activa') // Solo tiendas activas
      .order('fecha_creacion', { ascending: false }) // Mostrar las más recientes primero
      .limit(3); // Limitar a 3 tiendas destacadas

    if (error) {
      console.error("[getFeaturedStoresAction] Error fetching featured stores:", error.message);
      return []; 
    }
    
    if (!storesData) {
      console.log("[getFeaturedStoresAction] No stores data returned.");
      return [];
    }
    console.log(`[getFeaturedStoresAction] Fetched ${storesData.length} stores.`);
    return storesData;

  } catch (e: any) {
    console.error("[getFeaturedStoresAction] Critical error in action:", e.message);
    return []; 
  }
}

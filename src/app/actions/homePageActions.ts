
'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Tables, Database } from '@/lib/supabase/database.types';

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


// Helper function to create a Supabase client for Server Actions
function createSupabaseServerClientAction() {
  const cookieStore = cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // This case should ideally be handled by environment variable checks at build/startup
    // or a more robust configuration management.
    // For now, logging and throwing an error or returning a specific error state.
    console.error("[SupabaseServerClientAction] CRITICAL ERROR: Supabase URL or Anon Key is missing.");
    // Depending on how you want to handle this, you might throw an error
    // or return null/undefined and let the calling function handle it.
    // throw new Error("Supabase configuration is missing for Server Action client.");
    return null; 
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
            // This can happen in Next.js App Router when trying to set a cookie too late.
            // For Server Actions, this is generally safe during the action's execution.
            console.warn(`[SupabaseServerClientAction] Failed to set cookie '${name}':`, error);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            console.warn(`[SupabaseServerClientAction] Failed to remove cookie '${name}':`, error);
          }
        },
      },
    }
  );
}


export async function getFeaturedProductsAction(): Promise<ProductForDisplay[]> {
  console.log('[getFeaturedProductsAction] Initializing Supabase client for Server Action.');
  const supabase = createSupabaseServerClientAction();

  if (!supabase) {
    console.error("[getFeaturedProductsAction] Failed to initialize Supabase client.");
    return []; // Return empty array if client initialization failed
  }
  
  console.log('[getFeaturedProductsAction] Supabase client initialized. Fetching products...');

  try {
    const { data: productsData, error } = await supabase
      .from('productos')
      .select(`
        *,
        tiendas (nombre),
        imagenes_productos (url, es_principal)
      `)
      .eq('estado', 'activo') // Solo productos activos
      .order('fecha_creacion', { ascending: false }) // Mostrar los más recientes primero
      .limit(6); // Limitar a 6 productos destacados

    if (error) {
      console.error("[getFeaturedProductsAction] Error fetching featured products:", error.message);
      return []; // Return empty array on error
    }

    if (!productsData) {
      console.log("[getFeaturedProductsAction] No products data returned.");
      return [];
    }

    console.log(`[getFeaturedProductsAction] Fetched ${productsData.length} products.`);

    return productsData.map((pProduct: ProductFromSupabase) => {
      const { imagenes_productos, tiendas, ...coreProductFields } = pProduct;
      const principalImage = imagenes_productos?.find(img => img.es_principal === true);
      const anyImage = imagenes_productos?.[0]; 

      return {
        ...coreProductFields,
        imagen_url: principalImage?.url || anyImage?.url || \`https://placehold.co/400x300.png?text=\${encodeURIComponent(coreProductFields.nombre)}\`,
        tienda_nombre: tiendas?.nombre || 'Artesano Independiente',
      };
    });
  } catch (e: any) {
    console.error("[getFeaturedProductsAction] Critical error in action:", e.message);
    return []; // Return empty array on critical error
  }
}

export async function getFeaturedStoresAction(): Promise<StoreForDisplay[]> {
  console.log('[getFeaturedStoresAction] Initializing Supabase client for Server Action.');
  const supabase = createSupabaseServerClientAction();

  if (!supabase) {
    console.error("[getFeaturedStoresAction] Failed to initialize Supabase client.");
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
      return []; // Return empty array on error
    }
    
    if (!storesData) {
      console.log("[getFeaturedStoresAction] No stores data returned.");
      return [];
    }
    console.log(`[getFeaturedStoresAction] Fetched ${storesData.length} stores.`);
    return storesData;

  } catch (e: any) {
    console.error("[getFeaturedStoresAction] Critical error in action:", e.message);
    return []; // Return empty array on critical error
  }
}

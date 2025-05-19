
'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
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


// Helper function to create a Supabase client for Server Actions
function createSupabaseServerClientAction() {
  const cookieStore = cookies(); 
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // console.log('[SupabaseServerClientAction] Initializing Supabase client for Server Action.');
  // console.log(`  NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? 'SET' : 'NOT SET'}`);
  // console.log(`  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'SET' : 'NOT SET'}`);


  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[SupabaseServerClientAction] CRITICAL ERROR: Supabase URL or Anon Key is missing in env for Server Action.");
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
            // console.warn(`[SupabaseServerClientAction] Failed to set cookie '${name}' in Server Action:`, error);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.delete({ name, ...options }); // Corrected to use delete
          } catch (error) {
            // console.warn(`[SupabaseServerClientAction] Failed to remove cookie '${name}' in Server Action:`, error);
          }
        },
      },
    }
  );
}


export async function getFeaturedProductsAction(): Promise<ProductForDisplay[]> {
  // console.log('[getFeaturedProductsAction] Attempting to fetch products.');
  const supabase = createSupabaseServerClientAction();

  if (!supabase) {
    console.error("[getFeaturedProductsAction] Failed to initialize Supabase client. Env vars might be missing for server action.");
    return []; 
  }
  
  // console.log('[getFeaturedProductsAction] Supabase client initialized. Fetching products...');

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
      // console.log("[getFeaturedProductsAction] No products data returned.");
      return [];
    }

    // console.log(`[getFeaturedProductsAction] Fetched ${productsData.length} products.`);

    return productsData.map((pProduct: ProductFromSupabase): ProductForDisplay => {
      const { imagenes_productos, tiendas, ...coreProductFields } = pProduct;
      const principalImage = imagenes_productos?.find(img => img.es_principal === true);
      const anyImage = imagenes_productos?.[0]; 
      const placeholderText = encodeURIComponent(coreProductFields.nombre);
      // Corrected line: using string concatenation instead of template literal for the placeholder part
      const imageUrl = principalImage?.url || anyImage?.url || 'https://placehold.co/400x300.png?text=' + placeholderText;

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
  // console.log('[getFeaturedStoresAction] Attempting to fetch stores.');
  const supabase = createSupabaseServerClientAction();

  if (!supabase) {
    console.error("[getFeaturedStoresAction] Failed to initialize Supabase client. Env vars might be missing for server action.");
    return [];
  }

  // console.log('[getFeaturedStoresAction] Supabase client initialized. Fetching stores...');
  
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
      // console.log("[getFeaturedStoresAction] No stores data returned.");
      return [];
    }
    // console.log(`[getFeaturedStoresAction] Fetched ${storesData.length} stores.`);
    return storesData;

  } catch (e: any) {
    console.error("[getFeaturedStoresAction] Critical error in action:", e.message);
    return []; 
  }
}

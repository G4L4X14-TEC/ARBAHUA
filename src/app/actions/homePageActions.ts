
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

export async function getFeaturedProductsAction(): Promise<ProductForDisplay[]> {
  console.log('[getFeaturedProductsAction] Checking Environment Variables:');
  console.log(`  process.env.NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET'}`);
  console.log(`  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'}`);

  try {
    const cookieStore = cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            // Removed try...catch for simplification based on previous discussions
            // If issues arise with cookie setting in specific environments, it might need re-evaluation
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

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
    if (!productsData) return [];

    return productsData.map((pProduct: ProductFromSupabase) => {
      const { imagenes_productos, tiendas, ...coreProductFields } = pProduct;
      const principalImage = imagenes_productos?.find(img => img.es_principal === true);
      const anyImage = imagenes_productos?.[0]; 

      return {
        ...coreProductFields,
        imagen_url: principalImage?.url || anyImage?.url || `https://placehold.co/400x300.png?text=${encodeURIComponent(coreProductFields.nombre)}`,
        tienda_nombre: tiendas?.nombre || 'Artesano Independiente',
      };
    });
  } catch (e: any) {
    console.error("[getFeaturedProductsAction] Critical error in action:", e.message);
    return []; // Return empty array on critical error
  }
}

export async function getFeaturedStoresAction(): Promise<StoreForDisplay[]> {
  console.log('[getFeaturedStoresAction] Checking Environment Variables:');
  console.log(`  process.env.NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET'}`);
  console.log(`  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'}`);

  try {
    const cookieStore = cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

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
    return storesData || [];
  } catch (e: any) {
    console.error("[getFeaturedStoresAction] Critical error in action:", e.message);
    return []; // Return empty array on critical error
  }
}

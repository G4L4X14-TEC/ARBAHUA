
'use server';

import { createServerClient } from '@supabase/ssr';
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
  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: productsData, error } = await supabase
    .from('productos')
    .select(\`
      *,
      tiendas (nombre),
      imagenes_productos (url, es_principal)
    \`)
    .eq('estado', 'activo') // Solo productos activos
    .limit(6); // Limitar a 6 productos destacados

  if (error) {
    console.error("Error fetching featured products:", error.message);
    // Consider throwing the error or returning a specific error object
    // For now, returning empty array on error
    return [];
  }
  if (!productsData) return [];

  return productsData.map((pProduct: ProductFromSupabase) => {
    const { imagenes_productos, tiendas, ...coreProductFields } = pProduct;
    const principalImage = imagenes_productos?.find(img => img.es_principal === true);
    const anyImage = imagenes_productos?.[0]; // Fallback to any image if no principal

    return {
      ...coreProductFields,
      imagen_url: principalImage?.url || anyImage?.url || \`https://placehold.co/400x300.png?text=\${encodeURIComponent(coreProductFields.nombre)}\`,
      tienda_nombre: tiendas?.nombre || 'Artesano Independiente',
    };
  });
}

export async function getFeaturedStoresAction(): Promise<StoreForDisplay[]> {
  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: storesData, error } = await supabase
    .from('tiendas')
    .select('*')
    .eq('estado', 'activa') // Solo tiendas activas
    .limit(3); // Limitar a 3 tiendas destacadas

  if (error) {
    console.error("Error fetching featured stores:", error.message);
    return [];
  }
  return storesData || [];
}

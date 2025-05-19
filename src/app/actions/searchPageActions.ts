'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Tables, Database, Json } from '@/lib/supabase/database.types';

// Type for products fetched from Supabase, including nested data for display
type ProductFromSupabase = Tables<'productos'> & {
  tiendas: Pick<Tables<'tiendas'>, 'nombre'> | null;
  imagenes_productos: Array<{ url: string | null; es_principal: boolean | null }>;
  categorias?: Array<Pick<Tables<'categorias'>, 'id' | 'nombre'>>; // Optional for direct product fetching
};

// Type for products as they will be used in the component
export type ProductForDisplay = Tables<'productos'> & {
  imagen_url: string;
  tienda_nombre: string | null;
};

export type CategoryForDisplay = Tables<'categorias'>;

// Helper function to create a Supabase client for Server Actions
function createSupabaseServerClientAction() {
  const cookieStore = cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
            cookieStore.delete({ name, ...options });
          } catch (error) {
            // console.warn(`[SupabaseServerClientAction] Failed to remove cookie '${name}' in Server Action:`, error);
          }
        },
      },
    }
  );
}

export async function getCategoriesAction(): Promise<CategoryForDisplay[]> {
  // console.log('[getCategoriesAction] Attempting to fetch categories.');
  const supabase = createSupabaseServerClientAction();

  if (!supabase) {
    console.error("[getCategoriesAction] Failed to initialize Supabase client.");
    return [];
  }

  try {
    const { data: categoriesData, error } = await supabase
      .from('categorias')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) {
      console.error("[getCategoriesAction] Error fetching categories:", error.message);
      return [];
    }
    // console.log(`[getCategoriesAction] Fetched ${categoriesData?.length || 0} categories.`);
    return categoriesData || [];
  } catch (e: any) {
    console.error("[getCategoriesAction] Critical error in action:", e.message);
    return [];
  }
}

interface SearchProductsParams {
  searchTerm?: string | null;
  categoryId?: string | null;
  // Add other filter params here later: sortBy, priceMin, priceMax etc.
}

export async function searchProductsAction(params: SearchProductsParams): Promise<ProductForDisplay[]> {
  // console.log('[searchProductsAction] Attempting to search products with params:', params);
  const supabase = createSupabaseServerClientAction();

  if (!supabase) {
    console.error("[searchProductsAction] Failed to initialize Supabase client.");
    return [];
  }

  try {
    let query = supabase
      .from('productos')
      .select(`
        *,
        tiendas (nombre),
        imagenes_productos (url, es_principal)
      `)
      .eq('estado', 'activo');

    if (params.searchTerm) {
      // Using 'or' for searching in name or description.
      // Supabase textSearch (fts) would be more performant for larger datasets.
      query = query.or(`nombre.ilike.%${params.searchTerm}%,descripcion.ilike.%${params.searchTerm}%`);
    }

    if (params.categoryId) {
      // To filter by category, we need a many-to-many relationship or a direct category_id on products.
      // Assuming 'producto_categoria' join table
      const { data: productIdsByCategory, error: categoryError } = await supabase
        .from('producto_categoria')
        .select('producto_id')
        .eq('categoria_id', params.categoryId);

      if (categoryError) {
        console.error("[searchProductsAction] Error fetching product IDs by category:", categoryError.message);
        return [];
      }
      
      if (productIdsByCategory && productIdsByCategory.length > 0) {
        const ids = productIdsByCategory.map(pc => pc.producto_id);
        query = query.in('id', ids);
      } else {
        // No products found for this category
        return [];
      }
    }
    
    // Add ordering, e.g., by creation date or name
    query = query.order('fecha_creacion', { ascending: false });

    const { data: productsData, error: productsError } = await query;

    if (productsError) {
      console.error("[searchProductsAction] Error fetching searched products:", productsError.message);
      return [];
    }

    if (!productsData) {
      // console.log("[searchProductsAction] No products data returned from search.");
      return [];
    }
    
    // console.log(`[searchProductsAction] Fetched ${productsData.length} products from search.`);

    return productsData.map((pProduct: ProductFromSupabase): ProductForDisplay => {
      const { imagenes_productos, tiendas, ...coreProductFields } = pProduct;
      const principalImage = imagenes_productos?.find(img => img.es_principal === true);
      const anyImage = imagenes_productos?.[0];
      const placeholderText = encodeURIComponent(coreProductFields.nombre);
      const imageUrl = principalImage?.url || anyImage?.url || 'https://placehold.co/400x300.png?text=' + placeholderText;

      return {
        ...coreProductFields,
        imagen_url: imageUrl,
        tienda_nombre: tiendas?.nombre || 'Artesano Independiente',
      };
    });

  } catch (e: any) {
    console.error("[searchProductsAction] Critical error in action:", e.message);
    return [];
  }
}

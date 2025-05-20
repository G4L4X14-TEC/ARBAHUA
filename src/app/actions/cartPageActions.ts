
'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Tables, Database, Json } from '@/lib/supabase/database.types';

// Tipo para los items del carrito tal como se mostrarán, incluyendo detalles del producto
export type CartItemForDisplay = Tables<'items_carrito'> & {
  productos: Pick<Tables<'productos'>, 'id' | 'nombre' | 'precio'> & {
    imagenes_productos: Array<Pick<Tables<'imagenes_productos'>, 'url'>> | null; // Solo la URL de la imagen principal
  };
  subtotal: number;
  imagen_url: string; // URL de la imagen principal procesada
};

// Helper para crear el cliente de Supabase en Server Actions
function createSupabaseServerClientAction() {
  const cookieStore = cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[SupabaseServerClientAction - Cart] CRITICAL ERROR: Supabase URL or Anon Key is missing.");
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
            // Silently ignore
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.delete({ name, ...options });
          } catch (error) {
            // Silently ignore
          }
        },
      },
    }
  );
}

export async function getCartItemsAction(): Promise<CartItemForDisplay[]> {
  console.log('[getCartItemsAction] Attempting to fetch cart items.');
  const supabase = createSupabaseServerClientAction();
  if (!supabase) {
    console.error("[getCartItemsAction] Supabase client not initialized.");
    return [];
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('[getCartItemsAction] User not authenticated or error fetching user:', userError?.message);
    return [];
  }
  console.log('[getCartItemsAction] User ID:', user.id);

  try {
    // 1. Obtener el carrito del usuario
    const { data: cartData, error: cartError } = await supabase
      .from('carritos')
      .select('id')
      .eq('cliente_id', user.id)
      .maybeSingle(); // Un usuario debería tener un carrito, o ninguno si es nuevo

    if (cartError) {
      console.error('[getCartItemsAction] Error fetching cart:', cartError.message);
      return [];
    }

    if (!cartData) {
      console.log('[getCartItemsAction] No cart found for user:', user.id);
      return []; // Carrito vacío
    }
    console.log('[getCartItemsAction] Cart ID:', cartData.id);

    // 2. Obtener los items del carrito y los detalles del producto asociado
    const { data: itemsData, error: itemsError } = await supabase
      .from('items_carrito')
      .select(`
        *,
        productos (
          id,
          nombre,
          precio,
          imagenes_productos (
            url,
            es_principal
          )
        )
      `)
      .eq('carrito_id', cartData.id)
      .order('productos(nombre)', { ascending: true });

    if (itemsError) {
      console.error('[getCartItemsAction] Error fetching cart items:', itemsError.message);
      return [];
    }

    if (!itemsData) {
      console.log('[getCartItemsAction] No items found in cart:', cartData.id);
      return [];
    }
    console.log(`[getCartItemsAction] Fetched ${itemsData.length} cart items.`);

    const cartItemsForDisplay: CartItemForDisplay[] = itemsData.map(item => {
      const producto = item.productos as CartItemForDisplay['productos'] | null; // Type assertion
      if (!producto) {
        // Esto no debería suceder si el JOIN es INNER o si hay FK constraints
        console.warn(`[getCartItemsAction] Product details missing for item with producto_id: ${item.producto_id}`);
        // Devolver un item con datos mínimos para no romper el map, o filtrarlo
        return {
          ...item,
          productos: { id: item.producto_id, nombre: 'Producto no disponible', precio: 0, imagenes_productos: [] },
          subtotal: 0,
          imagen_url: 'https://placehold.co/100x100.png?text=Error',
        };
      }
      
      const principalImage = producto.imagenes_productos?.find(img => img.es_principal === true);
      const anyImage = producto.imagenes_productos?.[0];
      const placeholderText = encodeURIComponent(producto.nombre);
      const imageUrl = principalImage?.url || anyImage?.url || \`https://placehold.co/100x100.png?text=\${placeholderText}\`;
      
      const subtotal = (producto.precio || 0) * item.cantidad;

      return {
        ...item,
        productos: producto, // Ya tiene el tipo correcto con la aserción
        subtotal: subtotal,
        imagen_url: imageUrl,
      };
    });
    console.log('[getCartItemsAction] Processed cart items for display:', cartItemsForDisplay.length);
    return cartItemsForDisplay;

  } catch (e: any) {
    console.error("[getCartItemsAction] Critical error in action:", e.message);
    return [];
  }
}
    
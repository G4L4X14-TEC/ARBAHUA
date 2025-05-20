
'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Tables, Database, Json, TablesInsert, TablesUpdate } from '@/lib/supabase/database.types';

// Tipo para los items del carrito tal como se mostrarán, incluyendo detalles del producto
export type CartItemForDisplay = Tables<'items_carrito'> & {
  productos: Pick<Tables<'productos'>, 'id' | 'nombre' | 'precio'> & {
    // Aseguramos que el tipo para imagenes_productos incluya es_principal
    imagenes_productos: Array<Pick<Tables<'imagenes_productos'>, 'url' | 'es_principal'>> | null; 
  };
  subtotal: number;
  imagen_url: string; 
};

// Helper para crear el cliente de Supabase en Server Actions
function createSupabaseServerClientAction() {
  const cookieStore = cookies(); // Llamar a cookies() una vez y de forma síncrona
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // console.log('[SupabaseServerClientAction - Cart] Initializing Supabase client.');
  // console.log(`  NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? 'SET' : 'NOT SET'}`);
  // console.log(`  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'SET' : 'NOT SET'}`);

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
          // El try...catch puede ser omitido aquí si la documentación de @supabase/ssr no lo requiere
          // o si Next.js maneja esto de forma diferente en Server Actions.
          // Lo mantendremos por ahora, pero si causa problemas se puede quitar.
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Silently ignore (e.g. if called from a static generation context)
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.delete({ name, ...options }); // Usar delete en lugar de set con valor vacío
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
  const supabase = createSupabaseServerClientAction(); // Llamada síncrona
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
    const { data: cartData, error: cartError } = await supabase
      .from('carritos')
      .select('id')
      .eq('cliente_id', user.id)
      .maybeSingle();

    if (cartError) {
      console.error('[getCartItemsAction] Error fetching cart:', cartError.message);
      return [];
    }

    if (!cartData) {
      console.log('[getCartItemsAction] No cart found for user:', user.id, "Returning empty cart.");
      return []; 
    }
    console.log('[getCartItemsAction] Cart ID:', cartData.id);

    const { data: itemsData, error: itemsError } = await supabase
      .from('items_carrito')
      .select(\`
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
      \`)
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
    console.log(\`[getCartItemsAction] Fetched \${itemsData.length} cart items.\`);

    const cartItemsForDisplay: CartItemForDisplay[] = itemsData.map(item => {
      // Ajuste de tipado para 'productos' y 'imagenes_productos'
      const producto = item.productos as (Pick<Tables<'productos'>, 'id' | 'nombre' | 'precio'> & {
        imagenes_productos: Array<Pick<Tables<'imagenes_productos'>, 'url' | 'es_principal'>> | null;
      }) | null;
      
      if (!producto) {
        console.warn(\`[getCartItemsAction] Product details missing for item with producto_id: \${item.producto_id}\`);
        return {
          ...item,
          productos: { id: item.producto_id, nombre: 'Producto no disponible', precio: 0, imagenes_productos: [] },
          subtotal: 0,
          imagen_url: 'https://placehold.co/100x100.png?text=Error',
        };
      }
      
      const principalImageArray = producto.imagenes_productos?.filter(img => img.es_principal === true);
      const principalImage = principalImageArray?.[0];
      const anyImage = producto.imagenes_productos?.[0];
      const placeholderText = encodeURIComponent(producto.nombre);
      const imageUrl = principalImage?.url || anyImage?.url || \`https://placehold.co/100x100.png?text=\${placeholderText}\`;
      
      const subtotal = (producto.precio || 0) * item.cantidad;

      return {
        ...item,
        productos: producto, // producto ya tiene el tipo correcto aquí
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

export async function addProductToCartAction(
  productId: string, 
  quantityToAdd: number = 1
): Promise<{ success: boolean; message: string }> {
  console.log('[addProductToCartAction] Called with productId:', productId, "quantityToAdd:", quantityToAdd);
  const supabase = createSupabaseServerClientAction(); // Llamada síncrona
  if (!supabase) {
    return { success: false, message: "Error de conexión con el servidor." };
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('[addProductToCartAction] User not authenticated.');
    return { success: false, message: "Debes iniciar sesión para añadir productos al carrito." };
  }
  console.log('[addProductToCartAction] User ID:', user.id);

  try {
    // 1. Encontrar o crear el carrito del usuario
    let { data: cart, error: cartError } = await supabase
      .from('carritos')
      .select('id')
      .eq('cliente_id', user.id)
      .maybeSingle();

    if (cartError) {
      console.error('[addProductToCartAction] Error fetching cart:', cartError.message);
      return { success: false, message: \`Error al obtener el carrito: \${cartError.message}\` };
    }

    if (!cart) {
      console.log('[addProductToCartAction] No cart found for user, creating one...');
      const { data: newCart, error: newCartError } = await supabase
        .from('carritos')
        .insert({ cliente_id: user.id })
        .select('id')
        .single();
      
      if (newCartError || !newCart) {
        console.error('[addProductToCartAction] Error creating new cart:', newCartError?.message);
        return { success: false, message: \`Error al crear el carrito: \${newCartError?.message || 'Error desconocido'}\` };
      }
      cart = newCart;
      console.log('[addProductToCartAction] New cart created with ID:', cart.id);
    } else {
      console.log('[addProductToCartAction] Existing cart found with ID:', cart.id);
    }

    const carritoId = cart.id;

    // 2. Verificar si el producto ya está en el carrito
    const { data: existingItem, error: existingItemError } = await supabase
      .from('items_carrito')
      .select('*')
      .eq('carrito_id', carritoId)
      .eq('producto_id', productId)
      .maybeSingle();

    if (existingItemError) {
      console.error('[addProductToCartAction] Error checking for existing item:', existingItemError.message);
      return { success: false, message: \`Error al verificar el producto en el carrito: \${existingItemError.message}\` };
    }

    if (existingItem) {
      // Producto ya existe, actualizar cantidad
      console.log('[addProductToCartAction] Product exists in cart. Current quantity:', existingItem.cantidad, "Adding:", quantityToAdd);
      const newQuantity = existingItem.cantidad + quantityToAdd;
      const { error: updateError } = await supabase
        .from('items_carrito')
        .update({ cantidad: newQuantity })
        .eq('carrito_id', carritoId)
        .eq('producto_id', productId);
      
      if (updateError) {
        console.error('[addProductToCartAction] Error updating item quantity:', updateError.message);
        return { success: false, message: \`Error al actualizar la cantidad: \${updateError.message}\` };
      }
      console.log('[addProductToCartAction] Item quantity updated to:', newQuantity);
    } else {
      // Producto no existe, insertar nuevo item
      console.log('[addProductToCartAction] Product not in cart, inserting new item with quantity:', quantityToAdd);
      const { error: insertError } = await supabase
        .from('items_carrito')
        .insert({ carrito_id: carritoId, producto_id: productId, cantidad: quantityToAdd });

      if (insertError) {
        console.error('[addProductToCartAction] Error inserting new item:', insertError.message);
        return { success: false, message: \`Error al añadir el producto: \${insertError.message}\` };
      }
      console.log('[addProductToCartAction] New item inserted successfully.');
    }

    return { success: true, message: 'Producto añadido al carrito exitosamente.' };

  } catch (e: any) {
    console.error("[addProductToCartAction] Critical error:", e.message);
    return { success: false, message: \`Error inesperado: \${e.message}\` };
  }
}

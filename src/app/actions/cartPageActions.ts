
'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Tables, Database, Json, TablesInsert, TablesUpdate } from '@/lib/supabase/database.types';

// Tipo para los items del carrito tal como se mostrarán, incluyendo detalles del producto
export type CartItemForDisplay = Tables<'items_carrito'> & {
  productos: Pick<Tables<'productos'>, 'id' | 'nombre' | 'precio'> & {
    imagenes_productos: Array<Pick<Tables<'imagenes_productos'>, 'url' | 'es_principal'>> | null; 
  };
  subtotal: number;
  imagen_url: string; 
};

// Helper para crear el cliente de Supabase en Server Actions
async function createSupabaseServerClientAction() {
  const cookieStore = await cookies(); // Usamos await aquí
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
          // Server Actions pueden mutar cookies directamente
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          // Server Actions pueden mutar cookies directamente
          cookieStore.delete({ name, ...options });
        },
      },
    }
  );
}

export async function getCartItemsAction(): Promise<CartItemForDisplay[]> {
  console.log('[getCartItemsAction] Attempting to fetch cart items.');
  const supabase = await createSupabaseServerClientAction();
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
      const producto = item.productos as (Pick<Tables<'productos'>, 'id' | 'nombre' | 'precio'> & {
        imagenes_productos: Array<Pick<Tables<'imagenes_productos'>, 'url' | 'es_principal'>> | null;
      }) | null;
      
      if (!producto) {
        console.warn(`[getCartItemsAction] Product details missing for item with producto_id: ${item.producto_id}`);
        // Proporcionar valores por defecto para evitar errores de renderizado si producto es null
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
      const imageUrl = principalImage?.url || anyImage?.url || `https://placehold.co/100x100.png?text=${placeholderText}`;
      
      const subtotal = (producto.precio || 0) * item.cantidad;

      return {
        ...item,
        productos: producto, // producto ya tiene la estructura correcta
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
  const supabase = await createSupabaseServerClientAction();
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
    let { data: cart, error: cartError } = await supabase
      .from('carritos')
      .select('id')
      .eq('cliente_id', user.id)
      .maybeSingle();

    if (cartError) {
      console.error('[addProductToCartAction] Error fetching cart:', cartError.message);
      return { success: false, message: `Error al obtener el carrito: ${cartError.message}` };
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
        return { success: false, message: `Error al crear el carrito: ${newCartError?.message || 'Error desconocido'}` };
      }
      cart = newCart;
      console.log('[addProductToCartAction] New cart created with ID:', cart.id);
    } else {
      console.log('[addProductToCartAction] Existing cart found with ID:', cart.id);
    }

    const carritoId = cart.id;

    const { data: existingItem, error: existingItemError } = await supabase
      .from('items_carrito')
      .select('*')
      .eq('carrito_id', carritoId)
      .eq('producto_id', productId)
      .maybeSingle();

    if (existingItemError) {
      console.error('[addProductToCartAction] Error checking for existing item:', existingItemError.message);
      return { success: false, message: `Error al verificar el producto en el carrito: ${existingItemError.message}` };
    }

    if (existingItem) {
      console.log('[addProductToCartAction] Product exists in cart. Current quantity:', existingItem.cantidad, "Adding:", quantityToAdd);
      const newQuantity = existingItem.cantidad + quantityToAdd;
      const { error: updateError } = await supabase
        .from('items_carrito')
        .update({ cantidad: newQuantity })
        .eq('carrito_id', carritoId)
        .eq('producto_id', productId);
      
      if (updateError) {
        console.error('[addProductToCartAction] Error updating item quantity:', updateError.message);
        return { success: false, message: `Error al actualizar la cantidad: ${updateError.message}` };
      }
      console.log('[addProductToCartAction] Item quantity updated to:', newQuantity);
    } else {
      console.log('[addProductToCartAction] Product not in cart, inserting new item with quantity:', quantityToAdd);
      const { error: insertError } = await supabase
        .from('items_carrito')
        .insert({ carrito_id: carritoId, producto_id: productId, cantidad: quantityToAdd });

      if (insertError) {
        console.error('[addProductToCartAction] Error inserting new item:', insertError.message);
        return { success: false, message: `Error al añadir el producto: ${insertError.message}` };
      }
      console.log('[addProductToCartAction] New item inserted successfully.');
    }

    return { success: true, message: 'Producto añadido al carrito exitosamente.' };

  } catch (e: any) {
    console.error("[addProductToCartAction] Critical error:", e.message);
    return { success: false, message: `Error inesperado: ${e.message}` };
  }
}

export async function updateCartItemQuantityAction(
  productId: string,
  newQuantity: number
): Promise<{ success: boolean; message: string }> {
  console.log('[updateCartItemQuantityAction] Called with productId:', productId, "newQuantity:", newQuantity);
  const supabase = await createSupabaseServerClientAction();
  if (!supabase) {
    return { success: false, message: "Error de conexión con el servidor." };
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('[updateCartItemQuantityAction] User not authenticated.');
    return { success: false, message: "Debes iniciar sesión para modificar tu carrito." };
  }

  try {
    const { data: cart, error: cartError } = await supabase
      .from('carritos')
      .select('id')
      .eq('cliente_id', user.id)
      .maybeSingle();

    if (cartError || !cart) {
      console.error('[updateCartItemQuantityAction] Cart not found for user or error fetching cart:', cartError?.message);
      return { success: false, message: "No se encontró tu carrito." };
    }
    const carritoId = cart.id;

    if (newQuantity <= 0) {
      // Si la nueva cantidad es 0 o menos, eliminamos el producto
      return await removeProductFromCartAction(productId);
    }

    const { error: updateError } = await supabase
      .from('items_carrito')
      .update({ cantidad: newQuantity })
      .eq('carrito_id', carritoId)
      .eq('producto_id', productId);

    if (updateError) {
      console.error('[updateCartItemQuantityAction] Error updating item quantity:', updateError.message);
      return { success: false, message: `Error al actualizar la cantidad: ${updateError.message}` };
    }
    
    console.log('[updateCartItemQuantityAction] Item quantity updated for productId:', productId, 'to newQuantity:', newQuantity);
    return { success: true, message: 'Cantidad actualizada exitosamente.' };

  } catch (e: any) {
    console.error("[updateCartItemQuantityAction] Critical error:", e.message);
    return { success: false, message: `Error inesperado: ${e.message}` };
  }
}

export async function removeProductFromCartAction(
  productId: string
): Promise<{ success: boolean; message: string }> {
  console.log('[removeProductFromCartAction] Called with productId:', productId);
  const supabase = await createSupabaseServerClientAction();
  if (!supabase) {
    return { success: false, message: "Error de conexión con el servidor." };
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('[removeProductFromCartAction] User not authenticated.');
    return { success: false, message: "Debes iniciar sesión para modificar tu carrito." };
  }

  try {
    const { data: cart, error: cartError } = await supabase
      .from('carritos')
      .select('id')
      .eq('cliente_id', user.id)
      .maybeSingle();

    if (cartError || !cart) {
      console.error('[removeProductFromCartAction] Cart not found for user or error fetching cart:', cartError?.message);
      return { success: false, message: "No se encontró tu carrito." };
    }
    const carritoId = cart.id;

    const { error: deleteError } = await supabase
      .from('items_carrito')
      .delete()
      .eq('carrito_id', carritoId)
      .eq('producto_id', productId);

    if (deleteError) {
      console.error('[removeProductFromCartAction] Error deleting item from cart:', deleteError.message);
      return { success: false, message: `Error al eliminar el producto: ${deleteError.message}` };
    }

    console.log('[removeProductFromCartAction] Product removed successfully from cart for productId:', productId);
    return { success: true, message: 'Producto eliminado del carrito exitosamente.' };

  } catch (e: any) {
    console.error("[removeProductFromCartAction] Critical error:", e.message);
    return { success: false, message: `Error inesperado: ${e.message}` };
  }
}

export async function clearCartAction(): Promise<{ success: boolean; message: string }> {
  console.log('[clearCartAction] Attempting to clear cart items.');
  const supabase = await createSupabaseServerClientAction();
  if (!supabase) {
    return { success: false, message: "Error de conexión con el servidor." };
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('[clearCartAction] User not authenticated.');
    return { success: false, message: "Debes iniciar sesión para limpiar tu carrito." };
  }
  console.log('[clearCartAction] User ID:', user.id);

  try {
    const { data: cartData, error: cartError } = await supabase
      .from('carritos')
      .select('id')
      .eq('cliente_id', user.id)
      .maybeSingle();

    if (cartError) {
      console.error('[clearCartAction] Error fetching cart for user:', cartError.message);
      return { success: false, message: "Error al encontrar tu carrito." };
    }

    if (!cartData) {
      console.log('[clearCartAction] No cart found for user, nothing to clear.');
      return { success: true, message: "El carrito ya estaba vacío." };
    }
    const carritoId = cartData.id;
    console.log('[clearCartAction] Cart ID to clear items from:', carritoId);

    const { error: deleteItemsError } = await supabase
      .from('items_carrito')
      .delete()
      .eq('carrito_id', carritoId);

    if (deleteItemsError) {
      console.error('[clearCartAction] Error deleting items from cart:', deleteItemsError.message);
      return { success: false, message: `Error al limpiar los productos del carrito: ${deleteItemsError.message}` };
    }

    console.log('[clearCartAction] Cart items cleared successfully for cart ID:', carritoId);
    return { success: true, message: "Carrito limpiado exitosamente." };

  } catch (e: any) {
    console.error("[clearCartAction] Critical error in action:", e.message);
    return { success: false, message: `Error inesperado al limpiar el carrito: ${e.message}` };
  }
}

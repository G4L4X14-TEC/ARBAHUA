'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Tables, Database, Json, TablesUpdate, TablesInsert } from '@/lib/supabase/database.types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ShippingFormValues } from '@/app/checkout/page'; // Asegúrate que esto se exporte de checkout/page.tsx

export type UserOrderForDisplay = Pick<Tables<'pedidos'>, 'id' | 'total' | 'estado' | 'fecha_pedido'> & {
  formatted_date: string;
  items_summary: string; 
};

// Helper para crear el cliente de Supabase en Server Actions
async function createSupabaseServerClientAction() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[SupabaseServerClientAction - UserProfile] CRITICAL ERROR: Supabase URL or Anon Key is missing.");
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
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete({ name, ...options });
        },
      },
    }
  );
}

export async function getUserOrdersAction(): Promise<UserOrderForDisplay[]> {
  console.log('[getUserOrdersAction] Attempting to fetch user orders.');
  const supabase = await createSupabaseServerClientAction();
  if (!supabase) {
    console.error("[getUserOrdersAction] Supabase client not initialized.");
    return [];
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('[getUserOrdersAction] User not authenticated or error fetching user:', userError?.message);
    return [];
  }
  console.log('[getUserOrdersAction] Fetching orders for User ID:', user.id);

  try {
    const { data: ordersData, error: ordersError } = await supabase
      .from('pedidos')
      .select('id, total, estado, fecha_pedido, detalle_pedido(cantidad, precio, productos(nombre))')
      .eq('cliente_id', user.id)
      .order('fecha_pedido', { ascending: false });

    if (ordersError) {
      console.error('[getUserOrdersAction] Error fetching orders:', ordersError.message);
      return []; 
    }

    if (!ordersData) {
      console.log('[getUserOrdersAction] No orders found for user:', user.id);
      return [];
    }

    console.log(`[getUserOrdersAction] Fetched ${ordersData.length} orders.`);

    const displayedOrders: UserOrderForDisplay[] = ordersData.map(order => {
      let itemsSummary = 'Múltiples productos';
      const detalleArray = Array.isArray(order.detalle_pedido) ? order.detalle_pedido : [];

      if (detalleArray.length > 0) {
        const firstDetailItem = detalleArray[0] as unknown as { productos: { nombre: string } | null, cantidad: number }; 
        if (firstDetailItem && firstDetailItem.productos) {
          itemsSummary = `${firstDetailItem.productos.nombre}${detalleArray.length > 1 ? ' y más...' : ''}`;
        } else {
          itemsSummary = 'Detalles del producto no disponibles';
        }
      } else {
        itemsSummary = 'Sin productos en este pedido.';
      }

      return {
        id: order.id,
        total: order.total,
        estado: order.estado,
        fecha_pedido: order.fecha_pedido,
        formatted_date: order.fecha_pedido ? format(new Date(order.fecha_pedido), "dd 'de' MMMM 'de' yyyy", { locale: es }) : 'Fecha no disponible',
        items_summary: itemsSummary,
      };
    });

    console.log('[getUserOrdersAction] Processed orders for display:', displayedOrders.length);
    return displayedOrders;

  } catch (e: any) {
    console.error("[getUserOrdersAction] Critical error in action:", e.message);
    return []; 
  }
}

export async function getUserAddressesAction(): Promise<Tables<'direcciones'>[]> {
  console.log('[getUserAddressesAction] Attempting to fetch user addresses.');
  const supabase = await createSupabaseServerClientAction();
  if (!supabase) {
    console.error("[getUserAddressesAction] Supabase client not initialized.");
    return [];
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('[getUserAddressesAction] User not authenticated or error fetching user:', userError?.message);
    return [];
  }
  console.log('[getUserAddressesAction] Fetching addresses for User ID:', user.id);

  try {
    const { data: addressesData, error: addressesError } = await supabase
      .from('direcciones')
      .select('*')
      .eq('cliente_id', user.id)
      .order('calle', { ascending: true }); 

    if (addressesError) {
      console.error('[getUserAddressesAction] Error fetching addresses:', addressesError.message);
      return [];
    }

    if (!addressesData) {
      console.log('[getUserAddressesAction] No addresses found for user:', user.id);
      return [];
    }

    console.log(`[getUserAddressesAction] Fetched ${addressesData.length} addresses.`);
    return addressesData;

  } catch (e: any) {
    console.error("[getUserAddressesAction] Critical error in action:", e.message);
    return [];
  }
}

export async function updateUserAddressAction(
  addressId: string,
  addressData: ShippingFormValues 
): Promise<{ success: boolean; message: string }> {
  console.log('[updateUserAddressAction] Attempting to update address ID:', addressId, 'with data:', addressData);
  const supabase = await createSupabaseServerClientAction();
  if (!supabase) {
    return { success: false, message: "Error de conexión con el servidor." };
  }

  const { data: { user }, error: userAuthError } = await supabase.auth.getUser();
  if (userAuthError || !user) {
    console.error('[updateUserAddressAction] User not authenticated.');
    return { success: false, message: "Debes iniciar sesión para actualizar una dirección." };
  }

  // Mapeo de ShippingFormValues a TablesUpdate<'direcciones'>
  const updatePayload: TablesUpdate<'direcciones'> = {
    calle: addressData.direccion,
    ciudad: addressData.ciudad,
    estado: addressData.estado, 
    codigo_postal: addressData.codigoPostal,
    pais: addressData.pais,
    // Asumiendo que tu tabla `direcciones` tiene estas columnas y tu `ShippingFormValues` también
    nombre_completo_destinatario: addressData.nombreCompleto, 
    telefono_contacto: addressData.telefono, 
  };

  try {
    const { error } = await supabase
      .from('direcciones')
      .update(updatePayload)
      .eq('id', addressId)
      .eq('cliente_id', user.id); // Importante: asegurar que el usuario solo actualice sus propias direcciones

    if (error) {
      console.error('[updateUserAddressAction] Error updating address:', error.message);
      return { success: false, message: `Error al actualizar la dirección: ${error.message}` };
    }

    console.log('[updateUserAddressAction] Address updated successfully for ID:', addressId);
    return { success: true, message: 'Dirección actualizada correctamente.' };
  } catch (e: any) {
    console.error('[updateUserAddressAction] Critical error:', e.message);
    return { success: false, message: `Error inesperado al actualizar la dirección: ${e.message}` };
  }
}

export async function deleteUserAddressAction(
  addressId: string
): Promise<{ success: boolean; message: string }> {
  console.log('[deleteUserAddressAction] Attempting to delete address ID:', addressId);
  const supabase = await createSupabaseServerClientAction();
  if (!supabase) {
    return { success: false, message: "Error de conexión con el servidor." };
  }

  const { data: { user }, error: userAuthError } = await supabase.auth.getUser();
  if (userAuthError || !user) {
    console.error('[deleteUserAddressAction] User not authenticated.');
    return { success: false, message: "Debes iniciar sesión para eliminar una dirección." };
  }

  try {
    const { error } = await supabase
      .from('direcciones')
      .delete()
      .eq('id', addressId)
      .eq('cliente_id', user.id); // Importante: asegurar que el usuario solo elimine sus propias direcciones

    if (error) {
      console.error('[deleteUserAddressAction] Error deleting address:', error.message);
      return { success: false, message: `Error al eliminar la dirección: ${error.message}` };
    }

    console.log('[deleteUserAddressAction] Address deleted successfully for ID:', addressId);
    return { success: true, message: 'Dirección eliminada correctamente.' };
  } catch (e: any) {
    console.error("[deleteUserAddressAction] Critical error:", e.message);
    return { success: false, message: `Error inesperado al eliminar la dirección: ${e.message}` };
  }
}

export async function updateUserProfileActions( // Removed duplicate declaration
  profileData: { nombre?: string } // Changed type to string | undefined
): Promise<{ success: boolean; message: string }> {
  console.log('[updateUserProfileActions] Attempting to update user profile with data:', profileData);
  const supabase = await createSupabaseServerClientAction();
  if (!supabase) {
    return { success: false, message: "Error de conexión con el servidor." };
  }

  const { data: { user }, error: userAuthError } = await supabase.auth.getUser();
  if (userAuthError || !user) {
    console.error('[updateUserProfileActions] User not authenticated.');
    return { success: false, message: "Debes iniciar sesión para actualizar tu perfil." };
  }

  try {
    const { error } = await supabase
      .from('usuarios') // Ensure 'usuarios' table is being updated
      // Pass only the defined properties. If nombre is undefined, it won't be included in the update payload,
      // which is the correct behavior for optional fields.
      .update(profileData)
      .eq('id', user.id); // Asegurar que el usuario solo actualice su propio perfil

    if (error) {
      console.error('[updateUserProfileActions] Error updating profile:', error.message);
      return { success: false, message: `Error al actualizar el perfil: ${error.message}` };
    }
    console.log('[updateUserProfileActions] Profile updated successfully for User ID:', user.id);
    return { success: true, message: 'Perfil actualizado correctamente.' };
  } catch (e: any) {
    console.error('[updateUserProfileActions] Critical error:', e.message);
    return { success: false, message: `Error inesperado al actualizar el perfil: ${e.message}` };
  }
}

export async function changeUserPasswordActions(
  passwords: { currentPassword?: string, newPassword: string }
): Promise<{ success: boolean; message: string }> {
  console.log('[changeUserPasswordActions] Attempting to change user password.');
  const supabase = await createSupabaseServerClientAction();
  if (!supabase) {
    return { success: false, message: "Error de conexión con el servidor." };
  }

  const { data: { user }, error: userAuthError } = await supabase.auth.getUser();
  if (userAuthError || !user) {
    console.error('[changeUserPasswordActions] User not authenticated.');
    return { success: false, message: "Debes iniciar sesión para cambiar tu contraseña." };
  }

  try {
    // Supabase's updateUser handles the password change for the authenticated user.
    // It implicitly checks the current authentication state.
    const { error } = await supabase.auth.updateUser({ password: passwords.newPassword });

    if (error) {
      console.error('[changeUserPasswordActions] Error changing password:', error.message);
      // Supabase often provides a specific error message if the old password is required/incorrect
      return { success: false, message: `Error al cambiar la contraseña: ${error.message}` };
    }

    console.log('[changeUserPasswordActions] Password changed successfully for User ID:', user.id);
    // Note: Password changes might invalidate existing sessions depending on Supabase settings.
    return { success: true, message: 'Contraseña actualizada correctamente. Por favor, vuelve a iniciar sesión si se cierra tu sesión.' };
  } catch (e: any) {
    console.error('[changeUserPasswordActions] Critical error:', e.message);
    return { success: false, message: `Error inesperado al cambiar la contraseña: ${e.message}` };
  }
}
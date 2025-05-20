
'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Tables, Database, Json } from '@/lib/supabase/database.types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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
      .select(\`
        id,
        total,
        estado,
        fecha_pedido,
        detalle_pedido (
          cantidad,
          precio,
          productos (
            nombre
          )
        )
      \`)
      .eq('cliente_id', user.id)
      .order('fecha_pedido', { ascending: false });

    if (ordersError) {
      console.error('[getUserOrdersAction] Error fetching orders:', ordersError.message);
      throw ordersError; // Opcional: relanzar para que el llamador maneje o simplemente retornar []
    }

    if (!ordersData) {
      console.log('[getUserOrdersAction] No orders found for user:', user.id);
      return [];
    }

    console.log(\`[getUserOrdersAction] Fetched \${ordersData.length} orders.\`);

    const displayedOrders: UserOrderForDisplay[] = ordersData.map(order => {
      let itemsSummary = 'Múltiples productos';
      const detalleArray = Array.isArray(order.detalle_pedido) ? order.detalle_pedido : [];

      if (detalleArray.length > 0) {
        const firstDetailItem = detalleArray[0] as unknown as { productos: { nombre: string } | null, cantidad: number }; 
        if (firstDetailItem && firstDetailItem.productos) {
          itemsSummary = \`\${firstDetailItem.productos.nombre}\${detalleArray.length > 1 ? ' y más...' : ''}\`;
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
      .order('calle', { ascending: true }); // O cualquier otro orden que prefieras

    if (addressesError) {
      console.error('[getUserAddressesAction] Error fetching addresses:', addressesError.message);
      return [];
    }

    if (!addressesData) {
      console.log('[getUserAddressesAction] No addresses found for user:', user.id);
      return [];
    }

    console.log(\`[getUserAddressesAction] Fetched \${addressesData.length} addresses.\`);
    return addressesData;

  } catch (e: any) {
    console.error("[getUserAddressesAction] Critical error in action:", e.message); // Corregido aquí
    return [];
  }
}

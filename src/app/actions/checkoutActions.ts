'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Tables, Database, Json, TablesInsert } from '@/lib/supabase/database.types';
import type { ShippingFormValues } from '@/app/checkout/page'; // Asumiendo que exportas este tipo
import Stripe from 'stripe';
import { getCartItemsAction, type CartItemForDisplay } from './cartPageActions';

// Helper para crear el cliente de Supabase en Server Actions
function createSupabaseServerClientAction() {
  const cookieStore = cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // console.log('[SupabaseServerClientAction - Checkout] Initializing Supabase client.');
  // console.log(`  NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? 'SET' : 'NOT SET'}`);
  // console.log(`  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'SET' : 'NOT SET'}`);


  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[SupabaseServerClientAction - Checkout] CRITICAL ERROR: Supabase URL or Anon Key is missing.");
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

export async function saveShippingAddressAction(
  addressData: ShippingFormValues
): Promise<{ success: boolean; addressId?: string; message: string }> {
  console.log('[saveShippingAddressAction] Attempting to save shipping address:', addressData);
  const supabase = createSupabaseServerClientAction();
  if (!supabase) {
    return { success: false, message: "Error de conexión con el servidor." };
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('[saveShippingAddressAction] User not authenticated.');
    return { success: false, message: "Debes iniciar sesión para guardar una dirección." };
  }
  console.log('[saveShippingAddressAction] User ID:', user.id);

  const normalizedAddressData = {
    calle: addressData.direccion.trim(),
    ciudad: addressData.ciudad.trim(),
    estado: addressData.estado.trim(), 
    codigo_postal: addressData.codigoPostal.trim(),
    pais: addressData.pais.trim(),
    // Si has añadido nombre_completo_destinatario y telefono_contacto a tu tabla 'direcciones':
    // nombre_completo_destinatario: addressData.nombreCompleto.trim(),
    // telefono_contacto: addressData.telefono.trim(),
  };

  try {
    console.log('[saveShippingAddressAction] Checking for existing identical address for user:', user.id);
    const { data: existingAddress, error: selectError } = await supabase
      .from('direcciones')
      .select('id')
      .eq('cliente_id', user.id)
      .eq('calle', normalizedAddressData.calle)
      .eq('ciudad', normalizedAddressData.ciudad)
      .eq('estado', normalizedAddressData.estado)
      .eq('codigo_postal', normalizedAddressData.codigo_postal)
      .eq('pais', normalizedAddressData.pais)
      .maybeSingle();

    if (selectError) {
      console.error('[saveShippingAddressAction] Error checking for existing address:', selectError.message);
      return { success: false, message: `Error al verificar la dirección: ${selectError.message}` };
    }

    if (existingAddress) {
      console.log('[saveShippingAddressAction] Identical address already exists for user:', user.id, 'Address ID:', existingAddress.id);
      return { success: true, addressId: existingAddress.id, message: 'Se utilizará una dirección de envío existente idéntica.' };
    }

    console.log('[saveShippingAddressAction] No identical address found, inserting new address for user:', user.id);
    const insertPayload: TablesInsert<'direcciones'> = {
      cliente_id: user.id,
      ...normalizedAddressData,
    };
    
    const { data: newAddress, error: insertError } = await supabase
      .from('direcciones')
      .insert(insertPayload)
      .select('id')
      .single();

    if (insertError) {
      console.error('[saveShippingAddressAction] Error inserting address:', insertError.message);
      return { success: false, message: `Error al guardar la dirección: ${insertError.message}` };
    }

    if (!newAddress || !newAddress.id) {
      console.error('[saveShippingAddressAction] No data or addressId returned after insert.');
      return { success: false, message: 'No se pudo obtener el ID de la dirección guardada.' };
    }

    console.log('[saveShippingAddressAction] Address saved successfully with ID:', newAddress.id);
    return { success: true, addressId: newAddress.id, message: 'Dirección de envío guardada correctamente.' };

  } catch (e: any) {
    console.error("[saveShippingAddressAction] Critical error in action:", e.message);
    return { success: false, message: `Error inesperado al guardar la dirección: ${e.message}` };
  }
}

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })
  : null;

export async function createPaymentIntentAction(): Promise<{
  success: boolean;
  clientSecret?: string;
  error?: string;
  amount?: number; 
}> {
  console.log('[createPaymentIntentAction] Attempting to create Payment Intent.');
  if (!stripe) {
    console.error('[createPaymentIntentAction] CRITICAL: Stripe no está inicializado. STRIPE_SECRET_KEY podría faltar.');
    return { success: false, error: 'Error de configuración del servidor de pagos.' };
  }

  const supabase = createSupabaseServerClientAction();
  if (!supabase) {
    return { success: false, error: "Error de conexión con el servidor de base de datos." };
  }

  const { data: { user }, error: userAuthError } = await supabase.auth.getUser();
  if (userAuthError || !user) {
    console.error('[createPaymentIntentAction] User not authenticated.');
    return { success: false, error: "Usuario no autenticado." };
  }

  const cartItems = await getCartItemsAction();
  if (!cartItems || cartItems.length === 0) {
    console.log('[createPaymentIntentAction] Cart is empty or could not be fetched.');
    return { success: false, error: "Tu carrito está vacío o no se pudo cargar." };
  }

  const totalAmount = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  const amountInCents = Math.round(totalAmount * 100);

  if (amountInCents <= 0) {
     console.log(`[createPaymentIntentAction] Invalid total amount: ${totalAmount}`);
     return { success: false, error: "El monto total del carrito debe ser mayor a cero." };
  }
  console.log(`[createPaymentIntentAction] Calculated total amount in cents: ${amountInCents}`);
  
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'mxn', // O la moneda que uses
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: { userId: user.id },
    });
    console.log('[createPaymentIntentAction] Payment Intent created successfully:', paymentIntent.id);
    return { success: true, clientSecret: paymentIntent.client_secret!, amount: amountInCents };
  } catch (error: any) {
    console.error('[createPaymentIntentAction] Error creating Payment Intent:', error.message);
    return { success: false, error: error.message || 'No se pudo iniciar el proceso de pago.' };
  }
}

export async function createOrderAction(
  cartItems: CartItemForDisplay[],
  shippingAddressId: string,
  paymentIntentId: string,
  totalAmountInCents: number
): Promise<{ success: boolean; orderId?: string; message: string }> {
  console.log('[createOrderAction] Attempting to create order. PaymentIntentID:', paymentIntentId, 'AddressID:', shippingAddressId);
  const supabase = createSupabaseServerClientAction();
  if (!supabase) {
    return { success: false, message: "Error de conexión con el servidor de base de datos." };
  }

  const { data: { user }, error: userAuthError } = await supabase.auth.getUser();
  if (userAuthError || !user) {
    console.error('[createOrderAction] User not authenticated.');
    return { success: false, message: "Usuario no autenticado." };
  }
  console.log('[createOrderAction] User ID:', user.id);

  const totalAmountForOrder = totalAmountInCents / 100; // Convert back to main currency unit

  try {
    // 1. Crear el pedido en la tabla 'pedidos'
    console.log('[createOrderAction] Inserting into pedidos table...');
    const { data: newOrder, error: orderError } = await supabase
      .from('pedidos')
      .insert({
        cliente_id: user.id,
        direccion_id: shippingAddressId,
        total: totalAmountForOrder,
        estado: 'Pagado', // O el estado inicial que prefieras
      })
      .select('id')
      .single();

    if (orderError) {
      console.error('[createOrderAction] Error inserting into pedidos:', orderError.message);
      return { success: false, message: `Error al crear el pedido: ${orderError.message}` };
    }
    if (!newOrder || !newOrder.id) {
      console.error('[createOrderAction] Failed to get new order ID.');
      return { success: false, message: 'No se pudo obtener el ID del nuevo pedido.' };
    }
    const pedidoId = newOrder.id;
    console.log('[createOrderAction] Order created successfully with ID:', pedidoId);

    // 2. Crear los detalles del pedido en la tabla 'detalle_pedido'
    console.log(`[createOrderAction] Inserting ${cartItems.length} items into detalle_pedido for order ID: ${pedidoId}`);
    const detallePedidoItems: TablesInsert<'detalle_pedido'>[] = cartItems.map(item => ({
      pedido_id: pedidoId,
      producto_id: item.productos.id,
      cantidad: item.cantidad,
      precio: item.productos.precio, // Precio al momento de la compra
    }));

    const { error: detalleError } = await supabase
      .from('detalle_pedido')
      .insert(detallePedidoItems);

    if (detalleError) {
      console.error('[createOrderAction] Error inserting into detalle_pedido:', detalleError.message);
      // Considerar un rollback o manejo de compensación aquí si la creación de detalles falla.
      return { success: false, message: `Error al guardar los detalles del pedido: ${detalleError.message}` };
    }
    console.log('[createOrderAction] Detalle_pedido items inserted successfully.');

    // 3. (Opcional pero recomendado) Crear un registro en la tabla 'pagos'
    // Asumiendo que tienes una columna stripe_payment_intent_id en tu tabla pagos
    console.log('[createOrderAction] Inserting into pagos table...');
    const { error: pagoError } = await supabase
      .from('pagos')
      .insert({
        pedido_id: pedidoId,
        monto: totalAmountForOrder,
        metodo_pago: 'stripe', // O el método de pago que uses
        estado: 'Aprobado', // El pago de Stripe ya fue aprobado
        stripe_payment_intent_id: paymentIntentId, // Nueva columna
      });

    if (pagoError) {
      console.warn('[createOrderAction] Error inserting into pagos (non-critical):', pagoError.message);
      // Este error podría no ser crítico para el usuario si el pedido ya se creó, pero es bueno loguearlo.
    } else {
      console.log('[createOrderAction] Pago record inserted successfully.');
    }
    

    return { success: true, orderId: pedidoId, message: 'Pedido creado exitosamente.' };

  } catch (e: any) {
    console.error("[createOrderAction] Critical error:", e.message);
    return { success: false, message: `Error inesperado al crear el pedido: ${e.message}` };
  }
}
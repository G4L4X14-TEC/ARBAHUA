
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

  // Normalizar los datos de la dirección para que coincidan con las columnas de la BD
  // Asumiendo que tu tabla 'direcciones' tiene estas columnas:
  const normalizedAddressData = {
    calle: addressData.direccion.trim(), // 'direccion' del formulario a 'calle' en BD
    ciudad: addressData.ciudad.trim(),
    estado: addressData.estado.trim(),
    codigo_postal: addressData.codigoPostal.trim(), // 'codigoPostal' a 'codigo_postal'
    pais: addressData.pais.trim(),
    // Los campos nombreCompleto y telefono no están en el esquema original de 'direcciones'.
    // Si los añadiste, descomenta y ajusta los nombres de columna aquí.
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
      console.error('[saveShippingAddressAction] Error checking for existing address:', selectError);
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
      console.error('[saveShippingAddressAction] Error inserting address:', insertError);
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


// Nueva Server Action para crear Payment Intent
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10', // Usa la última versión de la API disponible
});

export async function createPaymentIntentAction(): Promise<{
  success: boolean;
  clientSecret?: string;
  error?: string;
  amount?: number; // Opcional: devolver el monto para confirmación en frontend
}> {
  console.log('[createPaymentIntentAction] Attempting to create Payment Intent.');
  const supabase = createSupabaseServerClientAction();
  if (!supabase) {
    return { success: false, error: "Error de conexión con el servidor de base de datos." };
  }

  const { data: { user }, error: userAuthError } = await supabase.auth.getUser();
  if (userAuthError || !user) {
    console.error('[createPaymentIntentAction] User not authenticated.');
    return { success: false, error: "Usuario no autenticado." };
  }

  const cartItems = await getCartItemsAction(); // Reutilizamos la acción para obtener los items y calcular el total
  if (!cartItems || cartItems.length === 0) { // Verificación adicional por si getCartItemsAction devuelve null o []
    console.log('[createPaymentIntentAction] Cart is empty or could not be fetched.');
    return { success: false, error: "Tu carrito está vacío o no se pudo cargar." };
  }

  const totalAmount = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  const amountInCents = Math.round(totalAmount * 100); // Stripe requiere el monto en centavos

  if (amountInCents <= 0) { // Stripe no permite montos de 0 o negativos para Payment Intents estándar.
     console.log(`[createPaymentIntentAction] Invalid total amount: ${totalAmount}`);
     return { success: false, error: "El monto total del carrito debe ser mayor a cero." };
  }
  console.log(`[createPaymentIntentAction] Calculated total amount in cents: ${amountInCents}`);


  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('[createPaymentIntentAction] CRITICAL: STRIPE_SECRET_KEY no está configurada.');
    return { success: false, error: 'Error de configuración del servidor de pagos.' };
  }
  
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'mxn', // O la moneda que uses
      automatic_payment_methods: {
        enabled: true,
      },
      // Podrías añadir metadata como el user.id o el cart_id si es útil
      metadata: { userId: user.id, /* cartId: cartItems[0]?.carrito_id */ }, // carrito_id puede no estar en CartItemForDisplay
    });
    console.log('[createPaymentIntentAction] Payment Intent created successfully:', paymentIntent.id);
    return { success: true, clientSecret: paymentIntent.client_secret!, amount: amountInCents };
  } catch (error: any) {
    console.error('[createPaymentIntentAction] Error creating Payment Intent:', error.message);
    return { success: false, error: error.message || 'No se pudo iniciar el proceso de pago.' };
  }
}

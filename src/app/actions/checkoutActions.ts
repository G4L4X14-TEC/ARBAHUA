
'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Tables, Database, Json, TablesInsert } from '@/lib/supabase/database.types';
import * as z from "zod";

// Esquema Zod para el formulario de envío (consistente con el de la página de checkout)
const shippingFormSchema = z.object({
  nombreCompleto: z.string().min(3, { message: "El nombre completo debe tener al menos 3 caracteres." }),
  direccion: z.string().min(5, { message: "La dirección debe tener al menos 5 caracteres." }),
  ciudad: z.string().min(2, { message: "La ciudad debe tener al menos 2 caracteres." }),
  estado: z.string().min(2, {message: "El estado debe tener al menos 2 caracteres."}),
  codigoPostal: z.string().regex(/^\d{5}$/, { message: "Debe ser un código postal mexicano válido de 5 dígitos." }),
  pais: z.string({ required_error: "Por favor, selecciona un país." }).min(1, "Por favor, selecciona un país."),
  telefono: z.string().regex(/^\d{10}$/, { message: "Debe ser un número de teléfono de 10 dígitos." }),
});
type ShippingFormValues = z.infer<typeof shippingFormSchema>;


// Helper para crear el cliente de Supabase en Server Actions
// Esta función es similar a la de cartPageActions.ts y homePageActions.ts
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
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete({ name, ...options });
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

  // Normalizar datos para comparación y guardado
  const normalizedAddressData = {
    calle: addressData.direccion.trim(),
    ciudad: addressData.ciudad.trim(),
    estado: addressData.estado.trim(), // Asegúrate que tu formulario tenga un campo 'estado'
    codigo_postal: addressData.codigoPostal.trim(),
    pais: addressData.pais.trim(),
    // Campos que dependen de que los hayas añadido a tu tabla 'direcciones'
    // nombre_completo_destinatario: addressData.nombreCompleto.trim(), 
    // telefono_contacto: addressData.telefono.trim(),
  };

  try {
    // 1. Verificar si ya existe una dirección idéntica para este usuario
    console.log('[saveShippingAddressAction] Checking for existing identical address for user:', user.id);
    const { data: existingAddress, error: selectError } = await supabase
      .from('direcciones')
      .select('id')
      .eq('cliente_id', user.id)
      .eq('calle', normalizedAddressData.calle)
      .eq('ciudad', normalizedAddressData.ciudad)
      .eq('estado', normalizedAddressData.estado) // Comparar también por estado
      .eq('codigo_postal', normalizedAddressData.codigo_postal)
      .eq('pais', normalizedAddressData.pais)
      // Si tienes nombre_completo_destinatario y telefono_contacto en la tabla, añádelos a la comparación:
      // .eq('nombre_completo_destinatario', normalizedAddressData.nombre_completo_destinatario)
      // .eq('telefono_contacto', normalizedAddressData.telefono_contacto)
      .maybeSingle();

    if (selectError) {
      console.error('[saveShippingAddressAction] Error checking for existing address:', selectError);
      return { success: false, message: `Error al verificar la dirección: ${selectError.message}` };
    }

    if (existingAddress) {
      console.log('[saveShippingAddressAction] Identical address already exists for user:', user.id, 'Address ID:', existingAddress.id);
      return { success: true, addressId: existingAddress.id, message: 'Se utilizará una dirección de envío existente idéntica.' };
    }

    // 2. Si no existe, insertar la nueva dirección
    console.log('[saveShippingAddressAction] No identical address found, inserting new address for user:', user.id);
    const insertPayload: TablesInsert<'direcciones'> = {
      cliente_id: user.id,
      calle: normalizedAddressData.calle,
      ciudad: normalizedAddressData.ciudad,
      estado: normalizedAddressData.estado,
      codigo_postal: normalizedAddressData.codigo_postal,
      pais: normalizedAddressData.pais,
      // Si tienes las columnas en la DB, añade aquí los campos del formulario que faltan:
      // nombre_completo_destinatario: addressData.nombreCompleto, 
      // telefono_contacto: addressData.telefono,
    };
    
    console.log('[saveShippingAddressAction] Payload for DB insert:', insertPayload);

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

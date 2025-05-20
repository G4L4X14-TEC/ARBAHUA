'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Tables, Database, Json, TablesInsert } from '@/lib/supabase/database.types';
import * as z from "zod";

// Re-definimos el esquema aquí o lo importamos de un lugar compartido si se usa en más sitios.
// Por ahora, lo redefinimos para mantener la acción autocontenida.
const shippingFormSchema = z.object({
  nombreCompleto: z.string().min(3, { message: "El nombre completo debe tener al menos 3 caracteres." }),
  direccion: z.string().min(5, { message: "La dirección debe tener al menos 5 caracteres." }),
  ciudad: z.string().min(2, { message: "La ciudad debe tener al menos 2 caracteres." }),
  codigoPostal: z.string().regex(/^\d{5}$/, { message: "Debe ser un código postal mexicano válido de 5 dígitos." }),
  pais: z.string({ required_error: "Por favor, selecciona un país." }).min(1, "Por favor, selecciona un país."),
  telefono: z.string().regex(/^\d{10}$/, { message: "Debe ser un número de teléfono de 10 dígitos." }),
});
type ShippingFormValues = z.infer<typeof shippingFormSchema>;


// Helper para crear el cliente de Supabase en Server Actions
// Esta función es similar a la de cartPageActions.ts y homePageActions.ts
// Considerar moverla a un archivo de utilidad compartido si se repite mucho.
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

  // Mapeo de los campos del formulario a las columnas de la tabla 'direcciones'
  // IMPORTANTE: Asegúrate que tu tabla 'direcciones' tenga estas columnas o ajústalas.
  // Según tu esquema anterior, 'direcciones' tiene: id, cliente_id, calle, ciudad, estado, codigo_postal, pais.
  // Faltarían 'nombre_completo_destinatario' y 'telefono_contacto'. Asumiré que las añadirás.
  // Si no las añades, la inserción fallará o estos campos serán ignorados por Supabase si no existen.
  const insertPayload: TablesInsert<'direcciones'> = {
    cliente_id: user.id,
    calle: addressData.direccion,
    ciudad: addressData.ciudad,
    codigo_postal: addressData.codigoPostal,
    pais: addressData.pais,
    // Los siguientes campos dependen de que los hayas añadido a tu tabla 'direcciones'
    // Si no los tienes, comenta o elimina estas líneas:
    // nombre_completo_destinatario: addressData.nombreCompleto, // Ejemplo, ajusta el nombre de columna
    // telefono_contacto: addressData.telefono,                 // Ejemplo, ajusta el nombre de columna
    
    // Si tu tabla 'direcciones' TIENE columnas llamadas 'nombre' y 'telefono' (o similar para estos datos)
    // entonces deberías mapearlos aquí. Por ahora, solo uso los campos que coinciden con tu 'Direccion' interface.
    // El estado no lo guardamos aquí, ya que no es parte del formulario de dirección.
  };
  
  // Para adaptarnos a tu schema actual de 'direcciones' que no tiene nombre_completo ni telefono directamente:
  // Si más adelante los añades, necesitarás descomentar y ajustar el payload.
  // Por ahora, el payload se verá así:
  const currentSchemaPayload: TablesInsert<'direcciones'> = {
    cliente_id: user.id,
    calle: addressData.direccion, // 'direccion' del form a 'calle' en DB
    ciudad: addressData.ciudad,
    estado: addressData.ciudad, // Asumiendo que 'ciudad' y 'estado' podrían ser lo mismo o necesitas un campo 'estado' en el form
    codigo_postal: addressData.codigoPostal,
    pais: addressData.pais,
  };
  // **CORRECCIÓN IMPORTANTE**: Necesitas un campo para 'estado' en tu formulario
  // o decidir cómo mapearlo. Por ahora, usaré ciudad para estado, pero deberías ajustarlo.

  console.log('[saveShippingAddressAction] Payload for DB insert:', currentSchemaPayload);

  try {
    const { data, error } = await supabase
      .from('direcciones')
      .insert(currentSchemaPayload) // Usamos el payload ajustado
      .select('id') // Seleccionamos el ID de la dirección insertada
      .single();

    if (error) {
      console.error('[saveShippingAddressAction] Error inserting address:', error);
      return { success: false, message: `Error al guardar la dirección: ${error.message}` };
    }

    if (!data || !data.id) {
      console.error('[saveShippingAddressAction] No data or addressId returned after insert.');
      return { success: false, message: 'No se pudo obtener el ID de la dirección guardada.' };
    }

    console.log('[saveShippingAddressAction] Address saved successfully with ID:', data.id);
    return { success: true, addressId: data.id, message: 'Dirección de envío guardada correctamente.' };

  } catch (e: any) {
    console.error("[saveShippingAddressAction] Critical error in action:", e.message);
    return { success: false, message: `Error inesperado al guardar la dirección: ${e.message}` };
  }
}

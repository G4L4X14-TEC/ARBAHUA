'use server';

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { ALLOWED_USER_ROLES, type UserRole } from '@/lib/constants/roles';

export async function insertUserProfileAction(profile: {
  id: string;
  nombre: string;
  email: string;
  rol: string;
}): Promise<{ success: boolean; message: string }> {
  const role = profile.rol?.trim() as UserRole | undefined;

  if (!role || !ALLOWED_USER_ROLES.has(role)) {
    console.warn('[insertUserProfileAction] Invalid role provided:', profile.rol);
    return { success: false, message: 'Rol inválido.' };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[insertUserProfileAction] Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL.');
    return {
      success: false,
      message: 'Error de configuración del servidor: falta SUPABASE_SERVICE_ROLE_KEY.',
    };
  }

  const adminSupabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { error } = await adminSupabase
    .from('usuarios')
    .insert([{
      id: profile.id,
      nombre: profile.nombre,
      email: profile.email,
      rol: role,
    }]);

  if (error) {
    console.error('[insertUserProfileAction] Error inserting user profile:', error.message);
    return { success: false, message: error.message };
  }

  return { success: true, message: 'Perfil de usuario creado.' };
}

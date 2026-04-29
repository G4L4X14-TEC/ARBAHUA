export type UserRole = 'cliente' | 'artesano';

export const ALLOWED_USER_ROLES = new Set<UserRole>(['cliente', 'artesano']);

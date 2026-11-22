import { User } from '../types';

/**
 * Módulos de la aplicación sobre los que se controlan permisos de edición/eliminación.
 */
export type Module =
  | 'almacen'
  | 'operaciones'
  | 'ingenieria'
  | 'oma'
  | 'mantenimiento';

type Role = NonNullable<User>['role'];

/**
 * Matriz de permisos: qué roles pueden EDITAR/ELIMINAR en cada módulo.
 *
 * - superadmin y admin: control total en todos los módulos.
 * - warehouse (almacén): solo el módulo de almacén.
 * - requester (usuario): no edita/elimina datos de otros módulos; solo
 *   gestiona lo propio en mantenimiento (se controla aparte por autor).
 */
const EDIT_MATRIX: Record<Module, Role[]> = {
  almacen: ['superadmin', 'admin', 'warehouse'],
  operaciones: ['superadmin', 'admin'],
  ingenieria: ['superadmin', 'admin'],
  oma: ['superadmin', 'admin'],
  mantenimiento: ['superadmin', 'admin'],
};

/** ¿Puede este usuario editar/eliminar en el módulo dado? */
export function canEdit(user: User | null, module: Module): boolean {
  if (!user) return false;
  return EDIT_MATRIX[module].includes(user.role);
}

/** Alias semántico: eliminar usa la misma regla que editar. */
export function canDelete(user: User | null, module: Module): boolean {
  return canEdit(user, module);
}

/**
 * ¿Puede gestionar (editar/eliminar) un recurso del que es autor?
 * Útil en mantenimiento: un requester puede tocar SUS tickets/solicitudes,
 * y los admins pueden tocar los de cualquiera.
 */
export function canManageOwn(
  user: User | null,
  module: Module,
  ownerUsername: string | undefined
): boolean {
  if (!user) return false;
  if (canEdit(user, module)) return true;
  return !!ownerUsername && ownerUsername === user.username;
}

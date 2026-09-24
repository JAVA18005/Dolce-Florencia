// lib/permisos.ts — Matriz centralizada de roles y permisos según docs/ARQUITECTURA.md §4.

import { Rol } from '@prisma/client';

export type AccionPermiso =
  | 'mesas.ver'
  | 'ventas.registrar'
  | 'ventas.cobrar'
  | 'reservas.gestionar'
  | 'pedidos.gestionar'
  | 'eventos.confirmar'
  | 'ventas.anular'
  | 'dashboard.ver'
  | 'productos.gestionar'
  | 'configuracion.gestionar'
  | 'dias.bloquear'
  | 'usuarios.gestionar'
  | 'mesas.gestionar';

const MATRIZ_PERMISOS: Record<Rol, Set<AccionPermiso>> = {
  [Rol.ADMIN]: new Set<AccionPermiso>([
    'mesas.ver',
    'ventas.registrar',
    'ventas.cobrar',
    'reservas.gestionar',
    'pedidos.gestionar',
    'eventos.confirmar',
    'ventas.anular',
    'dashboard.ver',
    'productos.gestionar',
    'configuracion.gestionar',
    'dias.bloquear',
    'usuarios.gestionar',
    'mesas.gestionar',
  ]),
  [Rol.MESERO]: new Set<AccionPermiso>([
    'mesas.ver',
    'ventas.registrar',
    'ventas.cobrar',
    'reservas.gestionar',
    'pedidos.gestionar',
  ]),
};

/**
 * Determina si un rol de usuario tiene autorización para ejecutar una acción específica.
 * El servidor SIEMPRE ejecuta esta verificación; la interfaz solo oculta elementos cosméticos.
 */
export function puede(rol: Rol | null | undefined, accion: AccionPermiso): boolean {
  if (!rol) return false;
  const permisosRol = MATRIZ_PERMISOS[rol];
  if (!permisosRol) return false;
  return permisosRol.has(accion);
}

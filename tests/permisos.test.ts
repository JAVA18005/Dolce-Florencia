import { describe, it, expect } from 'vitest';
import { puede, AccionPermiso } from '../lib/permisos';
import { Rol } from '@prisma/client';

/**
 * Tabla de autorización esperada escrita a mano, copiada directamente de docs/ARQUITECTURA.md §4:
 *
 * | Acción | Mesero | Admin |
 * |---|:---:|:---:|
 * | Ver mesas y su estado | ✅ | ✅ |
 * | Registrar ventas / agregar ítems | ✅ | ✅ |
 * | Marcar venta como REALIZADA (cobro en caja) | ✅ | ✅ |
 * | Ver y confirmar reservas de mesa, asignar mesa | ✅ | ✅ |
 * | Ver y confirmar pedidos | ✅ | ✅ |
 * | Confirmar eventos | ❌ | ✅ |
 * | Anular ventas | ❌ | ✅ |
 * | Dashboard | ❌ | ✅ |
 * | CRUD productos y categorías | ❌ | ✅ |
 * | Gestionar mesas, usuarios, ajustes, bloquear días | ❌ | ✅ |
 *
 * NOTA DE DISCREPANCIA / SUBDIVISIÓN REPORTADA:
 * La fila 10 de ARQUITECTURA.md §4 ("Gestionar mesas, usuarios, ajustes, bloquear días")
 * fue desglosada en lib/permisos.ts en 4 permisos específicos:
 * 'configuracion.gestionar', 'dias.bloquear', 'usuarios.gestionar' y 'mesas.gestionar'.
 * Todos ellos asignan Mesero=false y Admin=true.
 */
const TABLA_ESPERADA_ARQUITECTURA: Record<AccionPermiso, Record<Rol, boolean>> = {
  // 1. Ver mesas y su estado
  'mesas.ver': {
    [Rol.MESERO]: true,
    [Rol.ADMIN]: true,
  },
  // 2. Registrar ventas / agregar ítems
  'ventas.registrar': {
    [Rol.MESERO]: true,
    [Rol.ADMIN]: true,
  },
  // 3. Marcar venta como REALIZADA (cobro en caja)
  'ventas.cobrar': {
    [Rol.MESERO]: true,
    [Rol.ADMIN]: true,
  },
  // 4. Ver y confirmar reservas de mesa, asignar mesa
  'reservas.gestionar': {
    [Rol.MESERO]: true,
    [Rol.ADMIN]: true,
  },
  // 5. Ver y confirmar pedidos
  'pedidos.gestionar': {
    [Rol.MESERO]: true,
    [Rol.ADMIN]: true,
  },
  // 6. Confirmar eventos
  'eventos.confirmar': {
    [Rol.MESERO]: false,
    [Rol.ADMIN]: true,
  },
  // 7. Anular ventas
  'ventas.anular': {
    [Rol.MESERO]: false,
    [Rol.ADMIN]: true,
  },
  // 8. Dashboard
  'dashboard.ver': {
    [Rol.MESERO]: false,
    [Rol.ADMIN]: true,
  },
  // 9. CRUD productos y categorías
  'productos.gestionar': {
    [Rol.MESERO]: false,
    [Rol.ADMIN]: true,
  },
  // 10. Gestionar mesas, usuarios, ajustes, bloquear días
  'configuracion.gestionar': {
    [Rol.MESERO]: false,
    [Rol.ADMIN]: true,
  },
  // Sub-acciones granulares asociadas a la fila 10:
  'dias.bloquear': {
    [Rol.MESERO]: false,
    [Rol.ADMIN]: true,
  },
  'usuarios.gestionar': {
    [Rol.MESERO]: false,
    [Rol.ADMIN]: true,
  },
  'mesas.gestionar': {
    [Rol.MESERO]: false,
    [Rol.ADMIN]: true,
  },
};

const ROLES_EXISTENTES: Rol[] = [Rol.ADMIN, Rol.MESERO];
const ACCIONES_EXISTENTES = Object.keys(TABLA_ESPERADA_ARQUITECTURA) as AccionPermiso[];

describe('tests/permisos.test.ts — Matriz de autorización exhaustiva (ARQUITECTURA.md §4)', () => {
  describe('Validación de TODAS las combinaciones (rol × acción)', () => {
    for (const rol of ROLES_EXISTENTES) {
      for (const accion of ACCIONES_EXISTENTES) {
        const esperado = TABLA_ESPERADA_ARQUITECTURA[accion][rol];
        it(`Rol [${rol}] ejecutando [${accion}] → ${esperado ? 'PERMITIDO' : 'DENEGADO'}`, () => {
          const resultado = puede(rol, accion);
          expect(resultado).toBe(esperado);
        });
      }
    }
  });

  describe('Casos límite y seguridad defensiva', () => {
    it('deniega acceso si el rol es vacío, null o undefined', () => {
      for (const accion of ACCIONES_EXISTENTES) {
        expect(puede(null, accion), `null en ${accion} debe ser denegado`).toBe(false);
        expect(puede(undefined, accion), `undefined en ${accion} debe ser denegado`).toBe(false);
        expect(puede('' as unknown as Rol, accion), `rol vacío en ${accion} debe ser denegado`).toBe(false);
      }
    });

    it('deniega acceso si el rol es desconocido o no existente', () => {
      const rolesDesconocidos = ['SUPERADMIN', 'CLIENTE', 'CAJERO', 'INVITADO', 'root', 'admin'];
      for (const rolDesconocido of rolesDesconocidos) {
        for (const accion of ACCIONES_EXISTENTES) {
          expect(
            puede(rolDesconocido as unknown as Rol, accion),
            `Rol desconocido '${rolDesconocido}' en ${accion} debe ser denegado`
          ).toBe(false);
        }
      }
    });

    it('deniega acceso si la acción es desconocida o inexistente', () => {
      const accionesDesconocidas = [
        'base_datos.borrar',
        'sistema.apagar',
        'usuarios.eliminar_todos',
        'hack.bypass',
        '',
        'undefined',
      ];

      for (const rol of ROLES_EXISTENTES) {
        for (const accionInexistente of accionesDesconocidas) {
          expect(
            puede(rol, accionInexistente as unknown as AccionPermiso),
            `Acción inexistente '${accionInexistente}' para ${rol} debe ser denegada`
          ).toBe(false);
        }
      }
    });
  });
});

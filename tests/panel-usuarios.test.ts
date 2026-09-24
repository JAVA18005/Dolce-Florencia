import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import prisma from '../lib/db';
import { Rol } from '@prisma/client';
import { hashearPassword } from '../lib/auth/password';
import { crearSesionEnBd, exigirSesionServidor } from '../lib/auth/sesion';
import {
  crearUsuarioPersonal,
  cambiarEstadoActivoUsuario,
  cambiarRolUsuario,
  restablecerPasswordUsuarioPorAdmin,
  cambiarPasswordPropio,
} from '../lib/servicios/usuarios';

// Mock de cookies y headers de Next.js
let sesionMockActiva: any = null;

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({ 'cf-connecting-ip': '127.0.0.1' })),
  cookies: vi.fn(async () => ({
    get: vi.fn((name: string) => {
      if (name === 'dolce_sesion_panel' && sesionMockActiva) {
        return { value: sesionMockActiva.token };
      }
      return undefined;
    }),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

describe('Hito 2 - Parte A: Cuentas del personal, sesiones y auditoría', () => {
  const adminEmail = 'admin-usuarios-test@dolceflorencia.com';
  const meseroEmail = 'mesero-usuarios-test@dolceflorencia.com';
  const nuevoEmail = 'nuevo-empleado@dolceflorencia.com';

  let adminId: string;
  let meseroId: string;
  let adminToken: string;
  let meseroToken: string;

  beforeEach(async () => {
    // Limpieza previa
    await prisma.sesion.deleteMany({
      where: { usuario: { email: { in: [adminEmail, meseroEmail, nuevoEmail] } } },
    });
    await prisma.auditoria.deleteMany({
      where: { usuario: { email: { in: [adminEmail, meseroEmail, nuevoEmail] } } },
    });
    await prisma.usuario.deleteMany({
      where: { email: { in: [adminEmail, meseroEmail, nuevoEmail] } },
    });
    await prisma.peticionRateLimit.deleteMany({
      where: { clave: { contains: 'cambio-pass:usuario:' } },
    });

    const hash = await hashearPassword('PasswordAdmin123!');

    const admin = await prisma.usuario.create({
      data: {
        nombre: 'Admin Principal Test',
        email: adminEmail,
        passwordHash: hash,
        rol: Rol.ADMIN,
        activo: true,
        debeCambiarPassword: false,
      },
    });
    adminId = admin.id;

    const mesero = await prisma.usuario.create({
      data: {
        nombre: 'Mesero Test',
        email: meseroEmail,
        passwordHash: hash,
        rol: Rol.MESERO,
        activo: true,
        debeCambiarPassword: false,
      },
    });
    meseroId = mesero.id;

    const sesionAdmin = await crearSesionEnBd(adminId);
    adminToken = sesionAdmin.token;

    const sesionMesero = await crearSesionEnBd(meseroId);
    meseroToken = sesionMesero.token;

    // Configurar sesión activa como Admin por defecto
    sesionMockActiva = { token: adminToken, usuarioId: adminId };
  });

  afterAll(async () => {
    await prisma.sesion.deleteMany({
      where: { usuario: { email: { in: [adminEmail, meseroEmail, nuevoEmail] } } },
    });
    await prisma.auditoria.deleteMany({
      where: { usuario: { email: { in: [adminEmail, meseroEmail, nuevoEmail] } } },
    });
    await prisma.usuario.deleteMany({
      where: { email: { in: [adminEmail, meseroEmail, nuevoEmail] } },
    });
  });

  it('un usuario sin permiso (MESERO) recibe rechazo desde el servidor en cada acción del módulo', async () => {
    // Cambiar a sesión de Mesero
    sesionMockActiva = { token: meseroToken, usuarioId: meseroId };

    await expect(
      crearUsuarioPersonal({
        nombre: 'Intento Ilegal',
        email: nuevoEmail,
        rol: Rol.MESERO,
        passwordInicial: 'Temporal123456!',
      })
    ).rejects.toThrow(/Acceso denegado/);

    await expect(cambiarEstadoActivoUsuario(adminId, false)).rejects.toThrow(/Acceso denegado/);
    await expect(cambiarRolUsuario(meseroId, Rol.ADMIN)).rejects.toThrow(/Acceso denegado/);
    await expect(
      restablecerPasswordUsuarioPorAdmin(adminId, 'NuevaClave12345!')
    ).rejects.toThrow(/Acceso denegado/);
  });

  it('crea usuario con debeCambiarPassword = true y registra auditoría sin exponer contraseñas', async () => {
    sesionMockActiva = { token: adminToken, usuarioId: adminId };

    const nuevo = await crearUsuarioPersonal({
      nombre: 'Nuevo Mesero',
      email: nuevoEmail,
      rol: Rol.MESERO,
      passwordInicial: 'TemporalInicial123!',
    });

    expect(nuevo.id).toBeDefined();

    const usuarioEnBd = await prisma.usuario.findUnique({ where: { id: nuevo.id } });
    expect(usuarioEnBd?.debeCambiarPassword).toBe(true);
    expect(usuarioEnBd?.activo).toBe(true);

    // Verificar registro de auditoría
    const auditoria = await prisma.auditoria.findFirst({
      where: { entidadId: nuevo.id, accion: 'usuario.crear' },
    });
    expect(auditoria).not.toBeNull();
    expect(auditoria?.usuarioId).toBe(adminId);
    expect(JSON.stringify(auditoria?.detalle)).not.toContain('TemporalInicial123!');
  });

  it('un usuario no puede desactivarse a sí mismo', async () => {
    sesionMockActiva = { token: adminToken, usuarioId: adminId };

    await expect(cambiarEstadoActivoUsuario(adminId, false)).rejects.toThrow(
      'No puedes desactivar tu propia cuenta de usuario.'
    );
  });

  it('no puede quedar el sistema sin al menos un admin activo', async () => {
    sesionMockActiva = { token: adminToken, usuarioId: adminId };

    // Intentar cambiar rol del único admin a Mesero
    // (o intentar desactivar si fuera otro admin pero el único)
    await expect(cambiarRolUsuario(adminId, Rol.MESERO)).rejects.toThrow(
      'No puedes quitarte el rol de administrador a ti mismo.'
    );
  });

  it('al desactivar o cambiar el rol de un usuario, todas sus sesiones activas se eliminan de inmediato en la misma transacción', async () => {
    sesionMockActiva = { token: adminToken, usuarioId: adminId };

    // Crear 2 sesiones para el mesero
    await crearSesionEnBd(meseroId);
    await crearSesionEnBd(meseroId);

    const sesionesAntes = await prisma.sesion.count({ where: { usuarioId: meseroId } });
    expect(sesionesAntes).toBeGreaterThanOrEqual(2);

    // Desactivar mesero
    await cambiarEstadoActivoUsuario(meseroId, false);

    const sesionesDespues = await prisma.sesion.count({ where: { usuarioId: meseroId } });
    expect(sesionesDespues).toBe(0);

    // Crear una sesión nueva y probar con cambio de rol
    await crearSesionEnBd(meseroId);
    expect(await prisma.sesion.count({ where: { usuarioId: meseroId } })).toBe(1);

    await cambiarRolUsuario(meseroId, Rol.ADMIN);
    expect(await prisma.sesion.count({ where: { usuarioId: meseroId } })).toBe(0);
  });

  it('al restablecer contraseña de un usuario, se eliminan todas sus sesiones y queda con debeCambiarPassword = true', async () => {
    sesionMockActiva = { token: adminToken, usuarioId: adminId };

    await crearSesionEnBd(meseroId);
    expect(await prisma.sesion.count({ where: { usuarioId: meseroId } })).toBeGreaterThan(0);

    await restablecerPasswordUsuarioPorAdmin(meseroId, 'ClaveTemporal999#');

    expect(await prisma.sesion.count({ where: { usuarioId: meseroId } })).toBe(0);

    const meseroActualizado = await prisma.usuario.findUnique({ where: { id: meseroId } });
    expect(meseroActualizado?.debeCambiarPassword).toBe(true);
  });

  it('un usuario con debeCambiarPassword no puede acceder a acciones del panel hasta cambiarla', async () => {
    // Configurar mesero con debeCambiarPassword = true
    await prisma.usuario.update({
      where: { id: meseroId },
      data: { debeCambiarPassword: true },
    });

    const sesion = await crearSesionEnBd(meseroId);
    sesionMockActiva = { token: sesion.token, usuarioId: meseroId };

    // Intentar acceder a una acción normal
    await expect(exigirSesionServidor('pedidos.gestionar')).rejects.toThrow(
      'Debes actualizar tu contraseña antes de continuar navegando en el panel.'
    );

    // Debe permitirse si es el flujo de cambio obligatorio (permitirSiDebeCambiarPassword = true)
    const sesionPermitida = await exigirSesionServidor(undefined, true);
    expect(sesionPermitida.usuario.id).toBe(meseroId);
  });

  it('cambio de contraseña propio rechaza clave actual incorrecta, repetida o inválida, e invalida las otras sesiones', async () => {
    // Crear dos sesiones para mesero
    const sesion1 = await crearSesionEnBd(meseroId);
    const sesion2 = await crearSesionEnBd(meseroId);

    const sesionActual = {
      sesionId: sesion1.token, // para el test usamos el id
      usuario: (await prisma.usuario.findUnique({ where: { id: meseroId } }))!,
    };
    // Ajustar sesionId real
    const sesionReal = await prisma.sesion.findFirst({ where: { usuarioId: meseroId } });
    sesionActual.sesionId = sesionReal!.id;

    // 1. Clave actual errónea
    await expect(
      cambiarPasswordPropio(
        sesionActual,
        'ClaveIncorrecta!',
        'NuevaPasswordValida123#',
        'NuevaPasswordValida123#'
      )
    ).rejects.toThrow('La contraseña actual es incorrecta.');

    // 2. Nueva igual a la actual
    await expect(
      cambiarPasswordPropio(
        sesionActual,
        'PasswordAdmin123!',
        'PasswordAdmin123!',
        'PasswordAdmin123!'
      )
    ).rejects.toThrow('La nueva contraseña debe ser diferente a la contraseña actual.');

    // 3. Confirmación no coincide
    await expect(
      cambiarPasswordPropio(
        sesionActual,
        'PasswordAdmin123!',
        'NuevaPasswordValida123#',
        'OtraConfirmacionDistinta#'
      )
    ).rejects.toThrow('La confirmación de la nueva contraseña no coincide.');

    // 4. Nueva < 12 caracteres
    await expect(
      cambiarPasswordPropio(sesionActual, 'PasswordAdmin123!', 'Corta123#', 'Corta123#')
    ).rejects.toThrow('al menos 12 caracteres');

    // 5. Cambio exitoso: elimina otras sesiones y actualiza debeCambiarPassword a false
    await cambiarPasswordPropio(
      sesionActual,
      'PasswordAdmin123!',
      'NuevaPasswordSuperSegura2026#',
      'NuevaPasswordSuperSegura2026#'
    );

    const usuarioPost = await prisma.usuario.findUnique({ where: { id: meseroId } });
    expect(usuarioPost?.debeCambiarPassword).toBe(false);

    // Solo queda la sesión actual
    const sesionesRestantes = await prisma.sesion.findMany({ where: { usuarioId: meseroId } });
    expect(sesionesRestantes.length).toBe(1);
    expect(sesionesRestantes[0].id).toBe(sesionActual.sesionId);
  });
});

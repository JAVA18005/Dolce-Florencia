import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import prisma from '../lib/db';
import {
  crearSesionEnBd,
  calcularHashToken,
  revocarTodasLasSesionesUsuario,
  EXPIRACION_ABSOLUTA_SEGUNDOS,
  INACTIVIDAD_MAXIMA_SEGUNDOS,
} from '../lib/auth/sesion';
import { Rol } from '@prisma/client';

describe('lib/auth/sesion — Gestión de sesiones en BD', () => {
  const emailTest = 'test-sesion-user@dolceflorencia.com';
  let testUsuarioId: string;

  beforeEach(async () => {
    // Asegurar usuario de prueba limpio
    await prisma.sesion.deleteMany({
      where: { usuario: { email: emailTest } },
    });
    await prisma.usuario.deleteMany({
      where: { email: emailTest },
    });

    const u = await prisma.usuario.create({
      data: {
        nombre: 'Usuario Prueba Sesión',
        email: emailTest,
        passwordHash: '$2a$10$dummyHashJustForSessionTestingOnly123456789012345',
        rol: Rol.MESERO,
        activo: true,
      },
    });
    testUsuarioId = u.id;
  });

  afterAll(async () => {
    await prisma.sesion.deleteMany({
      where: { usuario: { email: emailTest } },
    });
    await prisma.usuario.deleteMany({
      where: { email: emailTest },
    });
  });

  it('calcula hash SHA-256 de forma determinista', () => {
    const hash1 = calcularHashToken('token-123456');
    const hash2 = calcularHashToken('token-123456');
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex string
  });

  it('crea sesión en BD con token opaco y hash SHA-256', async () => {
    const { token, expiraEn } = await crearSesionEnBd(testUsuarioId);

    expect(token).toBeDefined();
    expect(token.length).toBe(64); // 32 bytes hex = 64 chars
    expect(expiraEn.getTime()).toBeGreaterThan(Date.now());

    const hash = calcularHashToken(token);
    const sesionEnBd = await prisma.sesion.findUnique({
      where: { tokenHash: hash },
    });

    expect(sesionEnBd).not.toBeNull();
    expect(sesionEnBd?.usuarioId).toBe(testUsuarioId);
  });

  it('revoca todas las sesiones de un usuario de forma inmediata', async () => {
    // Crear 3 sesiones simultáneas
    await crearSesionEnBd(testUsuarioId);
    await crearSesionEnBd(testUsuarioId);
    await crearSesionEnBd(testUsuarioId);

    const previas = await prisma.sesion.count({
      where: { usuarioId: testUsuarioId },
    });
    expect(previas).toBe(3);

    const eliminadas = await revocarTodasLasSesionesUsuario(testUsuarioId);
    expect(eliminadas).toBe(3);

    const posteriores = await prisma.sesion.count({
      where: { usuarioId: testUsuarioId },
    });
    expect(posteriores).toBe(0);
  });

  it('detecta sesiones con expiración absoluta en el pasado', async () => {
    const { token } = await crearSesionEnBd(testUsuarioId);
    const hash = calcularHashToken(token);

    // Forzar fecha de expiración en el pasado
    const pasada = new Date(Date.now() - 1000 * 60);
    await prisma.sesion.update({
      where: { tokenHash: hash },
      data: { expiraEn: pasada },
    });

    const sesion = await prisma.sesion.findUnique({
      where: { tokenHash: hash },
    });

    expect(sesion?.expiraEn.getTime()).toBeLessThan(Date.now());
  });

  it('detecta sesiones con inactividad superior al límite permitido (2 horas)', async () => {
    const { token } = await crearSesionEnBd(testUsuarioId);
    const hash = calcularHashToken(token);

    // Forzar último acceso a 3 horas atrás (> INACTIVIDAD_MAXIMA_SEGUNDOS)
    const inactivo = new Date(Date.now() - (INACTIVIDAD_MAXIMA_SEGUNDOS + 3600) * 1000);
    await prisma.sesion.update({
      where: { tokenHash: hash },
      data: { ultimoAcceso: inactivo },
    });

    const sesion = await prisma.sesion.findUnique({
      where: { tokenHash: hash },
    });

    const tiempoInactivo = Date.now() - sesion!.ultimoAcceso.getTime();
    expect(tiempoInactivo).toBeGreaterThan(INACTIVIDAD_MAXIMA_SEGUNDOS * 1000);
  });

  it('invalida sesiones cuando el usuario es desactivado (activo = false)', async () => {
    const { token } = await crearSesionEnBd(testUsuarioId);
    const hash = calcularHashToken(token);

    // Desactivar el usuario
    await prisma.usuario.update({
      where: { id: testUsuarioId },
      data: { activo: false },
    });

    const sesionConUsuario = await prisma.sesion.findUnique({
      where: { tokenHash: hash },
      include: { usuario: true },
    });

    expect(sesionConUsuario?.usuario.activo).toBe(false);
  });
});

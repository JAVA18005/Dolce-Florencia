import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import prisma from '../lib/db';
import { hashearPassword } from '../lib/auth/password';
import { procesarLogin } from '../lib/auth/login';
import { Rol } from '@prisma/client';

// Mock de next/headers para el entorno de pruebas de Vitest
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({ 'cf-connecting-ip': '192.168.1.50' })),
  cookies: vi.fn(async () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

describe('lib/auth/login — Seguridad en inicio de sesión del personal', () => {
  const emailValido = 'admin-login-test@dolceflorencia.com';
  const passwordValida = 'PasswordValida123!';
  const emailInactivo = 'inactivo-login-test@dolceflorencia.com';

  beforeEach(async () => {
    // Limpiar usuarios y rate limit
    await prisma.sesion.deleteMany({
      where: { usuario: { email: { in: [emailValido, emailInactivo] } } },
    });
    await prisma.usuario.deleteMany({
      where: { email: { in: [emailValido, emailInactivo] } },
    });
    await prisma.peticionRateLimit.deleteMany({
      where: {
        clave: {
          contains: 'login:',
        },
      },
    });

    const hash = await hashearPassword(passwordValida);

    // Usuario activo
    await prisma.usuario.create({
      data: {
        nombre: 'Administrador Pruebas',
        email: emailValido,
        passwordHash: hash,
        rol: Rol.ADMIN,
        activo: true,
      },
    });

    // Usuario inactivo
    await prisma.usuario.create({
      data: {
        nombre: 'Mesero Desactivado',
        email: emailInactivo,
        passwordHash: hash,
        rol: Rol.MESERO,
        activo: false,
      },
    });
  });

  afterAll(async () => {
    await prisma.sesion.deleteMany({
      where: { usuario: { email: { in: [emailValido, emailInactivo] } } },
    });
    await prisma.usuario.deleteMany({
      where: { email: { in: [emailValido, emailInactivo] } },
    });
    await prisma.peticionRateLimit.deleteMany({
      where: {
        clave: {
          contains: 'login:',
        },
      },
    });
  });

  it('inicia sesión exitosamente con credenciales válidas', async () => {
    const res = await procesarLogin(emailValido, passwordValida);
    expect(res.exito).toBe(true);
    expect(res.rol).toBe(Rol.ADMIN);
    expect(res.nombre).toBe('Administrador Pruebas');

    // Debe existir sesión creada en BD
    const sesion = await prisma.sesion.findFirst({
      where: { usuario: { email: emailValido } },
    });
    expect(sesion).not.toBeNull();
  });

  it('rechaza usuario inexistente con mensaje genérico', async () => {
    const res = await procesarLogin('no-existe@dolceflorencia.com', 'CualquierClave123!');
    expect(res.exito).toBe(false);
    expect(res.mensaje).toBe('Credenciales inválidas.');
  });

  it('rechaza contraseña incorrecta con mensaje genérico', async () => {
    const res = await procesarLogin(emailValido, 'ClaveIncorrecta999!');
    expect(res.exito).toBe(false);
    expect(res.mensaje).toBe('Credenciales inválidas.');
  });

  it('rechaza usuario inactivo con mensaje genérico', async () => {
    const res = await procesarLogin(emailInactivo, passwordValida);
    expect(res.exito).toBe(false);
    expect(res.mensaje).toBe('Credenciales inválidas.');
  });

  it('bloquea temporalmente por usuario tras 5 intentos fallidos consecutivos', async () => {
    const emailObjetivo = 'bruteforce-test@dolceflorencia.com';

    // 5 intentos fallidos
    for (let i = 1; i <= 5; i++) {
      const intento = await procesarLogin(emailObjetivo, 'clave-erronea');
      expect(intento.exito).toBe(false);
      expect(intento.mensaje).toBe('Credenciales inválidas.');
    }

    // El 6to intento es bloqueado por rate limit
    const sextoIntento = await procesarLogin(emailObjetivo, 'clave-erronea');
    expect(sextoIntento.exito).toBe(false);
    expect(sextoIntento.mensaje).toContain('Demasiados intentos fallidos');
  });

  it('rechaza de inmediato contraseñas de más de 128 caracteres antes de bcrypt, con mensaje genérico y contándolo en rate limit', async () => {
    const emailTest = 'long-pass-test@dolceflorencia.com';
    const passwordLarga = 'A'.repeat(129);

    const res = await procesarLogin(emailTest, passwordLarga);

    expect(res.exito).toBe(false);
    expect(res.mensaje).toBe('Credenciales inválidas.');

    // Verificar que se contó como intento fallido en la tabla de rate limit
    const registroRateLimit = await prisma.peticionRateLimit.findUnique({
      where: { clave: `login:usuario:${emailTest}` },
    });
    expect(registroRateLimit).not.toBeNull();
    expect(registroRateLimit!.intentos).toBe(1);
  });
});

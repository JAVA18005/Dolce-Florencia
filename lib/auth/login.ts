// lib/auth/login.ts — Servicio de autenticación segura para el panel de personal.

import prisma from '../db';
import { verificarPassword, HASH_FALSO } from './password';
import { crearSesionEnBd, establecerCookieSesion } from './sesion';
import { verificarYRegistrarRateLimit } from '../rate-limit';
import { obtenerIpCliente } from '../ip';
import { headers } from 'next/headers';
import { Rol } from '@prisma/client';

export interface ResultadoLogin {
  exito: boolean;
  mensaje?: string;
  rol?: Rol;
  nombre?: string;
}

const LIMITE_INTENTOS_USUARIO = 5;
const LIMITE_INTENTOS_IP = 15;
const VENTANA_BLOQUEO_SEGUNDOS = 15 * 60; // 15 minutos

/**
 * Procesa el inicio de sesión del personal garantizando:
 * 1. Rate limiting independiente por usuario y por IP usando lib/rate-limit.ts.
 * 2. Igualación de tiempos con HASH_FALSO cuando el usuario no existe.
 * 3. Mensaje de error genérico que no filtra la existencia de cuentas.
 * 4. Regeneración completa de sesión (nuevo token opaco en BD y cookie httpOnly).
 */
export async function procesarLogin(emailRaw: string, passwordRaw: string): Promise<ResultadoLogin> {
  const email = (emailRaw || '').trim().toLowerCase();
  const password = passwordRaw || '';

  if (!email || !password) {
    return {
      exito: false,
      mensaje: 'Credenciales inválidas.',
    };
  }

  // 1. Obtener IP del cliente para rate limit
  const headersList = await headers();
  const ip = obtenerIpCliente(headersList);

  // 2. Rate limit por usuario (principal ya que PROXY_CONFIABLE=ninguno puede agrupar IPs locales)
  const claveUsuario = `login:usuario:${email}`;
  const resLimitUsuario = await verificarYRegistrarRateLimit(
    claveUsuario,
    LIMITE_INTENTOS_USUARIO,
    VENTANA_BLOQUEO_SEGUNDOS
  );

  if (!resLimitUsuario.permitido) {
    const minutos = Math.max(1, Math.ceil((resLimitUsuario.segundosParaReintentar || 60) / 60));

    // Auditoría de bloqueo: solo si el usuario existe en BD, registrando únicamente su ID
    // (nunca texto escrito en el formulario ni passwords).
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email },
      select: { id: true },
    });
    if (usuarioExistente) {
      const { registrarAuditoria } = await import('../auditoria');
      await registrarAuditoria({
        usuarioId: usuarioExistente.id,
        accion: 'login.bloqueado_intentos',
        entidad: 'Usuario',
        entidadId: usuarioExistente.id,
      }).catch(() => {});
    }

    return {
      exito: false,
      mensaje: `Demasiados intentos fallidos. Tu cuenta ha sido bloqueada temporalmente. Intenta de nuevo en ${minutos} minuto(s).`,
    };
  }

  // 3. Rate limit por IP
  const claveIp = `login:ip:${ip}`;
  const resLimitIp = await verificarYRegistrarRateLimit(
    claveIp,
    LIMITE_INTENTOS_IP,
    VENTANA_BLOQUEO_SEGUNDOS
  );

  if (!resLimitIp.permitido) {
    const minutos = Math.max(1, Math.ceil((resLimitIp.segundosParaReintentar || 60) / 60));
    return {
      exito: false,
      mensaje: `Demasiados intentos desde esta red. Intenta de nuevo en ${minutos} minuto(s).`,
    };
  }

  // 4. Rechazo inmediato de contraseñas de más de 128 caracteres ANTES de ejecutar bcrypt.
  // Mitiga ataques DoS por contraseñas hiper-largas, manteniendo el mismo mensaje genérico
  // y contándolo como intento fallido (ya registrado arriba en el rate limit).
  if (password.length > 128) {
    return {
      exito: false,
      mensaje: 'Credenciales inválidas.',
    };
  }

  // 5. Buscar usuario en base de datos
  const usuario = await prisma.usuario.findUnique({
    where: { email },
  });

  // 5. Comparación con tiempo igualado (timing attack mitigation)
  if (!usuario) {
    // Ejecuta el hash falso para consumir exactamente el mismo tiempo de CPU
    await verificarPassword(password, HASH_FALSO);
    return {
      exito: false,
      mensaje: 'Credenciales inválidas.',
    };
  }

  // Si el usuario existe pero está inactivo
  if (!usuario.activo) {
    await verificarPassword(password, usuario.passwordHash);
    return {
      exito: false,
      mensaje: 'Credenciales inválidas.',
    };
  }

  // 6. Verificar contraseña real
  const passwordValida = await verificarPassword(password, usuario.passwordHash);

  if (!passwordValida) {
    return {
      exito: false,
      mensaje: 'Credenciales inválidas.',
    };
  }

  // 7. Regenerar sesión: crear nuevo registro de Sesion y emitir cookie httpOnly
  const { token, expiraEn } = await crearSesionEnBd(usuario.id);
  await establecerCookieSesion(token, expiraEn);

  const { registrarAuditoria } = await import('../auditoria');
  await registrarAuditoria({
    usuarioId: usuario.id,
    accion: 'login.exitoso',
    entidad: 'Usuario',
    entidadId: usuario.id,
  }).catch(() => {});

  return {
    exito: true,
    rol: usuario.rol,
    nombre: usuario.nombre,
  };
}

// lib/auth/sesion.ts — Gestión segura de sesiones de personal con tokens opacos y hash SHA-256 en BD.

import crypto from 'crypto';
import { cookies } from 'next/headers';
import prisma from '../db';
import { Usuario } from '@prisma/client';
import { puede, AccionPermiso } from '../permisos';

export const NOMBRE_COOKIE_SESION = 'dolce_sesion_panel';

// Políticas de expiración
export const EXPIRACION_ABSOLUTA_SEGUNDOS = 7 * 24 * 60 * 60; // 7 días
export const INACTIVIDAD_MAXIMA_SEGUNDOS = 2 * 60 * 60; // 2 horas

export interface InfoSesion {
  usuario: Usuario;
  sesionId: string;
}

/**
 * Calcula el hash SHA-256 de un token opaco.
 */
export function calcularHashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Limpieza probabilística no bloqueante de sesiones expiradas (~5% de las llamadas).
 */
function limpiezaProbabilisticaSesiones() {
  if (Math.random() < 0.05) {
    const ahora = new Date();
    prisma.sesion
      .deleteMany({
        where: {
          OR: [
            { expiraEn: { lt: ahora } },
            {
              ultimoAcceso: {
                lt: new Date(ahora.getTime() - INACTIVIDAD_MAXIMA_SEGUNDOS * 1000),
              },
            },
          ],
        },
      })
      .catch(() => {
        // Ignorar fallos de limpieza en segundo plano
      });
  }
}

/**
 * Crea una nueva sesión en base de datos para un usuario y devuelve el token opaco y fecha de expiración.
 */
export async function crearSesionEnBd(usuarioId: string): Promise<{ token: string; expiraEn: Date }> {
  limpiezaProbabilisticaSesiones();

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = calcularHashToken(token);
  const ahora = new Date();
  const expiraEn = new Date(ahora.getTime() + EXPIRACION_ABSOLUTA_SEGUNDOS * 1000);

  await prisma.sesion.create({
    data: {
      usuarioId,
      tokenHash,
      expiraEn,
      ultimoAcceso: ahora,
    },
  });

  return { token, expiraEn };
}

/**
 * REGLA DE RUTA PARA HITOS SIGUIENTES:
 * La cookie de sesión se emite con `path: '/panel'`.
 * Por lo tanto, el navegador solo enviará esta cookie en peticiones dirigidas a rutas bajo `/panel/...`.
 * Cualquier Route Handler que requiera sesión activa (p. ej. subida de imágenes en Hito 4,
 * exportación de reportes en Hito 4, etc.) DEBE residir bajo `app/(panel)/panel/...`,
 * y NUNCA bajo `/api/...`, de lo contrario la cookie no será enviada por el navegador.
 *
 * Escribe la cookie de sesión httpOnly en la respuesta del navegador.
 * Debe invocarse exclusivamente desde Server Actions o Route Handlers.
 */
export async function establecerCookieSesion(token: string, expiraEn: Date): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(NOMBRE_COOKIE_SESION, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/panel',
    expires: expiraEn,
  });
}

/**
 * Elimina la cookie de sesión del navegador.
 */
export async function eliminarCookieSesion(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete({
    name: NOMBRE_COOKIE_SESION,
    path: '/panel',
  });
}

/**
 * Obtiene la sesión actual verificando en el servidor:
 * 1. Presencia de la cookie httpOnly con el token opaco.
 * 2. Existencia del registro en la tabla Sesion buscando por hash SHA-256.
 * 3. Que la sesión no haya alcanzado su expiración absoluta.
 * 4. Que no haya vencido por inactividad (> 2 horas).
 * 5. Que el Usuario siga existiendo, esté activo (activo = true) y con su rol actual leído de la BD.
 * 
 * Si cualquier verificación falla, la sesión se revoca y retorna null.
 */
export async function obtenerSesionServidor(): Promise<InfoSesion | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(NOMBRE_COOKIE_SESION)?.value;

    if (!token || typeof token !== 'string' || token.length < 32) {
      return null;
    }

    const tokenHash = calcularHashToken(token);
    const ahora = new Date();

    const sesion = await prisma.sesion.findUnique({
      where: { tokenHash },
      include: { usuario: true },
    });

    if (!sesion) {
      return null;
    }

    // 1. Expiración absoluta
    if (sesion.expiraEn < ahora) {
      await prisma.sesion.delete({ where: { id: sesion.id } }).catch(() => {});
      return null;
    }

    // 2. Expiración por inactividad
    const tiempoInactivoMs = ahora.getTime() - sesion.ultimoAcceso.getTime();
    if (tiempoInactivoMs > INACTIVIDAD_MAXIMA_SEGUNDOS * 1000) {
      await prisma.sesion.delete({ where: { id: sesion.id } }).catch(() => {});
      return null;
    }

    // 3. Usuario activo
    if (!sesion.usuario || !sesion.usuario.activo) {
      await prisma.sesion.delete({ where: { id: sesion.id } }).catch(() => {});
      return null;
    }

    // Actualizar último acceso de forma asíncrona si pasaron más de 60 segundos
    if (tiempoInactivoMs > 60 * 1000) {
      prisma.sesion
        .update({
          where: { id: sesion.id },
          data: { ultimoAcceso: ahora },
        })
        .catch(() => {});
    }

    return {
      usuario: sesion.usuario,
      sesionId: sesion.id,
    };
  } catch {
    return null;
  }
}

/**
 * Valida sesión en el servidor y opcionalmente comprueba autorización de permiso.
 * Lanza un error estándar en caso de fallo, útil para Server Actions.
 *
 * REGLA DE SEGURIDAD:
 * Si el usuario tiene `debeCambiarPassword === true`, se deniega el acceso a cualquier acción
 * salvo que se active explícitamente `permitirSiDebeCambiarPassword` (para la acción de cambio de contraseña obligatoria).
 */
export async function exigirSesionServidor(
  accionRequerida?: AccionPermiso,
  permitirSiDebeCambiarPassword = false
): Promise<InfoSesion> {
  const sesion = await obtenerSesionServidor();

  if (!sesion) {
    throw new Error('No autenticado: Se requiere inicio de sesión en el panel.');
  }

  if (sesion.usuario.debeCambiarPassword && !permitirSiDebeCambiarPassword) {
    throw new Error('Debes actualizar tu contraseña antes de continuar navegando en el panel.');
  }

  if (accionRequerida && !puede(sesion.usuario.rol, accionRequerida)) {
    throw new Error(`Acceso denegado: El rol ${sesion.usuario.rol} no tiene permiso para ${accionRequerida}.`);
  }

  return sesion;
}

/**
 * Cierra la sesión activa actual borrando el registro de BD y la cookie.
 * Registra auditoría de cierre de sesión.
 */
export async function cerrarSesion(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(NOMBRE_COOKIE_SESION)?.value;

    if (token) {
      const tokenHash = calcularHashToken(token);
      const sesionEnBd = await prisma.sesion.findUnique({
        where: { tokenHash },
        select: { usuarioId: true },
      });

      if (sesionEnBd) {
        // Importación dinámica diferida o directa de registrarAuditoria
        const { registrarAuditoria } = await import('../auditoria');
        await registrarAuditoria({
          usuarioId: sesionEnBd.usuarioId,
          accion: 'usuario.logout',
          entidad: 'Usuario',
          entidadId: sesionEnBd.usuarioId,
        }).catch(() => {});
      }

      await prisma.sesion.deleteMany({ where: { tokenHash } }).catch(() => {});
    }
  } finally {
    await eliminarCookieSesion();
  }
}

/**
 * Revoca de inmediato todas las sesiones de un usuario en base de datos.
 * Debe invocarse al desactivar un usuario o al cambiar su contraseña.
 */
export async function revocarTodasLasSesionesUsuario(usuarioId: string): Promise<number> {
  const res = await prisma.sesion.deleteMany({
    where: { usuarioId },
  });
  return res.count;
}

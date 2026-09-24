// lib/servicios/usuarios.ts — Servicio de administración de cuentas de personal, contraseñas y sesiones.

import prisma from '../db';
import { Rol } from '@prisma/client';
import { hashearPassword, verificarPassword } from '../auth/password';
import { registrarAuditoria } from '../auditoria';
import { exigirSesionServidor, InfoSesion, eliminarCookieSesion } from '../auth/sesion';
import { verificarYRegistrarRateLimit } from '../rate-limit';

/**
 * Valida longitud y límite de bytes UTF-8 para contraseñas de personal (regla de bcrypt).
 */
export function validarRequisitosPassword(password: string): { valida: boolean; error?: string } {
  if (!password || password.length < 12) {
    return { valida: false, error: 'La contraseña debe tener al menos 12 caracteres.' };
  }
  const bytes = Buffer.byteLength(password, 'utf8');
  if (bytes > 72) {
    return {
      valida: false,
      error: `La contraseña no puede exceder 72 bytes en UTF-8 (actual: ${bytes} bytes; bcrypt trunca a 72 bytes).`,
    };
  }
  return { valida: true };
}

/**
 * Lista todos los usuarios del personal para el panel administrativo.
 */
export async function listarUsuariosPersonal(): Promise<
  Array<{
    id: string;
    nombre: string;
    email: string;
    rol: Rol;
    activo: boolean;
    debeCambiarPassword: boolean;
    creadoEn: Date;
  }>
> {
  await exigirSesionServidor('usuarios.gestionar');

  return prisma.usuario.findMany({
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      activo: true,
      debeCambiarPassword: true,
      creadoEn: true,
    },
    orderBy: [{ rol: 'asc' }, { creadoEn: 'desc' }],
  });
}

/**
 * Crea un nuevo usuario de personal con contraseña inicial temporal y debeCambiarPassword = true.
 */
export async function crearUsuarioPersonal(params: {
  nombre: string;
  email: string;
  rol: Rol;
  passwordInicial: string;
}): Promise<{ id: string; email: string }> {
  const sesion = await exigirSesionServidor('usuarios.gestionar');

  const nombre = (params.nombre || '').trim();
  const email = (params.email || '').trim().toLowerCase();
  const rol = params.rol;
  const passwordInicial = params.passwordInicial || '';

  if (!nombre) {
    throw new Error('El nombre es obligatorio.');
  }

  if (!email || !email.includes('@')) {
    throw new Error('Ingrese un correo electrónico válido.');
  }

  if (![Rol.ADMIN, Rol.MESERO].includes(rol)) {
    throw new Error('Rol no válido.');
  }

  const validacionPass = validarRequisitosPassword(passwordInicial);
  if (!validacionPass.valida) {
    throw new Error(validacionPass.error);
  }

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    throw new Error('Ya existe un usuario con este correo electrónico.');
  }

  const passwordHash = await hashearPassword(passwordInicial);

  const nuevoUsuario = await prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.create({
      data: {
        nombre,
        email,
        passwordHash,
        rol,
        activo: true,
        debeCambiarPassword: true,
      },
    });

    await registrarAuditoria(
      {
        usuarioId: sesion.usuario.id,
        accion: 'usuario.crear',
        entidad: 'Usuario',
        entidadId: usuario.id,
        detalle: { rol, email: usuario.email },
      },
      tx
    );

    return usuario;
  });

  return { id: nuevoUsuario.id, email: nuevoUsuario.email };
}

/**
 * Activa o desactiva un usuario garantizando:
 * 1. Nadie puede desactivarse a sí mismo.
 * 2. Nunca puede quedar el sistema sin al menos un admin activo.
 * 3. Al desactivar, se eliminan todas sus sesiones en la MISMA transacción.
 */
export async function cambiarEstadoActivoUsuario(
  usuarioId: string,
  activo: boolean
): Promise<{ id: string; activo: boolean }> {
  const sesion = await exigirSesionServidor('usuarios.gestionar');

  if (sesion.usuario.id === usuarioId && !activo) {
    throw new Error('No puedes desactivar tu propia cuenta de usuario.');
  }

  const usuarioActualizado = await prisma.$transaction(
    async (tx) => {
      const target = await tx.usuario.findUnique({ where: { id: usuarioId } });
      if (!target) {
        throw new Error('Usuario no encontrado.');
      }

      if (!activo && target.rol === Rol.ADMIN) {
        const adminsActivos = await tx.usuario.count({
          where: { rol: Rol.ADMIN, activo: true },
        });

        if (adminsActivos <= 1) {
          throw new Error('No se puede desactivar al único administrador activo del sistema.');
        }
      }

      const res = await tx.usuario.update({
        where: { id: usuarioId },
        data: { activo },
      });

      // Si se desactiva, eliminar de inmediato todas sus sesiones en la misma transacción
      if (!activo) {
        await tx.sesion.deleteMany({ where: { usuarioId } });
      }

      await registrarAuditoria(
        {
          usuarioId: sesion.usuario.id,
          accion: activo ? 'usuario.activar' : 'usuario.desactivar',
          entidad: 'Usuario',
          entidadId: usuarioId,
          detalle: { email: target.email, rol: target.rol },
        },
        tx
      );

      return res;
    },
    { isolationLevel: 'Serializable' }
  );

  return { id: usuarioActualizado.id, activo: usuarioActualizado.activo };
}

/**
 * Cambia el rol de un usuario garantizando:
 * 1. Nadie puede quitarse el rol de administrador a sí mismo.
 * 2. Nunca puede quedar el sistema sin al menos un admin activo.
 * 3. Al cambiar rol, se eliminan todas sus sesiones en la MISMA transacción.
 */
export async function cambiarRolUsuario(
  usuarioId: string,
  nuevoRol: Rol
): Promise<{ id: string; rol: Rol }> {
  const sesion = await exigirSesionServidor('usuarios.gestionar');

  if (sesion.usuario.id === usuarioId && nuevoRol !== Rol.ADMIN) {
    throw new Error('No puedes quitarte el rol de administrador a ti mismo.');
  }

  if (![Rol.ADMIN, Rol.MESERO].includes(nuevoRol)) {
    throw new Error('Rol no válido.');
  }

  const usuarioActualizado = await prisma.$transaction(
    async (tx) => {
      const target = await tx.usuario.findUnique({ where: { id: usuarioId } });
      if (!target) {
        throw new Error('Usuario no encontrado.');
      }

      if (target.rol === Rol.ADMIN && nuevoRol !== Rol.ADMIN) {
        const adminsActivos = await tx.usuario.count({
          where: { rol: Rol.ADMIN, activo: true },
        });

        if (adminsActivos <= 1) {
          throw new Error('No se puede degradar al único administrador activo del sistema.');
        }
      }

      const res = await tx.usuario.update({
        where: { id: usuarioId },
        data: { rol: nuevoRol },
      });

      // Al cambiar el rol, eliminar todas sus sesiones en la misma transacción
      await tx.sesion.deleteMany({ where: { usuarioId } });

      await registrarAuditoria(
        {
          usuarioId: sesion.usuario.id,
          accion: 'usuario.cambiar_rol',
          entidad: 'Usuario',
          entidadId: usuarioId,
          detalle: { rolAnterior: target.rol, nuevoRol },
        },
        tx
      );

      return res;
    },
    { isolationLevel: 'Serializable' }
  );

  return { id: usuarioActualizado.id, rol: usuarioActualizado.rol };
}

/**
 * Restablece la contraseña de otro usuario por parte del administrador.
 * Asigna una contraseña temporal, marca debeCambiarPassword = true y revoca todas sus sesiones.
 */
export async function restablecerPasswordUsuarioPorAdmin(
  usuarioId: string,
  passwordTemporal: string
): Promise<void> {
  const sesion = await exigirSesionServidor('usuarios.gestionar');

  const validacionPass = validarRequisitosPassword(passwordTemporal);
  if (!validacionPass.valida) {
    throw new Error(validacionPass.error);
  }

  const nuevoHash = await hashearPassword(passwordTemporal);

  await prisma.$transaction(async (tx) => {
    const target = await tx.usuario.findUnique({ where: { id: usuarioId } });
    if (!target) {
      throw new Error('Usuario no encontrado.');
    }

    await tx.usuario.update({
      where: { id: usuarioId },
      data: {
        passwordHash: nuevoHash,
        debeCambiarPassword: true,
      },
    });

    // Eliminar todas las sesiones en la misma transacción
    await tx.sesion.deleteMany({ where: { usuarioId } });

    await registrarAuditoria(
      {
        usuarioId: sesion.usuario.id,
        accion: 'usuario.restablecer_password',
        entidad: 'Usuario',
        entidadId: usuarioId,
        detalle: { email: target.email },
      },
      tx
    );
  });
}

/**
 * Cambio de contraseña propio (desde /panel/cuenta o flujo obligatorio /panel/cambiar-password).
 * Exige contraseña actual (con rate limit), valida reglas y elimina todas las otras sesiones.
 */
export async function cambiarPasswordPropio(
  sesionActual: InfoSesion,
  passwordActual: string,
  passwordNueva: string,
  confirmacion: string
): Promise<void> {
  const usuarioId = sesionActual.usuario.id;

  // 1. Rate limit en verificación de contraseña actual
  const claveRateLimit = `cambio-pass:usuario:${usuarioId}`;
  const resLimit = await verificarYRegistrarRateLimit(claveRateLimit, 5, 15 * 60);
  if (!resLimit.permitido) {
    throw new Error('Demasiados intentos fallidos. Por seguridad, espera unos minutos.');
  }

  // 2. Verificar contraseña actual en base de datos
  const usuarioEnBd = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuarioEnBd) {
    throw new Error('Usuario no encontrado.');
  }

  const passwordActualValida = await verificarPassword(passwordActual, usuarioEnBd.passwordHash);
  if (!passwordActualValida) {
    throw new Error('La contraseña actual es incorrecta.');
  }

  // 3. Validar nueva contraseña
  if (passwordNueva !== confirmacion) {
    throw new Error('La confirmación de la nueva contraseña no coincide.');
  }

  if (passwordNueva === passwordActual) {
    throw new Error('La nueva contraseña debe ser diferente a la contraseña actual.');
  }

  const validacion = validarRequisitosPassword(passwordNueva);
  if (!validacion.valida) {
    throw new Error(validacion.error);
  }

  const nuevoHash = await hashearPassword(passwordNueva);

  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({
      where: { id: usuarioId },
      data: {
        passwordHash: nuevoHash,
        debeCambiarPassword: false,
      },
    });

    // Eliminar todas las OTRAS sesiones del usuario, conservando la actual
    await tx.sesion.deleteMany({
      where: {
        usuarioId,
        id: { not: sesionActual.sesionId },
      },
    });

    await registrarAuditoria(
      {
        usuarioId,
        accion: 'usuario.cambio_password_propio',
        entidad: 'Usuario',
        entidadId: usuarioId,
      },
      tx
    );
  });
}

/**
 * Cierra todas las sesiones del usuario actual en BD y elimina la cookie del navegador.
 */
export async function cerrarTodasMisSesiones(sesionActual: InfoSesion): Promise<void> {
  const usuarioId = sesionActual.usuario.id;

  await prisma.$transaction(async (tx) => {
    await tx.sesion.deleteMany({ where: { usuarioId } });

    await registrarAuditoria(
      {
        usuarioId,
        accion: 'usuario.cerrar_todas_sesiones',
        entidad: 'Usuario',
        entidadId: usuarioId,
      },
      tx
    );
  });

  await eliminarCookieSesion();
}

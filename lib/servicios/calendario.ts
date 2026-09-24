// lib/servicios/calendario.ts — Gestión de días bloqueados manuales y consulta del calendario.

import prisma from '../db';
import { exigirSesionServidor } from '../auth/sesion';
import { registrarAuditoria } from '../auditoria';

/**
 * Lista todos los días bloqueados (manuales y por eventos) para el panel.
 */
export async function listarDiasBloqueados() {
  await exigirSesionServidor('dias.bloquear');

  return prisma.diaBloqueado.findMany({
    include: {
      reserva: {
        select: {
          id: true,
          codigo: true,
          clienteNombre: true,
          modalidad: true,
          personas: true,
        },
      },
      creadoPor: {
        select: { id: true, nombre: true, rol: true },
      },
    },
    orderBy: { fecha: 'asc' },
  });
}

/**
 * Bloquea manualmente un día en el calendario por parte del administrador.
 * Avisa si existen reservas de mesa activas para reubicarlas.
 */
export async function bloquearDiaManual(
  fecha: Date,
  motivo: string
): Promise<{ fecha: Date; reservasAfectadas: number; mensaje: string }> {
  const sesion = await exigirSesionServidor('dias.bloquear');

  const fechaNorm = new Date(fecha);
  fechaNorm.setUTCHours(0, 0, 0, 0);

  const motivoLimpio = (motivo || '').trim();
  if (!motivoLimpio) {
    throw new Error('Debe especificar un motivo para el bloqueo del día.');
  }

  return prisma.$transaction(async (tx) => {
    const existente = await tx.diaBloqueado.findUnique({
      where: { fecha: fechaNorm },
    });

    if (existente) {
      throw new Error('Esta fecha ya se encuentra bloqueada en el calendario.');
    }

    // Contar reservas activas (CONFIRMADAS o PENDIENTES) en esa fecha
    const reservasAfectadas = await tx.reserva.count({
      where: {
        fecha: fechaNorm,
        estado: { in: ['CONFIRMADA', 'PENDIENTE'] },
      },
    });

    await tx.diaBloqueado.create({
      data: {
        fecha: fechaNorm,
        motivo: motivoLimpio,
        reservaId: null, // Bloqueo manual del admin
        creadoPorId: sesion.usuario.id,
      },
    });

    await registrarAuditoria(
      {
        usuarioId: sesion.usuario.id,
        accion: 'calendario.bloquear_dia',
        entidad: 'DiaBloqueado',
        entidadId: fechaNorm.toISOString().split('T')[0],
        detalle: { motivo: motivoLimpio, reservasAfectadas },
      },
      tx
    );

    const mensaje =
      reservasAfectadas > 0
        ? `Día bloqueado exitosamente. Atención: Existen ${reservasAfectadas} reservas para esta fecha que deben ser reubicadas o gestionadas.`
        : 'Día bloqueado exitosamente.';

    return { fecha: fechaNorm, reservasAfectadas, mensaje };
  });
}

/**
 * Desbloquea un día bloqueado manualmente.
 * Impide borrar bloqueos vinculados a eventos (se debe cancelar o mover el evento primero).
 */
export async function desbloquearDiaManual(fecha: Date): Promise<void> {
  const sesion = await exigirSesionServidor('dias.bloquear');

  const fechaNorm = new Date(fecha);
  fechaNorm.setUTCHours(0, 0, 0, 0);

  await prisma.$transaction(async (tx) => {
    const bloqueo = await tx.diaBloqueado.findUnique({
      where: { fecha: fechaNorm },
    });

    if (!bloqueo) {
      return; // Idempotente
    }

    if (bloqueo.reservaId) {
      throw new Error(
        'No se puede desbloquear manualmente una fecha cerrada por un evento. Para liberarla, gestiona o cancela el evento asociado.'
      );
    }

    await tx.diaBloqueado.delete({
      where: { fecha: fechaNorm },
    });

    await registrarAuditoria(
      {
        usuarioId: sesion.usuario.id,
        accion: 'calendario.desbloquear_dia',
        entidad: 'DiaBloqueado',
        entidadId: fechaNorm.toISOString().split('T')[0],
        detalle: { motivoOriginal: bloqueo.motivo },
      },
      tx
    );
  });
}

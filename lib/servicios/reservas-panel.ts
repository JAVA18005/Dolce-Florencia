// lib/servicios/reservas-panel.ts — Gestión de reservas de mesa en panel, asignación anti-doble reserva y alertas.

import prisma from '../db';
import { EstadoReserva } from '@prisma/client';
import { validarTransicionReserva } from '../estados';
import { exigirSesionServidor } from '../auth/sesion';
import { registrarAuditoria } from '../auditoria';
import { obtenerHoyBolivia, obtenerHoraActualHHMM } from '../fechas';

/**
 * Consulta la tolerancia de no-show configurada en Ajustes (por defecto 30 minutos).
 */
export async function obtenerToleranciaNoShowMinutos(): Promise<number> {
  const ajuste = await prisma.ajuste.findUnique({
    where: { clave: 'tolerancia_llegada_min' },
  });
  if (ajuste) {
    const val = parseInt(ajuste.valor, 10);
    if (!isNaN(val) && val > 0) return val;
  }
  return 30; // Valor por defecto confirmado en ARQUITECTURA.md §5.3
}

/**
 * Evalúa si una reserva de hoy ha superado la hora de llegada + tolerancia, para mostrar advertencia de "posible no-show".
 */
export function esPosibleNoShow(
  reserva: { fecha: Date; hora?: string | null; estado: EstadoReserva },
  toleranciaMinutos: number
): boolean {
  if (reserva.estado !== 'CONFIRMADA' || !reserva.hora) return false;

  const hoy = obtenerHoyBolivia();
  const fechaReserva = new Date(reserva.fecha);
  fechaReserva.setUTCHours(0, 0, 0, 0);

  // Solo aplica para el día de hoy
  if (fechaReserva.getTime() !== hoy.getTime()) return false;

  const horaActual = obtenerHoraActualHHMM(); // "HH:mm"
  const [hActual, mActual] = horaActual.split(':').map(Number);
  const [hReserva, mReserva] = reserva.hora.split(':').map(Number);

  const minutosActual = hActual * 60 + mActual;
  const minutosLimite = hReserva * 60 + mReserva + toleranciaMinutos;

  return minutosActual > minutosLimite;
}

/**
 * Lista las reservas de mesa para el panel con filtros y cálculo de posibles no-shows.
 */
export async function listarReservasMesa(filtros?: {
  estado?: EstadoReserva;
  fecha?: Date;
}) {
  await exigirSesionServidor('reservas.gestionar');

  const where: any = { tipo: 'MESA' };
  if (filtros?.estado) {
    where.estado = filtros.estado;
  }
  if (filtros?.fecha) {
    where.fecha = filtros.fecha;
  }

  const [reservas, tolerancia] = await Promise.all([
    prisma.reserva.findMany({
      where,
      include: {
        mesa: true,
        gestionadoPor: {
          select: { id: true, nombre: true, rol: true },
        },
      },
      orderBy: [{ fecha: 'asc' }, { creadoEn: 'desc' }],
    }),
    obtenerToleranciaNoShowMinutos(),
  ]);

  return reservas.map((r) => ({
    ...r,
    esPosibleNoShow: esPosibleNoShow(r, tolerancia),
  }));
}

/**
 * Confirma una reserva de mesa con asignación opcional de mesa y protección anti doble reserva.
 * Implementa aislamiento Serializable con reintento acotado (hasta 3 reintentos).
 */
export async function confirmarReservaMesa(
  reservaId: string,
  mesaId?: string | null
): Promise<{ id: string; advertencias?: string[] }> {
  const sesion = await exigirSesionServidor('reservas.gestionar');

  const maxReintentos = 3;
  let reintento = 0;

  while (reintento < maxReintentos) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const reserva = await tx.reserva.findUnique({
            where: { id: reservaId },
          });

          if (!reserva || reserva.tipo !== 'MESA') {
            throw new Error('Reserva no encontrada.');
          }

          // Idempotencia
          if (reserva.estado === 'CONFIRMADA' && reserva.mesaId === mesaId) {
            return { id: reserva.id };
          }

          validarTransicionReserva(reserva.estado as EstadoReserva, 'CONFIRMADA');

          const advertencias: string[] = [];

          // Si se especificó una mesa, validar y proteger contra doble reserva
          if (mesaId) {
            const mesa = await tx.mesa.findUnique({ where: { id: mesaId } });
            if (!mesa || !mesa.habilitada) {
              throw new Error('La mesa seleccionada no está habilitada o no existe.');
            }
            if (!mesa.reservable) {
              throw new Error('La mesa seleccionada (ej. Barra) no admite reservas.');
            }

            // Verificar si otra reserva confirmada ya ocupa esta mesa en la misma fecha
            const conflicto = await tx.reserva.findFirst({
              where: {
                fecha: reserva.fecha,
                mesaId,
                estado: 'CONFIRMADA',
                id: { not: reservaId },
              },
            });

            if (conflicto) {
              throw new Error(
                `Conflicto: La mesa ${mesa.nombre} ya está asignada a otra reserva confirmada para esta fecha.`
              );
            }
          }

          // Revisar si hay otras solicitudes pendientes para la misma fecha
          const otrasPendientes = await tx.reserva.count({
            where: {
              fecha: reserva.fecha,
              estado: 'PENDIENTE',
              id: { not: reservaId },
            },
          });
          if (otrasPendientes > 0) {
            advertencias.push(`Hay ${otrasPendientes} otra(s) solicitud(es) de reserva pendiente(s) para esta fecha.`);
          }

          await tx.reserva.update({
            where: { id: reservaId },
            data: {
              estado: 'CONFIRMADA',
              mesaId: mesaId || null,
              gestionadoPorId: sesion.usuario.id,
              gestionadoEn: new Date(),
            },
          });

          await registrarAuditoria(
            {
              usuarioId: sesion.usuario.id,
              accion: 'reserva.confirmar',
              entidad: 'Reserva',
              entidadId: reservaId,
              detalle: { mesaId, codigo: reserva.codigo },
            },
            tx
          );

          return { id: reserva.id, advertencias: advertencias.length > 0 ? advertencias : undefined };
        },
        { isolationLevel: 'Serializable' }
      );
    } catch (error: any) {
      // Reintentar si es error de serialización concurrente de PostgreSQL (código P2034 en Prisma)
      if (error.code === 'P2034' && reintento < maxReintentos - 1) {
        reintento++;
        await new Promise((r) => setTimeout(r, 50 * reintento));
        continue;
      }
      throw error;
    }
  }

  throw new Error('No se pudo confirmar la reserva debido a alta concurrencia. Por favor, reintenta.');
}

/**
 * Marca una reserva como CUMPLIDA (el cliente ya está ocupando la mesa o fue atendido).
 */
export async function marcarReservaCumplida(reservaId: string): Promise<{ id: string }> {
  const sesion = await exigirSesionServidor('reservas.gestionar');

  return prisma.$transaction(async (tx) => {
    const reserva = await tx.reserva.findUnique({ where: { id: reservaId } });
    if (!reserva) throw new Error('Reserva no encontrada.');

    if (reserva.estado === 'CUMPLIDA') return { id: reserva.id };

    validarTransicionReserva(reserva.estado as EstadoReserva, 'CUMPLIDA');

    await tx.reserva.update({
      where: { id: reservaId },
      data: {
        estado: 'CUMPLIDA',
        gestionadoPorId: sesion.usuario.id,
        gestionadoEn: new Date(),
      },
    });

    await registrarAuditoria(
      {
        usuarioId: sesion.usuario.id,
        accion: 'reserva.marcar_cumplida',
        entidad: 'Reserva',
        entidadId: reservaId,
        detalle: { codigo: reserva.codigo },
      },
      tx
    );

    return { id: reserva.id };
  });
}

/**
 * Marca una reserva confirmada como NO_LLEGO cuando el cliente no se presentó tras la tolerancia.
 */
export async function marcarReservaNoLlego(reservaId: string): Promise<{ id: string }> {
  const sesion = await exigirSesionServidor('reservas.gestionar');

  return prisma.$transaction(async (tx) => {
    const reserva = await tx.reserva.findUnique({ where: { id: reservaId } });
    if (!reserva) throw new Error('Reserva no encontrada.');

    if (reserva.estado === 'NO_LLEGO') return { id: reserva.id };

    validarTransicionReserva(reserva.estado as EstadoReserva, 'NO_LLEGO');

    await tx.reserva.update({
      where: { id: reservaId },
      data: {
        estado: 'NO_LLEGO',
        gestionadoPorId: sesion.usuario.id,
        gestionadoEn: new Date(),
      },
    });

    await registrarAuditoria(
      {
        usuarioId: sesion.usuario.id,
        accion: 'reserva.marcar_no_llego',
        entidad: 'Reserva',
        entidadId: reservaId,
        detalle: { codigo: reserva.codigo },
      },
      tx
    );

    return { id: reserva.id };
  });
}

/**
 * Rechaza una reserva pendiente con motivo opcional.
 */
export async function rechazarReserva(
  reservaId: string,
  motivoRechazo?: string
): Promise<{ id: string }> {
  const sesion = await exigirSesionServidor('reservas.gestionar');

  return prisma.$transaction(async (tx) => {
    const reserva = await tx.reserva.findUnique({ where: { id: reservaId } });
    if (!reserva) throw new Error('Reserva no encontrada.');

    if (reserva.estado === 'RECHAZADA') return { id: reserva.id };

    validarTransicionReserva(reserva.estado as EstadoReserva, 'RECHAZADA');

    await tx.reserva.update({
      where: { id: reservaId },
      data: {
        estado: 'RECHAZADA',
        motivoRechazo: motivoRechazo?.trim() || null,
        gestionadoPorId: sesion.usuario.id,
        gestionadoEn: new Date(),
      },
    });

    await registrarAuditoria(
      {
        usuarioId: sesion.usuario.id,
        accion: 'reserva.rechazar',
        entidad: 'Reserva',
        entidadId: reservaId,
        detalle: { motivoRechazo, codigo: reserva.codigo },
      },
      tx
    );

    return { id: reserva.id };
  });
}

/**
 * Cancela una reserva previamente confirmada o pendiente.
 */
export async function cancelarReserva(reservaId: string): Promise<{ id: string }> {
  const sesion = await exigirSesionServidor('reservas.gestionar');

  return prisma.$transaction(async (tx) => {
    const reserva = await tx.reserva.findUnique({ where: { id: reservaId } });
    if (!reserva) throw new Error('Reserva no encontrada.');

    if (reserva.estado === 'CANCELADA') return { id: reserva.id };

    validarTransicionReserva(reserva.estado as EstadoReserva, 'CANCELADA');

    await tx.reserva.update({
      where: { id: reservaId },
      data: {
        estado: 'CANCELADA',
        gestionadoPorId: sesion.usuario.id,
        gestionadoEn: new Date(),
      },
    });

    await registrarAuditoria(
      {
        usuarioId: sesion.usuario.id,
        accion: 'reserva.cancelar',
        entidad: 'Reserva',
        entidadId: reservaId,
        detalle: { codigo: reserva.codigo },
      },
      tx
    );

    return { id: reserva.id };
  });
}

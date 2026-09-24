// lib/servicios/eventos-panel.ts — Gestión de eventos, reglas de cierre local y días bloqueados (§5.4) para el panel administrativo.

import prisma from '../db';
import { Prisma, EstadoReserva } from '@prisma/client';
import { validarTransicionReserva } from '../estados';
import { exigirSesionServidor } from '../auth/sesion';
import { registrarAuditoria } from '../auditoria';

/**
 * Calcula la capacidad total del salón sumando la capacidad de mesas habilitadas y reservables.
 * No escribe constantes fijas en código; consulta siempre la base de datos viva.
 */
export async function calcularCapacidadTotalLocal(tx?: Prisma.TransactionClient): Promise<number> {
  const db = tx || prisma;
  const mesas = await db.mesa.findMany({
    where: { habilitada: true, reservable: true },
    select: { capacidad: true },
  });
  return mesas.reduce((acc, m) => acc + m.capacidad, 0);
}

/**
 * Lista todos los eventos para el panel de administración.
 */
export async function listarEventos(filtros?: {
  estado?: EstadoReserva;
  fecha?: Date;
}) {
  await exigirSesionServidor('eventos.confirmar');

  const where: any = { tipo: 'EVENTO' };
  if (filtros?.estado) {
    where.estado = filtros.estado;
  }
  if (filtros?.fecha) {
    where.fecha = filtros.fecha;
  }

  return prisma.reserva.findMany({
    where,
    include: {
      diaBloqueado: true,
      mesasAsignadas: {
        include: { mesa: true },
      },
      gestionadoPor: {
        select: { id: true, nombre: true, rol: true },
      },
    },
    orderBy: [{ fecha: 'asc' }, { creadoEn: 'desc' }],
  });
}

/**
 * Confirma un evento según las reglas de ARQUITECTURA.md §5.4:
 * 1. Modalidad ENTREGA: No bloquea nada.
 * 2. Modalidad EN_LOCAL con personas >= capacidadTotal:
 *    - Cierra el local creando DiaBloqueado con reservaId = evento.id.
 *    - Si ya estaba bloqueado manualmente por admin (reservaId === null), se mantiene intacto.
 *    - Si ya estaba bloqueado por OTRO evento o concurrencia, revierte con mensaje claro.
 * 3. Modalidad EN_LOCAL con personas < capacidadTotal:
 *    - No bloquea el día; asigna las mesas necesarias vía ReservaMesa.
 * Todo en una transacción atómica Serializable con auditoría.
 */
export async function confirmarEvento(
  eventoId: string,
  mesasAsignadasIds?: string[]
): Promise<{ id: string; cerroLocal: boolean; mensaje: string }> {
  const sesion = await exigirSesionServidor('eventos.confirmar');

  return prisma.$transaction(
    async (tx) => {
      const evento = await tx.reserva.findUnique({
        where: { id: eventoId },
      });

      if (!evento || evento.tipo !== 'EVENTO') {
        throw new Error('Evento no encontrado.');
      }

      // Idempotencia
      if (evento.estado === EstadoReserva.CONFIRMADA) {
        return {
          id: evento.id,
          cerroLocal: false,
          mensaje: 'El evento ya se encontraba confirmado.',
        };
      }

      validarTransicionReserva(evento.estado as EstadoReserva, EstadoReserva.CONFIRMADA);

      let cerroLocal = false;
      const capacidadTotal = await calcularCapacidadTotalLocal(tx);
      const personas = evento.personas || 0;

      if (evento.modalidad === 'EN_LOCAL') {
        if (personas >= capacidadTotal) {
          // Caso de cierre total del local
          const bloqueoExistente = await tx.diaBloqueado.findUnique({
            where: { fecha: evento.fecha },
          });

          if (bloqueoExistente) {
            if (bloqueoExistente.reservaId && bloqueoExistente.reservaId !== evento.id) {
              throw new Error(
                'Conflicto de fecha: El día ya se encuentra reservado y cerrado por otro evento confirmado.'
              );
            }
            // Si el bloqueo existente es manual de admin (reservaId == null), se respeta y no se sobreescribe
          } else {
            // Crear el bloqueo vinculado al evento
            await tx.diaBloqueado.create({
              data: {
                fecha: evento.fecha,
                motivo: `Cierre por evento de ${evento.clienteNombre} (${personas} personas)`,
                reservaId: evento.id,
                creadoPorId: sesion.usuario.id,
              },
            });
            cerroLocal = true;
          }
        } else {
          // personas < capacidadTotal: no bloquea el día, asigna mesas seleccionadas
          if (mesasAsignadasIds && mesasAsignadasIds.length > 0) {
            // Eliminar asignaciones previas si hubiera
            await tx.reservaMesa.deleteMany({ where: { reservaId: evento.id } });

            for (const mesaId of mesasAsignadasIds) {
              await tx.reservaMesa.create({
                data: {
                  reservaId: evento.id,
                  mesaId,
                },
              });
            }
          }
        }
      }

      await tx.reserva.update({
        where: { id: eventoId },
        data: {
          estado: EstadoReserva.CONFIRMADA,
          gestionadoPorId: sesion.usuario.id,
          gestionadoEn: new Date(),
        },
      });

      await registrarAuditoria(
        {
          usuarioId: sesion.usuario.id,
          accion: 'evento.confirmar',
          entidad: 'Evento',
          entidadId: eventoId,
          detalle: {
            modalidad: evento.modalidad,
            personas,
            cerroLocal,
            codigo: evento.codigo,
          },
        },
        tx
      );

      return {
        id: evento.id,
        cerroLocal,
        mensaje: cerroLocal
          ? 'Evento confirmado exitosamente. Se ha generado el cierre de local en el calendario.'
          : 'Evento confirmado exitosamente.',
      };
    },
    { isolationLevel: 'Serializable' }
  );
}

/**
 * Cancela un evento y libera ÚNICAMENTE el bloqueo que este mismo evento haya creado.
 * Si el bloqueo era manual del administrador, no lo elimina (§5.4).
 */
export async function cancelarEvento(eventoId: string): Promise<{ id: string }> {
  const sesion = await exigirSesionServidor('eventos.confirmar');

  return prisma.$transaction(async (tx) => {
    const evento = await tx.reserva.findUnique({
      where: { id: eventoId },
    });

    if (!evento || evento.tipo !== 'EVENTO') {
      throw new Error('Evento no encontrado.');
    }

    if (evento.estado === EstadoReserva.CANCELADA) {
      return { id: evento.id };
    }

    validarTransicionReserva(evento.estado as EstadoReserva, EstadoReserva.CANCELADA);

    // Eliminar únicamente el DiaBloqueado vinculado a este evento específico
    await tx.diaBloqueado.deleteMany({
      where: { reservaId: evento.id },
    });

    // Eliminar asignación de mesas del evento
    await tx.reservaMesa.deleteMany({
      where: { reservaId: evento.id },
    });

    await tx.reserva.update({
      where: { id: eventoId },
      data: {
        estado: EstadoReserva.CANCELADA,
        gestionadoPorId: sesion.usuario.id,
        gestionadoEn: new Date(),
      },
    });

    await registrarAuditoria(
      {
        usuarioId: sesion.usuario.id,
        accion: 'evento.cancelar',
        entidad: 'Evento',
        entidadId: eventoId,
        detalle: { codigo: evento.codigo },
      },
      tx
    );

    return { id: evento.id };
  });
}

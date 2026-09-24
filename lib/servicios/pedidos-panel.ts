// lib/servicios/pedidos-panel.ts — Gestión de pedidos en el panel con transiciones, idempotencia y auditoría.

import prisma from '../db';
import { EstadoPedido, validarTransicionPedido } from '../estados';
import { exigirSesionServidor } from '../auth/sesion';
import { registrarAuditoria } from '../auditoria';

/**
 * Lista pedidos para el panel con filtros opcionales.
 */
export async function listarPedidos(filtros?: {
  estado?: EstadoPedido;
  fecha?: Date;
}) {
  await exigirSesionServidor('pedidos.gestionar');

  const where: any = {};
  if (filtros?.estado) {
    where.estado = filtros.estado;
  }
  if (filtros?.fecha) {
    where.fechaDeseada = filtros.fecha;
  }

  return prisma.pedido.findMany({
    where,
    include: {
      items: true,
      gestionadoPor: {
        select: { id: true, nombre: true, rol: true },
      },
    },
    orderBy: { creadoEn: 'desc' },
  });
}

/**
 * Obtiene el número de otras solicitudes pendientes (pedidos o reservas) para la misma fecha.
 */
export async function contarSolicitudesPendientesMismaFecha(
  fechaDeseada: Date,
  omitirPedidoId?: string
): Promise<{ pedidosPendientes: number; reservasPendientes: number }> {
  const inicioDia = new Date(fechaDeseada);
  inicioDia.setUTCHours(0, 0, 0, 0);

  const finDia = new Date(fechaDeseada);
  finDia.setUTCHours(23, 59, 59, 999);

  const [pedidosPendientes, reservasPendientes] = await Promise.all([
    prisma.pedido.count({
      where: {
        fechaDeseada: { gte: inicioDia, lte: finDia },
        estado: 'PENDIENTE',
        id: omitirPedidoId ? { not: omitirPedidoId } : undefined,
      },
    }),
    prisma.reserva.count({
      where: {
        fecha: { gte: inicioDia, lte: finDia },
        estado: 'PENDIENTE',
      },
    }),
  ]);

  return { pedidosPendientes, reservasPendientes };
}

/**
 * Confirma un pedido fijando el totalAcordadoCentavos acordado con el cliente.
 * Garantiza idempotencia, validación de estado y auditoría atómica.
 */
export async function confirmarPedido(
  pedidoId: string,
  totalAcordadoCentavos: number
): Promise<{ id: string; advertenciaPendientes?: string }> {
  const sesion = await exigirSesionServidor('pedidos.gestionar');

  if (
    !Number.isInteger(totalAcordadoCentavos) ||
    totalAcordadoCentavos <= 0
  ) {
    throw new Error('El total acordado debe ser un monto entero positivo en centavos de Bs.');
  }

  return prisma.$transaction(async (tx) => {
    const pedido = await tx.pedido.findUnique({
      where: { id: pedidoId },
    });

    if (!pedido) {
      throw new Error('Pedido no encontrado.');
    }

    // Idempotencia: si ya está confirmado con el mismo monto, retornar sin efectos secundarios
    if (pedido.estado === 'CONFIRMADO' && pedido.totalAcordadoCentavos === totalAcordadoCentavos) {
      return { id: pedido.id };
    }

    validarTransicionPedido(pedido.estado as EstadoPedido, 'CONFIRMADO');

    await tx.pedido.update({
      where: { id: pedidoId },
      data: {
        estado: 'CONFIRMADO',
        totalAcordadoCentavos,
        gestionadoPorId: sesion.usuario.id,
        gestionadoEn: new Date(),
      },
    });

    await registrarAuditoria(
      {
        usuarioId: sesion.usuario.id,
        accion: 'pedido.confirmar',
        entidad: 'Pedido',
        entidadId: pedidoId,
        detalle: { totalAcordadoCentavos, codigo: pedido.codigo },
      },
      tx
    );

    // Revisar si hay otras pendientes para la misma fecha para alertar al operador
    const { pedidosPendientes, reservasPendientes } = await contarSolicitudesPendientesMismaFecha(
      pedido.fechaDeseada,
      pedido.id
    );

    let advertenciaPendientes: string | undefined;
    if (pedidosPendientes > 0 || reservasPendientes > 0) {
      advertenciaPendientes = `Atención: Hay ${pedidosPendientes} otro(s) pedido(s) y ${reservasPendientes} reserva(s) pendientes para esta misma fecha.`;
    }

    return { id: pedido.id, advertenciaPendientes };
  });
}

/**
 * Rechaza un pedido con un motivo opcional o requerido.
 */
export async function rechazarPedido(
  pedidoId: string,
  motivoRechazo?: string
): Promise<{ id: string }> {
  const sesion = await exigirSesionServidor('pedidos.gestionar');

  return prisma.$transaction(async (tx) => {
    const pedido = await tx.pedido.findUnique({ where: { id: pedidoId } });
    if (!pedido) {
      throw new Error('Pedido no encontrado.');
    }

    if (pedido.estado === 'RECHAZADO') {
      return { id: pedido.id };
    }

    validarTransicionPedido(pedido.estado as EstadoPedido, 'RECHAZADO');

    await tx.pedido.update({
      where: { id: pedidoId },
      data: {
        estado: 'RECHAZADO',
        motivoRechazo: motivoRechazo?.trim() || null,
        gestionadoPorId: sesion.usuario.id,
        gestionadoEn: new Date(),
      },
    });

    await registrarAuditoria(
      {
        usuarioId: sesion.usuario.id,
        accion: 'pedido.rechazar',
        entidad: 'Pedido',
        entidadId: pedidoId,
        detalle: { motivoRechazo, codigo: pedido.codigo },
      },
      tx
    );

    return { id: pedido.id };
  });
}

/**
 * Cancela un pedido previamente registrado o confirmado.
 */
export async function cancelarPedido(pedidoId: string): Promise<{ id: string }> {
  const sesion = await exigirSesionServidor('pedidos.gestionar');

  return prisma.$transaction(async (tx) => {
    const pedido = await tx.pedido.findUnique({ where: { id: pedidoId } });
    if (!pedido) {
      throw new Error('Pedido no encontrado.');
    }

    if (pedido.estado === 'CANCELADO') {
      return { id: pedido.id };
    }

    validarTransicionPedido(pedido.estado as EstadoPedido, 'CANCELADO');

    await tx.pedido.update({
      where: { id: pedidoId },
      data: {
        estado: 'CANCELADO',
        gestionadoPorId: sesion.usuario.id,
        gestionadoEn: new Date(),
      },
    });

    await registrarAuditoria(
      {
        usuarioId: sesion.usuario.id,
        accion: 'pedido.cancelar',
        entidad: 'Pedido',
        entidadId: pedidoId,
        detalle: { codigo: pedido.codigo },
      },
      tx
    );

    return { id: pedido.id };
  });
}

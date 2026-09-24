// lib/servicios/ventas.ts — Lógica de negocio de ventas, cobro en caja, adición a comandas y auditoría

import prisma from '../db';
import { EstadoVenta, MetodoPago, OrigenVenta, Prisma } from '@prisma/client';
import { exigirSesionServidor } from '../auth/sesion';
import { registrarAuditoria } from '../auditoria';
import { validarTransicionVenta, validarTransicionReserva } from '../estados';
import { obtenerHoyBolivia } from '../fechas';
import { RegistrarVentaSchema, CobrarVentaSchema, AnularVentaSchema } from '../validaciones/venta';

export interface RegistrarVentaParametros {
  mesaId?: string | null;
  origen?: OrigenVenta;
  items: Array<{
    productoId: string;
    cantidad: number;
  }>;
}

export interface CobrarVentaParametros {
  metodoPago: MetodoPago;
  referenciaPago?: string | null;
}

/**
 * Registra una venta en salón o mostrador.
 * Si es una mesa normal/sofá y ya tiene una cuenta abierta, agrega los ítems a la cuenta existente.
 * Si la mesa tenía una reserva confirmada de hoy, la pasa automáticamente a CUMPLIDA.
 * Los precios y nombres se copian desde la base de datos en el servidor en centavos.
 */
export async function registrarVenta(datos: RegistrarVentaParametros) {
  const sesion = await exigirSesionServidor('ventas.registrar');
  const validado = RegistrarVentaSchema.parse(datos);

  // 1. Obtener y validar productos en la BD
  const productoIds = Array.from(new Set(validado.items.map((i) => i.productoId)));
  const productosEnBd = await prisma.producto.findMany({
    where: {
      id: { in: productoIds },
      activo: true,
    },
    select: {
      id: true,
      nombre: true,
      precioCentavos: true,
    },
  });

  const mapaProductos = new Map(productosEnBd.map((p) => [p.id, p]));
  for (const item of validado.items) {
    const prod = mapaProductos.get(item.productoId);
    if (!prod) {
      throw new Error(`El producto con ID ${item.productoId} no existe o no está activo.`);
    }
  }

  // 2. Transacción atómica
  return await prisma.$transaction(async (tx) => {
    let mesa = null;
    let reservaCumplidaId: string | null = null;

    if (validado.mesaId) {
      mesa = await tx.mesa.findUnique({
        where: { id: validado.mesaId },
      });

      if (!mesa) {
        throw new Error('La mesa seleccionada no existe.');
      }
      if (!mesa.habilitada) {
        throw new Error(`La mesa "${mesa.nombre}" se encuentra fuera de servicio.`);
      }

      // Regla: Si es mesa normal/sofá (permiteVariasCuentas = false), solo una comanda abierta
      if (!mesa.permiteVariasCuentas) {
        const ventaAbiertaExistente = await tx.venta.findFirst({
          where: {
            mesaId: mesa.id,
            estado: EstadoVenta.PENDIENTE_COBRO,
          },
          include: { items: true },
        });

        // Si ya hay comanda abierta en la mesa: agregamos los ítems a la existente
        if (ventaAbiertaExistente) {
          let sumaCentavosNuevos = 0;
          const itemsNuevosData: Prisma.VentaItemCreateManyInput[] = [];

          for (const item of validado.items) {
            const prod = mapaProductos.get(item.productoId)!;
            const precioUnitario = prod.precioCentavos ?? 0;
            sumaCentavosNuevos += precioUnitario * item.cantidad;

            itemsNuevosData.push({
              ventaId: ventaAbiertaExistente.id,
              productoId: prod.id,
              nombre: prod.nombre,
              cantidad: item.cantidad,
              precioUnitarioCentavos: precioUnitario,
            });
          }

          await tx.ventaItem.createMany({
            data: itemsNuevosData,
          });

          const ventaActualizada = await tx.venta.update({
            where: { id: ventaAbiertaExistente.id },
            data: {
              totalCentavos: ventaAbiertaExistente.totalCentavos + sumaCentavosNuevos,
            },
            include: {
              items: true,
              mesa: true,
            },
          });

          await registrarAuditoria(
            {
              usuarioId: sesion.usuario.id,
              accion: 'venta.agregar_items',
              entidad: 'Venta',
              entidadId: ventaActualizada.id,
              detalle: {
                mesa: mesa.nombre,
                itemsAgregados: validado.items.length,
                totalCentavosNuevo: ventaActualizada.totalCentavos,
              },
            },
            tx
          );

          return {
            venta: ventaActualizada,
            esAgregadoAExistente: true,
            reservaCumplidaId: null,
          };
        }
      }

      // Si no había comanda abierta, verificamos si hay una reserva CONFIRMADA para hoy en esta mesa
      const hoy = obtenerHoyBolivia();
      const reservaHoy = await tx.reserva.findFirst({
        where: {
          mesaId: mesa.id,
          fecha: hoy,
          estado: 'CONFIRMADA',
        },
      });

      if (reservaHoy) {
        validarTransicionReserva(reservaHoy.estado, 'CUMPLIDA');
        await tx.reserva.update({
          where: { id: reservaHoy.id },
          data: {
            estado: 'CUMPLIDA',
            gestionadoEn: new Date(),
            gestionadoPorId: sesion.usuario.id,
          },
        });

        reservaCumplidaId = reservaHoy.id;

        await registrarAuditoria(
          {
            usuarioId: sesion.usuario.id,
            accion: 'reserva.marcar_cumplida',
            entidad: 'Reserva',
            entidadId: reservaHoy.id,
            detalle: { motivo: 'Comanda abierta en la mesa de la reserva' },
          },
          tx
        );
      }
    }

    // 3. Crear nueva comanda (Venta)
    let totalCentavosCalculado = 0;
    const itemsData = validado.items.map((item) => {
      const prod = mapaProductos.get(item.productoId)!;
      const precio = prod.precioCentavos ?? 0;
      totalCentavosCalculado += precio * item.cantidad;

      return {
        productoId: prod.id,
        nombre: prod.nombre,
        cantidad: item.cantidad,
        precioUnitarioCentavos: precio,
      };
    });

    const mesaCuentaUnicaAbiertaId = mesa && !mesa.permiteVariasCuentas ? mesa.id : null;

    const nuevaVenta = await tx.venta.create({
      data: {
        estado: EstadoVenta.PENDIENTE_COBRO,
        origen: validado.origen ?? (mesa ? OrigenVenta.SALON : OrigenVenta.MOSTRADOR),
        mesaId: mesa ? mesa.id : null,
        mesaCuentaUnicaAbiertaId,
        reservaId: reservaCumplidaId,
        totalCentavos: totalCentavosCalculado,
        registradaPorId: sesion.usuario.id,
        items: {
          create: itemsData,
        },
      },
      include: {
        items: true,
        mesa: true,
      },
    });

    await registrarAuditoria(
      {
        usuarioId: sesion.usuario.id,
        accion: 'venta.crear',
        entidad: 'Venta',
        entidadId: nuevaVenta.id,
        detalle: {
          origen: nuevaVenta.origen,
          mesa: mesa ? mesa.nombre : null,
          totalCentavos: totalCentavosCalculado,
          reservaCumplidaId,
        },
      },
      tx
    );

    return {
      venta: nuevaVenta,
      esAgregadoAExistente: false,
      reservaCumplidaId,
    };
  });
}

/**
 * Marca una venta como REALIZADA al momento de cobrarla en caja (mesero o admin).
 * Libera la mesa en la base de datos (mesaCuentaUnicaAbiertaId = null).
 */
export async function cobrarVenta(ventaId: string, datos: CobrarVentaParametros) {
  const sesion = await exigirSesionServidor('ventas.cobrar');
  const validado = CobrarVentaSchema.parse(datos);

  return await prisma.$transaction(async (tx) => {
    const venta = await tx.venta.findUnique({
      where: { id: ventaId },
      include: { mesa: true },
    });

    if (!venta) {
      throw new Error('La venta no existe.');
    }

    validarTransicionVenta(venta.estado, EstadoVenta.REALIZADA);

    const ventaCobrada = await tx.venta.update({
      where: { id: ventaId },
      data: {
        estado: EstadoVenta.REALIZADA,
        metodoPago: validado.metodoPago,
        referenciaPago: validado.referenciaPago,
        cobradaPorId: sesion.usuario.id,
        cobradaEn: new Date(),
        mesaCuentaUnicaAbiertaId: null, // Libera la mesa para la próxima venta
      },
      include: {
        items: true,
        mesa: true,
        cobradaPor: { select: { id: true, nombre: true } },
      },
    });

    await registrarAuditoria(
      {
        usuarioId: sesion.usuario.id,
        accion: 'venta.cobrar',
        entidad: 'Venta',
        entidadId: ventaCobrada.id,
        detalle: {
          totalCentavos: ventaCobrada.totalCentavos,
          metodoPago: ventaCobrada.metodoPago,
          referenciaPago: ventaCobrada.referenciaPago,
        },
      },
      tx
    );

    return ventaCobrada;
  });
}

/**
 * Anula una venta (exclusivo para ADMIN).
 * Libera la mesa en la base de datos (mesaCuentaUnicaAbiertaId = null) y registra auditoría.
 */
export async function anularVenta(ventaId: string, motivo: string) {
  const sesion = await exigirSesionServidor('ventas.anular');
  const validado = AnularVentaSchema.parse({ motivo });

  return await prisma.$transaction(async (tx) => {
    const venta = await tx.venta.findUnique({
      where: { id: ventaId },
      include: { mesa: true },
    });

    if (!venta) {
      throw new Error('La venta no existe.');
    }

    validarTransicionVenta(venta.estado, EstadoVenta.ANULADA);

    const ventaAnulada = await tx.venta.update({
      where: { id: ventaId },
      data: {
        estado: EstadoVenta.ANULADA,
        anuladaMotivo: validado.motivo,
        mesaCuentaUnicaAbiertaId: null, // Libera la mesa
      },
      include: {
        items: true,
        mesa: true,
      },
    });

    await registrarAuditoria(
      {
        usuarioId: sesion.usuario.id,
        accion: 'venta.anular',
        entidad: 'Venta',
        entidadId: ventaAnulada.id,
        detalle: {
          motivo: validado.motivo,
          estadoAnterior: venta.estado,
          totalCentavos: venta.totalCentavos,
        },
      },
      tx
    );

    return ventaAnulada;
  });
}

/**
 * Lista ventas para el panel de caja con filtros opcionales.
 */
export async function listarVentas(filtros?: {
  estado?: EstadoVenta;
  mesaId?: string;
  limite?: number;
}) {
  await exigirSesionServidor('ventas.registrar');

  const where: Prisma.VentaWhereInput = {};
  if (filtros?.estado) {
    where.estado = filtros.estado;
  }
  if (filtros?.mesaId) {
    where.mesaId = filtros.mesaId;
  }

  return prisma.venta.findMany({
    where,
    include: {
      items: true,
      mesa: true,
      registradaPor: { select: { id: true, nombre: true } },
      cobradaPor: { select: { id: true, nombre: true } },
      pedido: { select: { id: true, codigo: true, clienteNombre: true } },
      reserva: { select: { id: true, codigo: true, clienteNombre: true } },
    },
    orderBy: { creadaEn: 'desc' },
    take: filtros?.limite ?? 100,
  });
}

/**
 * Obtiene una venta por ID con todos sus detalles.
 */
export async function obtenerVentaPorId(id: string) {
  await exigirSesionServidor('ventas.registrar');

  return prisma.venta.findUnique({
    where: { id },
    include: {
      items: true,
      mesa: true,
      registradaPor: { select: { id: true, nombre: true } },
      cobradaPor: { select: { id: true, nombre: true } },
      pedido: true,
      reserva: true,
    },
  });
}

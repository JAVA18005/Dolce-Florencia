// lib/servicios/mesas.ts — Gestión de mesas y cálculo de estados derivados según ARQUITECTURA.md §5.2.

import prisma from '../db';
import { ZonaMesa } from '@prisma/client';
import { exigirSesionServidor } from '../auth/sesion';
import { registrarAuditoria } from '../auditoria';
import { obtenerHoyBolivia } from '../fechas';

export type EstadoMesaDerivado = 'LIBRE' | 'RESERVADA' | 'OCUPADA' | 'FUERA_DE_SERVICIO';

export interface MesaConEstado {
  id: string;
  nombre: string;
  zona: ZonaMesa;
  capacidad: number;
  reservable: boolean;
  permiteVariasCuentas: boolean;
  aceptaMascotas: boolean;
  habilitada: boolean;
  orden: number;
  estadoDerivado: EstadoMesaDerivado;
  cuentasAbiertas: number;
  ventaActivaId?: string | null;
  totalVentaActivaCentavos?: number;
}

/**
 * Lista todas las mesas del local calculando su estado derivado actual (§5.2).
 * - OCUPADA: existe venta en PENDIENTE_COBRO (mesas normales/sofá).
 * - La barra (permiteVariasCuentas = true): nunca se bloquea como OCUPADA, muestra número de cuentas abiertas.
 * - RESERVADA: existe reserva CONFIRMADA para hoy y no está ocupada.
 * - FUERA_DE_SERVICIO: habilitada = false.
 * - LIBRE: cualquier otro caso.
 */
export async function listarMesas(): Promise<MesaConEstado[]> {
  await exigirSesionServidor('mesas.ver');

  const hoy = obtenerHoyBolivia();

  const [mesas, reservasHoy, ventasAbiertas] = await Promise.all([
    prisma.mesa.findMany({
      orderBy: { orden: 'asc' },
    }),
    prisma.reserva.findMany({
      where: {
        fecha: hoy,
        estado: 'CONFIRMADA',
        mesaId: { not: null },
      },
      select: { mesaId: true },
    }),
    prisma.venta.findMany({
      where: {
        estado: 'PENDIENTE_COBRO',
        mesaId: { not: null },
      },
      select: {
        id: true,
        mesaId: true,
        totalCentavos: true,
      },
    }),
  ]);

  const mesasReservadasHoy = new Set(reservasHoy.map((r) => r.mesaId));

  // Agrupar ventas abiertas por mesaId
  const mapaVentasPorMesa = new Map<string, typeof ventasAbiertas>();
  for (const v of ventasAbiertas) {
    if (v.mesaId) {
      const lista = mapaVentasPorMesa.get(v.mesaId) || [];
      lista.push(v);
      mapaVentasPorMesa.set(v.mesaId, lista);
    }
  }

  return mesas.map((m) => {
    let estadoDerivado: EstadoMesaDerivado = 'LIBRE';
    const ventasDeEstaMesa = mapaVentasPorMesa.get(m.id) || [];
    const cuentasAbiertas = ventasDeEstaMesa.length;
    const primeraVenta = ventasDeEstaMesa[0] || null;

    if (!m.habilitada) {
      estadoDerivado = 'FUERA_DE_SERVICIO';
    } else if (cuentasAbiertas > 0 && !m.permiteVariasCuentas) {
      // Mesas normales y sofá con cuenta abierta -> OCUPADA
      estadoDerivado = 'OCUPADA';
    } else if (mesasReservadasHoy.has(m.id)) {
      // Si tiene reserva confirmada de hoy y no está ocupada
      estadoDerivado = 'RESERVADA';
    } else {
      // Libre (la barra con cuentas abiertas sigue disponible para más cuentas)
      estadoDerivado = 'LIBRE';
    }

    return {
      id: m.id,
      nombre: m.nombre,
      zona: m.zona,
      capacidad: m.capacidad,
      reservable: m.reservable,
      permiteVariasCuentas: m.permiteVariasCuentas,
      aceptaMascotas: m.aceptaMascotas,
      habilitada: m.habilitada,
      orden: m.orden,
      estadoDerivado,
      cuentasAbiertas,
      ventaActivaId: primeraVenta ? primeraVenta.id : null,
      totalVentaActivaCentavos: primeraVenta ? primeraVenta.totalCentavos : undefined,
    };
  });
}

/**
 * Habilita o deshabilita una mesa (solo ADMIN).
 */
export async function alternarHabilitacionMesa(
  mesaId: string,
  habilitada: boolean
): Promise<{ id: string; habilitada: boolean }> {
  const sesion = await exigirSesionServidor('mesas.gestionar');

  const mesa = await prisma.mesa.update({
    where: { id: mesaId },
    data: { habilitada },
  });

  await registrarAuditoria({
    usuarioId: sesion.usuario.id,
    accion: habilitada ? 'mesa.habilitar' : 'mesa.deshabilitar',
    entidad: 'Mesa',
    entidadId: mesaId,
    detalle: { nombre: mesa.nombre },
  });

  return { id: mesa.id, habilitada: mesa.habilitada };
}

/**
 * Sugiere mesas libres con capacidad suficiente y que acepten mascotas para una solicitud de reserva.
 */
export async function sugerirMesasLibres(params: {
  fecha: Date;
  personas: number;
  conMascota: boolean;
  hora?: string;
  omitirReservaId?: string;
}) {
  const { fecha, personas, conMascota, omitirReservaId } = params;

  const fechaNorm = new Date(fecha);
  fechaNorm.setUTCHours(0, 0, 0, 0);

  // 1. Obtener mesas ocupadas por reservas confirmadas en esa fecha
  const reservasConfirmadas = await prisma.reserva.findMany({
    where: {
      fecha: fechaNorm,
      estado: 'CONFIRMADA',
      mesaId: { not: null },
      id: omitirReservaId ? { not: omitirReservaId } : undefined,
    },
    select: { mesaId: true },
  });

  const idsMesasOcupadas = new Set(reservasConfirmadas.map((r) => r.mesaId));

  // 2. Filtrar mesas candidatas
  const mesasCandidatas = await prisma.mesa.findMany({
    where: {
      habilitada: true,
      reservable: true, // la barra queda excluida automáticamente
      capacidad: { gte: personas },
      ...(conMascota ? { aceptaMascotas: true } : {}),
    },
    orderBy: [
      { capacidad: 'asc' }, // Ajuste más óptimo primero
      { orden: 'asc' },
    ],
  });

  return mesasCandidatas.map((m) => ({
    ...m,
    disponible: !idsMesasOcupadas.has(m.id),
  }));
}

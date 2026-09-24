// lib/servicios/disponibilidad.ts — Lógica de disponibilidad de calendario y capacidad de mesas.

import prisma from '../db';
import { fechaAYMD } from '../fechas';
import { ZonaMesa } from '@prisma/client';

export interface CapacidadZonaInfo {
  capacidadTotal: number;
  mesasReservables: number;
}

/**
 * Obtiene la lista de fechas (strings "YYYY-MM-DD") bloqueadas en la base de datos (DiaBloqueado).
 */
export async function obtenerFechasBloqueadas(): Promise<string[]> {
  const bloqueos = await prisma.diaBloqueado.findMany({
    select: { fecha: true },
    orderBy: { fecha: 'asc' },
  });

  return bloqueos.map((b) => fechaAYMD(b.fecha));
}

/**
 * Verifica si una fecha específica se encuentra en DiaBloqueado.
 */
export async function estaDiaBloqueado(fecha: Date): Promise<boolean> {
  const bloqueo = await prisma.diaBloqueado.findUnique({
    where: { fecha },
  });
  return bloqueo !== null;
}

/**
 * Obtiene la capacidad total de mesas habilitadas y reservables por zona.
 * - Interior: Mesas 1, 2, 3 (cap 3) + Mesa 4 (cap 4) + Sofá (cap 5) = 18 personas.
 * - Exterior: Terraza 1, 2 (cap 2) = 4 personas.
 * - Barra: NO es reservable (reservable = false).
 */
export async function obtenerCapacidadZona(zona: ZonaMesa): Promise<CapacidadZonaInfo> {
  const zonasFiltrar =
    zona === ZonaMesa.INTERIOR
      ? [ZonaMesa.INTERIOR, ZonaMesa.SOFA]
      : [zona];

  const mesas = await prisma.mesa.findMany({
    where: {
      zona: { in: zonasFiltrar },
      habilitada: true,
      reservable: true,
    },
    select: { capacidad: true },
  });

  const capacidadTotal = mesas.reduce((sum, m) => sum + m.capacidad, 0);
  return {
    capacidadTotal,
    mesasReservables: mesas.length,
  };
}

/**
 * Convierte un string "HH:mm" a minutos desde medianoche.
 */
export function horaAMinutos(horaStr: string): number {
  const [h, m] = horaStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Determina si dos turnos de 90 minutos se traslapan.
 * Se traslapan si y solo si |T1 - T2| < 90 minutos.
 */
export function hayTraslapeTurnos(hora1: string, hora2: string, duracionMinutos = 90): boolean {
  const m1 = horaAMinutos(hora1);
  const m2 = horaAMinutos(hora2);
  return Math.abs(m1 - m2) < duracionMinutos;
}

/**
 * Verifica disponibilidad de salón para una reserva considerando:
 * 1. Que el día no esté bloqueado (DiaBloqueado).
 * 2. Que el número de personas no exceda la capacidad total de la zona.
 * 3. Que la suma de personas en reservas vigentes (CONFIRMADAS o PENDIENTES) en la misma
 *    zona con traslape de turnos de 90 minutos no supere la capacidad de la zona.
 */
export async function verificarDisponibilidadReserva(
  fecha: Date,
  hora: string,
  personas: number,
  zona: 'INTERIOR' | 'EXTERIOR',
  tx = prisma
): Promise<{ disponible: boolean; motivo?: string }> {
  // 1. Verificar si el día está bloqueado
  const bloqueado = await tx.diaBloqueado.findUnique({
    where: { fecha },
  });

  if (bloqueado) {
    return {
      disponible: false,
      motivo: `El local no recibe reservas para esta fecha (${bloqueado.motivo}).`,
    };
  }

  // 2. Verificar capacidad máxima de la zona
  // El Sofá está dentro de la zona interior como mesa de 5 personas
  const mesasHabilitadas = await tx.mesa.findMany({
    where: {
      zona: zona === 'INTERIOR' ? { in: [ZonaMesa.INTERIOR, ZonaMesa.SOFA] } : ZonaMesa.EXTERIOR,
      habilitada: true,
      reservable: true,
    },
    select: { capacidad: true },
  });

  const capacidadTotalZona = mesasHabilitadas.reduce((acc, m) => acc + m.capacidad, 0);

  if (personas > capacidadTotalZona) {
    return {
      disponible: false,
      motivo: `La cantidad de personas (${personas}) excede la capacidad máxima disponible en la zona ${zona.toLowerCase()} (${capacidadTotalZona} personas).`,
    };
  }

  // 3. Verificar saturación de reservas para la misma fecha con traslape de 90 minutos
  const reservasDia = await tx.reserva.findMany({
    where: {
      fecha,
      estado: { in: ['CONFIRMADA', 'PENDIENTE'] },
      tipo: 'MESA',
    },
    select: { hora: true, personas: true, detalles: true },
  });

  const reservasTraslapadas = reservasDia.filter((r) => {
    if (!r.hora) return false;

    // Determinar zona de la reserva existente (default INTERIOR)
    const esExterior = r.detalles?.includes('[Zona preferida: EXTERIOR]');
    const zonaReserva = esExterior ? 'EXTERIOR' : 'INTERIOR';
    if (zonaReserva !== zona) return false;

    return hayTraslapeTurnos(r.hora, hora, 90);
  });

  const personasOcupadas = reservasTraslapadas.reduce((acc, r) => acc + (r.personas || 0), 0);

  if (personasOcupadas + personas > capacidadTotalZona) {
    return {
      disponible: false,
      motivo: `No hay suficiente cupo en la zona ${zona.toLowerCase()} para el horario de las ${hora} (turnos de 90 min).`,
    };
  }

  return { disponible: true };
}

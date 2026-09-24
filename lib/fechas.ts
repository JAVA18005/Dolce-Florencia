// lib/fechas.ts — Fechas y zona horaria para Bolivia (America/La_Paz, UTC-4).
// ARQUITECTURA.md §5.7: Interpretar "hoy" siempre en America/La_Paz, no en la zona del servidor.

export const ZONA_HORARIA_BOLIVIA = 'America/La_Paz';

/**
 * Obtiene la fecha y hora actual en la zona horaria de Bolivia como un objeto Date.
 */
export function obtenerFechaActualBolivia(): Date {
  const ahora = new Date();
  const fechaStr = ahora.toLocaleString('en-US', { timeZone: ZONA_HORARIA_BOLIVIA });
  return new Date(fechaStr);
}

/**
 * Retorna la fecha de hoy (año, mes, día a medianoche UTC) calculada desde America/La_Paz.
 */
export function obtenerHoyBolivia(): Date {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA_BOLIVIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()); // Formato YYYY-MM-DD

  const [year, month, day] = partes.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Convierte una fecha (@db.Date UTC medianoche) a string "YYYY-MM-DD".
 */
export function fechaAYMD(fecha: Date): string {
  const y = fecha.getUTCFullYear();
  const m = String(fecha.getUTCMonth() + 1).padStart(2, '0');
  const d = String(fecha.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Obtiene la hora actual "HH:mm" en America/La_Paz.
 */
export function obtenerHoraActualHHMM(): string {
  return new Intl.DateTimeFormat('es-BO', {
    timeZone: ZONA_HORARIA_BOLIVIA,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

/**
 * Formatea una fecha para presentación amigable en español (ej: "Lunes, 24 de septiembre").
 */
export function formatearFechaEspanol(fecha: Date): string {
  return new Intl.DateTimeFormat('es-BO', {
    timeZone: 'UTC',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(fecha);
}

export const HORIZONTE_DIAS_RESERVA = 60; // 2 meses
export const HORIZONTE_DIAS_EVENTO = 180; // 6 meses

/**
 * Parsea un string "YYYY-MM-DD" a Date en UTC medianoche para @db.Date.
 */
export function parseYMDToDate(ymd: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [year, month, day] = ymd.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  if (isNaN(d.getTime())) return null;
  return d;
}

/**
 * Verifica si una fecha cae entre hoy (inclusive) y el horizonte máximo en días.
 */
export function esFechaFuturaValida(fecha: Date, maxDias: number): boolean {
  const hoy = obtenerHoyBolivia();
  const limite = new Date(hoy.getTime() + maxDias * 24 * 60 * 60 * 1000);

  const fechaUtc = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));
  return fechaUtc.getTime() >= hoy.getTime() && fechaUtc.getTime() <= limite.getTime();
}

/**
 * Valida si una hora "HH:mm" se encuentra dentro del rango de atención para reservas.
 * ARQUITECTURA.md §10: 15:00 a 22:00, última hora de llegada: 21:30.
 */
export function esHoraLlegadaValida(
  hora: string,
  horaApertura = '15:00',
  ultimaLlegada = '21:30'
): boolean {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) return false;
  return hora >= horaApertura && hora <= ultimaLlegada;
}


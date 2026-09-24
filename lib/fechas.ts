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
 * Convierte una fecha a string YYYY-MM-DD en America/La_Paz.
 */
export function fechaAYMD(fecha: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA_BOLIVIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(fecha);
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
    timeZone: ZONA_HORARIA_BOLIVIA,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(fecha);
}

// lib/dinero.ts — Manejo exacto de dinero en centavos de Bolivianos (Bs).

/**
 * Formatea un valor en centavos a texto para mostrar al usuario.
 * Ejemplos:
 * 1200 -> "Bs 12"
 * 1250 -> "Bs 12,50"
 * null / undefined -> "Consultar"
 */
export function formatearCentavosABs(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) {
    return 'Consultar';
  }

  const bolivianos = centavos / 100;
  if (Number.isInteger(bolivianos)) {
    return `Bs ${bolivianos}`;
  }

  return `Bs ${bolivianos.toFixed(2).replace('.', ',')}`;
}

/**
 * Convierte Bolivianos decimales a centavos enteros sin errores de coma flotante.
 */
export function bsACentavos(bs: number): number {
  return Math.round(bs * 100);
}

/**
 * Convierte centavos a número en Bolivianos.
 */
export function centavosABsNumero(centavos: number): number {
  return centavos / 100;
}

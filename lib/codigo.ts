// lib/codigo.ts — Generación de códigos únicos legibles (DF-XXXXXX).
// Excluye caracteres ambiguos: 0, O, 1, I.

import crypto from 'node:crypto';

const CARACTERES_LEGIBLES = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Genera un código aleatorio no secuencial en formato DF-XXXXXX.
 */
export function generarCodigoSeguimiento(): string {
  const longitud = 6;
  const bytes = crypto.randomBytes(longitud);
  let resultado = '';

  for (let i = 0; i < longitud; i++) {
    const indice = bytes[i] % CARACTERES_LEGIBLES.length;
    resultado += CARACTERES_LEGIBLES[indice];
  }

  return `DF-${resultado}`;
}

/**
 * Valida si un string tiene el formato válido de código DF-XXXXXX.
 */
export function validarFormatoCodigo(codigo: string | null | undefined): boolean {
  if (!codigo) return false;
  return /^DF-[2-9A-HJ-NP-Z]{6}$/i.test(codigo.trim());
}

export const esCodigoValido = validarFormatoCodigo;


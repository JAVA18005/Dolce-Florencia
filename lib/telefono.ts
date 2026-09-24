// lib/telefono.ts — Normalización y validación estricta de teléfonos en Bolivia (591XXXXXXXX).

/**
 * Normaliza un número telefónico al estándar boliviano: 591 + 8 dígitos (591XXXXXXXX).
 * Acepta formatos como: "78198181", "+591 78198181", "591-78198181", "781-98181", etc.
 * Retorna null si no es un número válido de 8 dígitos de Bolivia.
 */
export function normalizarTelefono(input: string | null | undefined): string | null {
  if (!input) return null;

  // Eliminar todo lo que no sea dígito
  const digitos = input.replace(/\D/g, '');

  // Caso 1: Ingresó 8 dígitos locales (ej. 78198181)
  if (digitos.length === 8) {
    return `591${digitos}`;
  }

  // Caso 2: Ingresó con prefijo internacional 591 (11 dígitos en total, ej. 59178198181)
  if (digitos.length === 11 && digitos.startsWith('591')) {
    return digitos;
  }

  return null;
}

/**
 * Verifica si una cadena corresponde a un teléfono boliviano válido (normalizado a 591XXXXXXXX).
 */
export function esTelefonoBolivianoValido(input: string | null | undefined): boolean {
  const normalizado = normalizarTelefono(input);
  if (!normalizado) return false;
  return /^591\d{8}$/.test(normalizado);
}

/**
 * Extrae los últimos 4 dígitos de un número de teléfono.
 */
export function obtenerUltimos4Digitos(telefono: string): string {
  const digitos = telefono.replace(/\D/g, '');
  if (digitos.length < 4) return '';
  return digitos.slice(-4);
}

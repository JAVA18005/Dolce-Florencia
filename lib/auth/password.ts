// lib/auth/password.ts — Hashing y verificación de contraseñas de personal con bcryptjs.

import bcrypt from 'bcryptjs';

export const COSTO_BCRYPT = 10;

/**
 * Hash falso generado con el MISMO factor de costo compartido (COSTO_BCRYPT).
 * Se utiliza para ejecutar la misma cantidad de rondas de bcrypt cuando un usuario no existe,
 * mitigando ataques de temporización (timing attacks) para enumeración de usuarios.
 */
export const HASH_FALSO = bcrypt.hashSync('clave_falsa_para_timing_dolce_florencia', COSTO_BCRYPT);

/**
 * Genera un hash seguro para la contraseña de un usuario del personal.
 */
export async function hashearPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COSTO_BCRYPT);
}

/**
 * Verifica una contraseña en texto plano contra un hash bcrypt almacenado.
 */
export async function verificarPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

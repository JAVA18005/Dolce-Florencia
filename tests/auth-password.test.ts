import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { hashearPassword, verificarPassword, HASH_FALSO, COSTO_BCRYPT } from '../lib/auth/password';
import { validarPasswordAdmin } from '../scripts/crear-admin';

describe('lib/auth/password — Hash y verificación con bcryptjs', () => {
  it('genera un hash bcrypt válido y diferente para la misma contraseña (salteado dinámico)', async () => {
    const password = 'MiPasswordSuperSegura123!';
    const hash1 = await hashearPassword(password);
    const hash2 = await hashearPassword(password);

    expect(hash1).toMatch(/^\$2[aby]\$\d{2}\$/);
    expect(hash2).toMatch(/^\$2[aby]\$\d{2}\$/);
    expect(hash1).not.toBe(hash2); // Salteado único
  });

  it('verifica exitosamente la contraseña correcta contra su hash', async () => {
    const password = 'ClaveDeAdmin2026#';
    const hash = await hashearPassword(password);

    const esValida = await verificarPassword(password, hash);
    expect(esValida).toBe(true);
  });

  it('rechaza contraseñas incorrectas', async () => {
    const hash = await hashearPassword('Correcta123456');
    const esValida = await verificarPassword('Incorrecta123456', hash);
    expect(esValida).toBe(false);
  });

  describe('HASH_FALSO y mitigación de timing attacks', () => {
    it('HASH_FALSO tiene exactamente el factor de costo esperado (COSTO_BCRYPT)', () => {
      const rondas = bcrypt.getRounds(HASH_FALSO);
      expect(rondas).toBe(COSTO_BCRYPT);
    });

    it('los hashes reales tienen el mismo factor de costo que HASH_FALSO', async () => {
      const hashReal = await hashearPassword('PasswordReal123');
      const rondasReal = bcrypt.getRounds(hashReal);
      const rondasFalso = bcrypt.getRounds(HASH_FALSO);

      expect(rondasReal).toBe(COSTO_BCRYPT);
      expect(rondasFalso).toBe(COSTO_BCRYPT);
      expect(rondasReal).toBe(rondasFalso);
    });

    it('comparar contra HASH_FALSO para usuario inexistente sigue el mismo camino criptográfico y retorna false', async () => {
      const esValida = await verificarPassword('PasswordDeUsuarioInexistente', HASH_FALSO);
      expect(esValida).toBe(false);
    });
  });
});

describe('scripts/crear-admin.ts — Validación de longitud de contraseña admin', () => {
  it('acepta contraseñas válidas (>= 12 caracteres y <= 72 bytes UTF-8)', () => {
    const res1 = validarPasswordAdmin('AdminPasswordSegura123!');
    expect(res1.valida).toBe(true);

    // Exactamente 72 bytes ASCII
    const res72 = validarPasswordAdmin('A'.repeat(72));
    expect(res72.valida).toBe(true);
  });

  it('rechaza contraseñas de menos de 12 caracteres', () => {
    const res = validarPasswordAdmin('Corta123!');
    expect(res.valida).toBe(false);
    expect(res.error).toContain('al menos 12 caracteres');
  });

  it('rechaza contraseñas de más de 72 bytes en ASCII', () => {
    const pass73 = 'A'.repeat(73);
    const res = validarPasswordAdmin(pass73);
    expect(res.valida).toBe(false);
    expect(res.error).toContain('no puede exceder 72 bytes en UTF-8');
  });

  it('rechaza contraseñas que exceden 72 bytes debido a caracteres multi-byte UTF-8', () => {
    // Carácter 'ñ' ocupa 2 bytes en UTF-8. 37 caracteres 'ñ' = 74 bytes (aunque son solo 37 caracteres)
    const passMultiByte = 'ñ'.repeat(37);
    expect(passMultiByte.length).toBe(37);
    expect(Buffer.byteLength(passMultiByte, 'utf8')).toBe(74);

    const res = validarPasswordAdmin(passMultiByte);
    expect(res.valida).toBe(false);
    expect(res.error).toContain('no puede exceder 72 bytes en UTF-8');
  });
});

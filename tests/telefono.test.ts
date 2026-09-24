import { describe, it, expect } from 'vitest';
import { normalizarTelefono, obtenerUltimos4Digitos } from '../lib/telefono';

describe('lib/telefono — Normalización de números bolivianos', () => {
  it('normaliza un número local de 8 dígitos a formato internacional 591', () => {
    expect(normalizarTelefono('78198181')).toBe('59178198181');
    expect(normalizarTelefono('67012345')).toBe('59167012345');
    expect(normalizarTelefono('22441234')).toBe('59122441234');
  });

  it('normaliza números con prefijos +591 o 591', () => {
    expect(normalizarTelefono('+59178198181')).toBe('59178198181');
    expect(normalizarTelefono('59178198181')).toBe('59178198181');
  });

  it('limpia espacios, guiones y paréntesis', () => {
    expect(normalizarTelefono('+591 (78) 19-8181')).toBe('59178198181');
    expect(normalizarTelefono(' 781 98 181 ')).toBe('59178198181');
  });

  it('rechaza números con longitud inválida o de otros países', () => {
    expect(normalizarTelefono('1234567')).toBeNull(); // 7 dígitos
    expect(normalizarTelefono('123456789')).toBeNull(); // 9 dígitos
    expect(normalizarTelefono('+5491112345678')).toBeNull(); // Argentina
    expect(normalizarTelefono('abc78198181')).toBe('59178198181'); // si extrae exactamente 8 dígitos
    expect(normalizarTelefono('')).toBeNull();
  });

  it('obtiene los últimos 4 dígitos de un número para seguimiento seguro', () => {
    expect(obtenerUltimos4Digitos('59178198181')).toBe('8181');
    expect(obtenerUltimos4Digitos('+591 7819-8181')).toBe('8181');
    expect(obtenerUltimos4Digitos('123')).toBe(''); // Menos de 4 dígitos
  });
});

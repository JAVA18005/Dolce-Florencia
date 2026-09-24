import { describe, it, expect } from 'vitest';
import { generarCodigoSeguimiento, esCodigoValido } from '../lib/codigo';

describe('lib/codigo — Códigos de seguimiento únicos y legibles', () => {
  it('genera códigos con prefijo DF- y 6 caracteres alfanuméricos', () => {
    const codigo = generarCodigoSeguimiento();
    expect(codigo).toMatch(/^DF-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
    expect(esCodigoValido(codigo)).toBe(true);
  });

  it('excluye caracteres ambiguos (0, O, 1, I)', () => {
    // Generamos una muestra grande para verificar que ninguno de los caracteres confusos aparezca
    for (let i = 0; i < 150; i++) {
      const codigo = generarCodigoSeguimiento();
      expect(codigo).not.toMatch(/[01OI]/);
      expect(codigo.length).toBe(9); // DF- + 6 caracteres
    }
  });

  it('valida correctamente el formato con esCodigoValido', () => {
    expect(esCodigoValido('DF-ABCDEF')).toBe(true);
    expect(esCodigoValido('df-abcdef')).toBe(true); // Insensible a mayúsculas
    expect(esCodigoValido('DF-123456')).toBe(false); // Contiene '1'
    expect(esCodigoValido('DF-O23456')).toBe(false); // Contiene 'O'
    expect(esCodigoValido('XX-ABCDEF')).toBe(false); // Prefijo incorrecto
    expect(esCodigoValido('DF-ABCDE')).toBe(false); // Muy corto
    expect(esCodigoValido('DF-ABCDEFG')).toBe(false); // Muy largo
  });
});

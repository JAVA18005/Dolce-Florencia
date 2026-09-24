// tests/dinero.test.ts
import { describe, it, expect } from 'vitest';
import { formatearCentavosABs, bsACentavos, centavosABsNumero } from '../lib/dinero';

describe('Manejo de dinero y centavos (lib/dinero.ts)', () => {
  it('formatea montos enteros en Bolivianos sin decimales innecesarios', () => {
    expect(formatearCentavosABs(1200)).toBe('Bs 12');
    expect(formatearCentavosABs(1500)).toBe('Bs 15');
    expect(formatearCentavosABs(3000)).toBe('Bs 30');
    expect(formatearCentavosABs(500)).toBe('Bs 5');
  });

  it('formatea montos con centavos usando coma como separador decimal', () => {
    expect(formatearCentavosABs(1250)).toBe('Bs 12,50');
    expect(formatearCentavosABs(1850)).toBe('Bs 18,50');
    expect(formatearCentavosABs(250)).toBe('Bs 2,50');
  });

  it('devuelve "Consultar" cuando el precio es null o undefined', () => {
    expect(formatearCentavosABs(null)).toBe('Consultar');
    expect(formatearCentavosABs(undefined)).toBe('Consultar');
  });

  it('convierte bolivianos a centavos enteros con precisión', () => {
    expect(bsACentavos(12)).toBe(1200);
    expect(bsACentavos(12.5)).toBe(1250);
    expect(bsACentavos(18.5)).toBe(1850);
    expect(bsACentavos(0)).toBe(0);
  });

  it('convierte centavos a número decimal en bolivianos', () => {
    expect(centavosABsNumero(1200)).toBe(12);
    expect(centavosABsNumero(1250)).toBe(12.5);
    expect(centavosABsNumero(2500)).toBe(25);
  });
});

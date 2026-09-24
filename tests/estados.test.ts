// tests/estados.test.ts
import { describe, it, expect } from 'vitest';
import {
  esTransicionPedidoValida,
  esTransicionReservaValida,
  esTransicionVentaValida,
  validarTransicionPedido,
  validarTransicionReserva,
  validarTransicionVenta,
} from '../lib/estados';

describe('Transiciones de Estado - Pedido (ARQUITECTURA.md §5.1)', () => {
  it('permite transiciones válidas desde PENDIENTE', () => {
    expect(esTransicionPedidoValida('PENDIENTE', 'CONFIRMADO')).toBe(true);
    expect(esTransicionPedidoValida('PENDIENTE', 'RECHAZADO')).toBe(true);
    expect(esTransicionPedidoValida('PENDIENTE', 'CANCELADO')).toBe(true);
  });

  it('permite transiciones válidas desde CONFIRMADO', () => {
    expect(esTransicionPedidoValida('CONFIRMADO', 'ENTREGADO')).toBe(true);
    expect(esTransicionPedidoValida('CONFIRMADO', 'CANCELADO')).toBe(true);
  });

  it('rechaza transiciones inválidas para Pedido', () => {
    expect(esTransicionPedidoValida('PENDIENTE', 'ENTREGADO')).toBe(false);
    expect(esTransicionPedidoValida('ENTREGADO', 'CANCELADO')).toBe(false);
    expect(esTransicionPedidoValida('RECHAZADO', 'CONFIRMADO')).toBe(false);
    expect(esTransicionPedidoValida('CANCELADO', 'PENDIENTE')).toBe(false);

    expect(() => validarTransicionPedido('PENDIENTE', 'ENTREGADO')).toThrow(
      /Transición inválida de Pedido/
    );
  });
});

describe('Transiciones de Estado - Reserva (ARQUITECTURA.md §5.1)', () => {
  it('permite transiciones válidas desde PENDIENTE', () => {
    expect(esTransicionReservaValida('PENDIENTE', 'CONFIRMADA')).toBe(true);
    expect(esTransicionReservaValida('PENDIENTE', 'RECHAZADA')).toBe(true);
    expect(esTransicionReservaValida('PENDIENTE', 'CANCELADA')).toBe(true);
  });

  it('permite transiciones válidas desde CONFIRMADA', () => {
    expect(esTransicionReservaValida('CONFIRMADA', 'CUMPLIDA')).toBe(true);
    expect(esTransicionReservaValida('CONFIRMADA', 'NO_LLEGO')).toBe(true);
    expect(esTransicionReservaValida('CONFIRMADA', 'CANCELADA')).toBe(true);
  });

  it('rechaza transiciones inválidas para Reserva', () => {
    expect(esTransicionReservaValida('PENDIENTE', 'CUMPLIDA')).toBe(false);
    expect(esTransicionReservaValida('CUMPLIDA', 'PENDIENTE')).toBe(false);
    expect(esTransicionReservaValida('NO_LLEGO', 'CONFIRMADA')).toBe(false);
    expect(esTransicionReservaValida('CANCELADA', 'CONFIRMADA')).toBe(false);

    expect(() => validarTransicionReserva('PENDIENTE', 'CUMPLIDA')).toThrow(
      /Transición inválida de Reserva/
    );
  });
});

describe('Transiciones de Estado - Venta (ARQUITECTURA.md §5.1)', () => {
  it('permite transiciones válidas de Venta', () => {
    expect(esTransicionVentaValida('PENDIENTE_COBRO', 'REALIZADA')).toBe(true);
    expect(esTransicionVentaValida('PENDIENTE_COBRO', 'ANULADA')).toBe(true);
    expect(esTransicionVentaValida('REALIZADA', 'ANULADA')).toBe(true);
  });

  it('rechaza transiciones inválidas desde estados finales', () => {
    expect(esTransicionVentaValida('ANULADA', 'REALIZADA')).toBe(false);
    expect(esTransicionVentaValida('ANULADA', 'PENDIENTE_COBRO')).toBe(false);

    expect(() => validarTransicionVenta('ANULADA', 'REALIZADA')).toThrow(
      /Transición inválida de Venta/
    );
  });
});

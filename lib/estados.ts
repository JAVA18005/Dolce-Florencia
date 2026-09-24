// lib/estados.ts — Reglas de transiciones de estados según ARQUITECTURA.md §5.1

export type EstadoPedido =
  | 'PENDIENTE'
  | 'CONFIRMADO'
  | 'RECHAZADO'
  | 'ENTREGADO'
  | 'CANCELADO';

export type EstadoReserva =
  | 'PENDIENTE'
  | 'CONFIRMADA'
  | 'CUMPLIDA'
  | 'NO_LLEGO'
  | 'RECHAZADA'
  | 'CANCELADA';

export type EstadoVenta =
  | 'PENDIENTE_COBRO'
  | 'REALIZADA'
  | 'ANULADA';

export const TRANSICIONES_PEDIDO: Record<EstadoPedido, readonly EstadoPedido[]> = {
  PENDIENTE: ['CONFIRMADO', 'RECHAZADO', 'CANCELADO'],
  CONFIRMADO: ['ENTREGADO', 'CANCELADO'],
  RECHAZADO: [],
  ENTREGADO: [],
  CANCELADO: [],
} as const;

export const TRANSICIONES_RESERVA: Record<EstadoReserva, readonly EstadoReserva[]> = {
  PENDIENTE: ['CONFIRMADA', 'RECHAZADA', 'CANCELADA'],
  CONFIRMADA: ['CUMPLIDA', 'NO_LLEGO', 'CANCELADA'],
  CUMPLIDA: [],
  NO_LLEGO: [],
  RECHAZADA: [],
  CANCELADA: [],
} as const;

export const TRANSICIONES_VENTA: Record<EstadoVenta, readonly EstadoVenta[]> = {
  PENDIENTE_COBRO: ['REALIZADA', 'ANULADA'],
  REALIZADA: ['ANULADA'], // Solo admin según permisos en §4
  ANULADA: [],
} as const;

export function esTransicionPedidoValida(
  actual: EstadoPedido,
  siguiente: EstadoPedido
): boolean {
  return TRANSICIONES_PEDIDO[actual].includes(siguiente);
}

export function esTransicionReservaValida(
  actual: EstadoReserva,
  siguiente: EstadoReserva
): boolean {
  return TRANSICIONES_RESERVA[actual].includes(siguiente);
}

export function esTransicionVentaValida(
  actual: EstadoVenta,
  siguiente: EstadoVenta
): boolean {
  return TRANSICIONES_VENTA[actual].includes(siguiente);
}

export function validarTransicionPedido(actual: EstadoPedido, siguiente: EstadoPedido): void {
  if (!esTransicionPedidoValida(actual, siguiente)) {
    throw new Error(`Transición inválida de Pedido: ${actual} -> ${siguiente}`);
  }
}

export function validarTransicionReserva(actual: EstadoReserva, siguiente: EstadoReserva): void {
  if (!esTransicionReservaValida(actual, siguiente)) {
    throw new Error(`Transición inválida de Reserva: ${actual} -> ${siguiente}`);
  }
}

export function validarTransicionVenta(actual: EstadoVenta, siguiente: EstadoVenta): void {
  if (!esTransicionVentaValida(actual, siguiente)) {
    throw new Error(`Transición inválida de Venta: ${actual} -> ${siguiente}`);
  }
}

'use server';

import { revalidatePath } from 'next/cache';
import { confirmarPedido, rechazarPedido, cancelarPedido } from '@/lib/servicios/pedidos-panel';

export async function confirmarPedidoAction(
  pedidoId: string,
  totalAcordadoCentavos: number
): Promise<{ error?: string; advertencia?: string; exito?: boolean }> {
  try {
    const res = await confirmarPedido(pedidoId, totalAcordadoCentavos);
    revalidatePath('/panel/pedidos');
    return { exito: true, advertencia: res.advertenciaPendientes };
  } catch (error: any) {
    return { error: error.message || 'Error al confirmar el pedido.' };
  }
}

export async function rechazarPedidoAction(
  pedidoId: string,
  motivoRechazo?: string
): Promise<{ error?: string; exito?: boolean }> {
  try {
    await rechazarPedido(pedidoId, motivoRechazo);
    revalidatePath('/panel/pedidos');
    return { exito: true };
  } catch (error: any) {
    return { error: error.message || 'Error al rechazar el pedido.' };
  }
}

export async function cancelarPedidoAction(
  pedidoId: string
): Promise<{ error?: string; exito?: boolean }> {
  try {
    await cancelarPedido(pedidoId);
    revalidatePath('/panel/pedidos');
    return { exito: true };
  } catch (error: any) {
    return { error: error.message || 'Error al cancelar el pedido.' };
  }
}

export async function entregarPedidoAction(
  pedidoId: string
): Promise<{ error?: string; ventaId?: string; exito?: boolean }> {
  try {
    const { entregarPedido } = await import('@/lib/servicios/pedidos-panel');
    const res = await entregarPedido(pedidoId);
    revalidatePath('/panel/pedidos');
    revalidatePath('/panel/ventas');
    return { exito: true, ventaId: res.venta.id };
  } catch (error: any) {
    return { error: error.message || 'Error al entregar pedido y generar comanda.' };
  }
}


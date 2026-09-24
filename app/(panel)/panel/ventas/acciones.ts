'use server';

import { revalidatePath } from 'next/cache';
import {
  registrarVenta,
  cobrarVenta,
  anularVenta,
  RegistrarVentaParametros,
  CobrarVentaParametros,
} from '@/lib/servicios/ventas';

export async function registrarVentaAction(
  datos: RegistrarVentaParametros
): Promise<{ error?: string; ventaId?: string; esAgregadoAExistente?: boolean; exito?: boolean }> {
  try {
    const res = await registrarVenta(datos);
    revalidatePath('/panel/ventas');
    revalidatePath('/panel/mesas');
    revalidatePath('/panel/reservas');
    return {
      exito: true,
      ventaId: res.venta.id,
      esAgregadoAExistente: res.esAgregadoAExistente,
    };
  } catch (error: any) {
    return { error: error.message || 'Error al registrar la venta.' };
  }
}

export async function cobrarVentaAction(
  ventaId: string,
  datos: CobrarVentaParametros
): Promise<{ error?: string; exito?: boolean }> {
  try {
    await cobrarVenta(ventaId, datos);
    revalidatePath('/panel/ventas');
    revalidatePath('/panel/mesas');
    return { exito: true };
  } catch (error: any) {
    return { error: error.message || 'Error al registrar el cobro.' };
  }
}

export async function anularVentaAction(
  ventaId: string,
  motivo: string
): Promise<{ error?: string; exito?: boolean }> {
  try {
    await anularVenta(ventaId, motivo);
    revalidatePath('/panel/ventas');
    revalidatePath('/panel/mesas');
    return { exito: true };
  } catch (error: any) {
    return { error: error.message || 'Error al anular la venta.' };
  }
}

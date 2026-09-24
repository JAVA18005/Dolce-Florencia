'use server';

import { revalidatePath } from 'next/cache';
import { confirmarEvento, cancelarEvento } from '@/lib/servicios/eventos-panel';

export async function confirmarEventoAction(
  eventoId: string,
  mesasAsignadasIds?: string[]
): Promise<{ error?: string; mensaje?: string; cerroLocal?: boolean; exito?: boolean }> {
  try {
    const res = await confirmarEvento(eventoId, mesasAsignadasIds);
    revalidatePath('/panel/eventos');
    revalidatePath('/panel/calendario');
    return { exito: true, mensaje: res.mensaje, cerroLocal: res.cerroLocal };
  } catch (error: any) {
    return { error: error.message || 'Error al confirmar evento.' };
  }
}

export async function cancelarEventoAction(
  eventoId: string
): Promise<{ error?: string; exito?: boolean }> {
  try {
    await cancelarEvento(eventoId);
    revalidatePath('/panel/eventos');
    revalidatePath('/panel/calendario');
    return { exito: true };
  } catch (error: any) {
    return { error: error.message || 'Error al cancelar evento.' };
  }
}

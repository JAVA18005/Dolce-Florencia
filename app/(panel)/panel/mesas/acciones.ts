'use server';

import { revalidatePath } from 'next/cache';
import { alternarHabilitacionMesa } from '@/lib/servicios/mesas';

export async function alternarHabilitacionMesaAction(
  mesaId: string,
  habilitada: boolean
): Promise<{ error?: string; exito?: boolean }> {
  try {
    await alternarHabilitacionMesa(mesaId, habilitada);
    revalidatePath('/panel/mesas');
    return { exito: true };
  } catch (error: any) {
    return { error: error.message || 'Error al cambiar estado de la mesa.' };
  }
}

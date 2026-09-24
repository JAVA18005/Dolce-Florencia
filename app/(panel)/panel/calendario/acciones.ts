'use server';

import { revalidatePath } from 'next/cache';
import { bloquearDiaManual, desbloquearDiaManual } from '@/lib/servicios/calendario';

export async function bloquearDiaManualAction(
  prevState: { error?: string; mensaje?: string; exito?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; mensaje?: string; exito?: boolean }> {
  const fechaStr = formData.get('fecha') as string;
  const motivo = formData.get('motivo') as string;

  if (!fechaStr) {
    return { error: 'Debe seleccionar una fecha.' };
  }

  try {
    const [year, month, day] = fechaStr.split('-').map(Number);
    const fecha = new Date(Date.UTC(year, month - 1, day));
    const res = await bloquearDiaManual(fecha, motivo);
    revalidatePath('/panel/calendario');
    return { exito: true, mensaje: res.mensaje };
  } catch (error: any) {
    return { error: error.message || 'Error al bloquear fecha.' };
  }
}

export async function desbloquearDiaManualAction(
  fechaStr: string
): Promise<{ error?: string; exito?: boolean }> {
  try {
    const [year, month, day] = fechaStr.split('-').map(Number);
    const fecha = new Date(Date.UTC(year, month - 1, day));
    await desbloquearDiaManual(fecha);
    revalidatePath('/panel/calendario');
    return { exito: true };
  } catch (error: any) {
    return { error: error.message || 'Error al desbloquear fecha.' };
  }
}

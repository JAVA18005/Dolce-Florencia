'use server';

import { revalidatePath } from 'next/cache';
import {
  confirmarReservaMesa,
  marcarReservaCumplida,
  marcarReservaNoLlego,
  rechazarReserva,
  cancelarReserva,
} from '@/lib/servicios/reservas-panel';
import { sugerirMesasLibres } from '@/lib/servicios/mesas';

export async function sugerirMesasAction(
  fecha: Date,
  personas: number,
  conMascota: boolean,
  omitirReservaId?: string
) {
  try {
    return await sugerirMesasLibres({
      fecha,
      personas,
      conMascota,
      omitirReservaId,
    });
  } catch {
    return [];
  }
}

export async function confirmarReservaMesaAction(
  reservaId: string,
  mesaId?: string | null
): Promise<{ error?: string; advertencias?: string[]; exito?: boolean }> {
  try {
    const res = await confirmarReservaMesa(reservaId, mesaId);
    revalidatePath('/panel/reservas');
    return { exito: true, advertencias: res.advertencias };
  } catch (error: any) {
    return { error: error.message || 'Error al confirmar la reserva.' };
  }
}

export async function marcarCumplidaAction(
  reservaId: string
): Promise<{ error?: string; exito?: boolean }> {
  try {
    await marcarReservaCumplida(reservaId);
    revalidatePath('/panel/reservas');
    return { exito: true };
  } catch (error: any) {
    return { error: error.message || 'Error al marcar cumplida.' };
  }
}

export async function marcarNoLlegoAction(
  reservaId: string
): Promise<{ error?: string; exito?: boolean }> {
  try {
    await marcarReservaNoLlego(reservaId);
    revalidatePath('/panel/reservas');
    return { exito: true };
  } catch (error: any) {
    return { error: error.message || 'Error al registrar no-show.' };
  }
}

export async function rechazarReservaAction(
  reservaId: string,
  motivoRechazo?: string
): Promise<{ error?: string; exito?: boolean }> {
  try {
    await rechazarReserva(reservaId, motivoRechazo);
    revalidatePath('/panel/reservas');
    return { exito: true };
  } catch (error: any) {
    return { error: error.message || 'Error al rechazar reserva.' };
  }
}

export async function cancelarReservaAction(
  reservaId: string
): Promise<{ error?: string; exito?: boolean }> {
  try {
    await cancelarReserva(reservaId);
    revalidatePath('/panel/reservas');
    return { exito: true };
  } catch (error: any) {
    return { error: error.message || 'Error al cancelar reserva.' };
  }
}

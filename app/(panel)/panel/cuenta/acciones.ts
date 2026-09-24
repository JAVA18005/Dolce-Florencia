'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { exigirSesionServidor } from '@/lib/auth/sesion';
import { cambiarPasswordPropio, cerrarTodasMisSesiones } from '@/lib/servicios/usuarios';

export async function cambiarPasswordPropioAction(
  prevState: { error?: string; exito?: boolean; mensaje?: string } | null,
  formData: FormData
): Promise<{ error?: string; exito?: boolean; mensaje?: string }> {
  const esObligatorio = formData.get('esObligatorio') === 'true';
  const passwordActual = formData.get('passwordActual') as string;
  const passwordNueva = formData.get('passwordNueva') as string;
  const confirmacion = formData.get('confirmacion') as string;

  try {
    // Si es obligatorio, permitirSiDebeCambiarPassword = true
    const sesion = await exigirSesionServidor(undefined, esObligatorio);
    await cambiarPasswordPropio(sesion, passwordActual, passwordNueva, confirmacion);
  } catch (error: any) {
    return { error: error.message || 'Error al actualizar la contraseña.' };
  }

  if (esObligatorio) {
    redirect('/panel');
  }

  revalidatePath('/panel/cuenta');
  return {
    exito: true,
    mensaje: 'Tu contraseña ha sido actualizada exitosamente y las demás sesiones fueron cerradas por seguridad.',
  };
}

export async function cerrarTodasMisSesionesAction(): Promise<void> {
  const sesion = await exigirSesionServidor(undefined, true);
  await cerrarTodasMisSesiones(sesion);
  redirect('/panel/login');
}

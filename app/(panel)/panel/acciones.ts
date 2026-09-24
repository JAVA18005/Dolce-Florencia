'use server';

import { redirect } from 'next/navigation';
import { procesarLogin } from '@/lib/auth/login';
import { cerrarSesion, exigirSesionServidor } from '@/lib/auth/sesion';

/**
 * Server Action para iniciar sesión desde el formulario de login del panel.
 */
export async function iniciarSesionAction(
  prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const resultado = await procesarLogin(email, password);

  if (!resultado.exito) {
    return { error: resultado.mensaje || 'Credenciales inválidas.' };
  }

  redirect('/panel');
}

/**
 * Server Action para cerrar sesión de forma segura y redirigir al login.
 */
export async function cerrarSesionAction(): Promise<void> {
  await cerrarSesion();
  redirect('/panel/login');
}

// TODO: eliminar antes del despliegue
/**
 * Server Action sensible de prueba restringido exclusivamente al rol ADMIN.
 * Verifica que el servidor rechace la petición con 403 si un mesero la invoca.
 * Solo disponible en entornos de desarrollo/pruebas; rechaza de inmediato en producción.
 */
export async function probarAccionRestringidaAdminAction(): Promise<{ exito: boolean; mensaje: string }> {
  // TODO: eliminar antes del despliegue
  if (process.env.NODE_ENV === 'production') {
    return {
      exito: false,
      mensaje: 'Acción de prueba deshabilitada en entorno de producción.',
    };
  }

  try {
    const sesion = await exigirSesionServidor('configuracion.gestionar');
    return {
      exito: true,
      mensaje: `Acción administrativa autorizada para ${sesion.usuario.nombre} (${sesion.usuario.rol}).`,
    };
  } catch (error: any) {
    return {
      exito: false,
      mensaje: error.message || '403 Acceso Denegado',
    };
  }
}

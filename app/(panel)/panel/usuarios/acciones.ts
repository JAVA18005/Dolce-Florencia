'use server';

import { revalidatePath } from 'next/cache';
import { Rol } from '@prisma/client';
import {
  crearUsuarioPersonal,
  cambiarEstadoActivoUsuario,
  cambiarRolUsuario,
  restablecerPasswordUsuarioPorAdmin,
} from '@/lib/servicios/usuarios';

export async function crearUsuarioAction(
  prevState: { error?: string; exito?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; exito?: boolean }> {
  const nombre = formData.get('nombre') as string;
  const email = formData.get('email') as string;
  const rol = formData.get('rol') as Rol;
  const passwordInicial = formData.get('passwordInicial') as string;

  try {
    await crearUsuarioPersonal({
      nombre,
      email,
      rol,
      passwordInicial,
    });
    revalidatePath('/panel/usuarios');
    return { exito: true };
  } catch (error: any) {
    return { error: error.message || 'Error al crear usuario.' };
  }
}

export async function cambiarEstadoUsuarioAction(
  usuarioId: string,
  activo: boolean
): Promise<{ error?: string; exito?: boolean }> {
  try {
    await cambiarEstadoActivoUsuario(usuarioId, activo);
    revalidatePath('/panel/usuarios');
    return { exito: true };
  } catch (error: any) {
    return { error: error.message || 'Error al modificar estado de usuario.' };
  }
}

export async function cambiarRolUsuarioAction(
  usuarioId: string,
  nuevoRol: Rol
): Promise<{ error?: string; exito?: boolean }> {
  try {
    await cambiarRolUsuario(usuarioId, nuevoRol);
    revalidatePath('/panel/usuarios');
    return { exito: true };
  } catch (error: any) {
    return { error: error.message || 'Error al cambiar rol del usuario.' };
  }
}

export async function restablecerPasswordAction(
  usuarioId: string,
  passwordTemporal: string
): Promise<{ error?: string; exito?: boolean }> {
  try {
    await restablecerPasswordUsuarioPorAdmin(usuarioId, passwordTemporal);
    revalidatePath('/panel/usuarios');
    return { exito: true };
  } catch (error: any) {
    return { error: error.message || 'Error al restablecer contraseña.' };
  }
}

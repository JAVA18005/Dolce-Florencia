'use server';

import { revalidatePath } from 'next/cache';
import {
  crearProducto,
  editarProducto,
  archivarProducto,
  desarchivarProducto,
  crearCategoria,
  editarCategoria,
  CrearProductoDatos,
  EditarProductoDatos,
} from '@/lib/servicios/productos';

export async function crearProductoAction(
  datos: CrearProductoDatos
): Promise<{ error?: string; productoId?: string; exito?: boolean }> {
  try {
    const res = await crearProducto(datos);
    revalidatePath('/panel/productos');
    revalidatePath('/panel/ventas');
    revalidatePath('/menu');
    return { exito: true, productoId: res.id };
  } catch (error: any) {
    return { error: error.message || 'Error al crear producto.' };
  }
}

export async function editarProductoAction(
  id: string,
  datos: EditarProductoDatos
): Promise<{ error?: string; exito?: boolean }> {
  try {
    await editarProducto(id, datos);
    revalidatePath('/panel/productos');
    revalidatePath('/panel/ventas');
    revalidatePath('/menu');
    return { exito: true };
  } catch (error: any) {
    return { error: error.message || 'Error al editar producto.' };
  }
}

export async function archivarProductoAction(
  id: string
): Promise<{ error?: string; exito?: boolean }> {
  try {
    await archivarProducto(id);
    revalidatePath('/panel/productos');
    revalidatePath('/panel/ventas');
    revalidatePath('/menu');
    return { exito: true };
  } catch (error: any) {
    return { error: error.message || 'Error al archivar producto.' };
  }
}

export async function desarchivarProductoAction(
  id: string
): Promise<{ error?: string; exito?: boolean }> {
  try {
    await desarchivarProducto(id);
    revalidatePath('/panel/productos');
    revalidatePath('/panel/ventas');
    revalidatePath('/menu');
    return { exito: true };
  } catch (error: any) {
    return { error: error.message || 'Error al reactivar producto.' };
  }
}

export async function crearCategoriaAction(datos: {
  nombre: string;
  orden?: number;
}): Promise<{ error?: string; exito?: boolean }> {
  try {
    await crearCategoria(datos);
    revalidatePath('/panel/productos');
    revalidatePath('/menu');
    return { exito: true };
  } catch (error: any) {
    return { error: error.message || 'Error al crear categoría.' };
  }
}

export async function editarCategoriaAction(
  id: string,
  datos: { nombre: string; orden?: number }
): Promise<{ error?: string; exito?: boolean }> {
  try {
    await editarCategoria(id, datos);
    revalidatePath('/panel/productos');
    revalidatePath('/menu');
    return { exito: true };
  } catch (error: any) {
    return { error: error.message || 'Error al editar categoría.' };
  }
}

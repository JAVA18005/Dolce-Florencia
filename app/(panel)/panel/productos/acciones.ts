'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/db';
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
import {
  crearUrlSubidaFirmada,
  borrarArchivosProducto,
  PeticionSubidaArchivo,
} from '@/lib/servicios/almacenamiento';

export async function obtenerUrlSubidaAction(
  datos: PeticionSubidaArchivo
): Promise<{ error?: string; signedUrl?: string; publicUrl?: string; ruta?: string }> {
  try {
    const res = await crearUrlSubidaFirmada(datos);
    return { signedUrl: res.signedUrl, publicUrl: res.publicUrl, ruta: res.ruta };
  } catch (error: any) {
    return { error: error.message || 'Error al generar la URL de subida.' };
  }
}

export async function borrarArchivosProductoAction(
  urls: string[]
): Promise<{ error?: string; exito?: boolean; borrados?: number }> {
  try {
    const res = await borrarArchivosProducto(urls);
    return { exito: true, borrados: res.borrados };
  } catch (error: any) {
    return { error: error.message || 'Error al borrar archivos.' };
  }
}

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

/**
 * Calcula qué archivos del bucket se deben borrar tras editar: SOLO los que el
 * producto YA tenía en BD (imagenUrl/modeloArUrl) y que AHORA ya no usa.
 * Nunca se confía en valores enviados por el cliente para decidir borrados.
 */
function archivosAnterioresYaNoUsados(
  anterior: { imagenUrl: string | null; modeloArUrl: string | null },
  actualizacion: EditarProductoDatos
): string[] {
  const cambios: Array<['imagenUrl' | 'modeloArUrl', string | null, string | null | undefined]> = [
    ['imagenUrl', anterior.imagenUrl, actualizacion.imagenUrl],
    ['modeloArUrl', anterior.modeloArUrl, actualizacion.modeloArUrl],
  ];
  return cambios
    .filter(([, antes, nuevo]) => antes && nuevo !== antes && nuevo !== undefined)
    .map(([, antes]) => antes as string);
}

export async function editarProductoAction(
  id: string,
  datos: EditarProductoDatos
): Promise<{ error?: string; exito?: boolean }> {
  try {
    const anterior = await prisma.producto.findUnique({
      where: { id },
      select: { imagenUrl: true, modeloArUrl: true },
    });

    await editarProducto(id, datos);

    // Borrado SOLO después de persistir con éxito y derivado de la comparación
    // BD anterior vs. nuevo. Best-effort: un fallo del borrado nunca invalida
    // el guardado.
    if (anterior) {
      const aBorrar = archivosAnterioresYaNoUsados(anterior, datos);
      if (aBorrar.length) {
        await borrarArchivosProducto(aBorrar).catch(() => {});
      }
    }

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

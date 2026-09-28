// lib/servicios/almacenamiento.ts — Subida directa a Supabase Storage (bucket "productos").
//
// RESTRICCIÓN CLAVE: Vercel limita el cuerpo de requests a funciones a 4.5 MB.
// Los archivos NUNCA pasan por nuestro servidor: este servicio solo emite una
// URL de subida firmada (createSignedUploadUrl) y el navegador sube el archivo
// directo a Supabase. La service role key se usa únicamente aquí (server-only).

import crypto from 'crypto';
import { supabaseAdmin } from '../supabase';
import { exigirSesionServidor } from '../auth/sesion';
import {
  ArchivoSubidaSchema,
  extensionDeArchivo,
  EXTENSIONES_VALIDAS,
  TipoArchivo,
} from '../validaciones/archivo';

export const BUCKET_PRODUCTOS = 'productos';

export interface PeticionSubidaArchivo {
  tipo: TipoArchivo;
  nombre: string;
  tamanoBytes: number;
}

export interface ResultadoUrlSubida {
  signedUrl: string;
  publicUrl: string;
  ruta: string;
}

/** Base url de los objetos públicos del bucket (para construir la URL pública). */
export function baseUrlStorage(): string {
  const url = process.env.SUPABASE_URL ?? '';
  if (!url) {
    throw new Error('Faltan variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.');
  }
  return url.replace(/\/+$/, '');
}

/**
 * Genera una ruta ÚNICA para el bucket usando un UUID: imágenes/<uuid>.<ext>,
 * modelos/<uuid>.glb. El nombre original del usuario nunca se usa como clave.
 */
export function generarRutaUnica(tipo: TipoArchivo, extension: string): string {
  const id = crypto.randomUUID();
  const carpeta = tipo === 'imagen' ? 'imagenes' : 'modelos';
  const extFinal = tipo === 'modelo' ? 'glb' : extension;
  return `${carpeta}/${id}.${extFinal}`;
}

/** Construye la URL pública de un objeto del bucket. */
export function urlPublicaDeRuta(ruta: string): string {
  return `${baseUrlStorage()}/storage/v1/object/public/${BUCKET_PRODUCTOS}/${ruta}`;
}

/**
 * Determina si una URL pertenece a nuestro bucket de Supabase Storage (para
 * saber si es seguro intentar borrarla). Rutas relativas (ej. /models/x.glb)
 * o URLs externas devuelven false.
 */
export function esUrlDelBucket(url: string, baseUrl: string = baseUrlStorage()): boolean {
  if (!url || !url.startsWith('http')) return false;
  try {
    const parsed = new URL(url);
    const host = new URL(baseUrl).hostname;
    if (parsed.hostname !== host) return false;
    return parsed.pathname.startsWith(`/storage/v1/object/public/${BUCKET_PRODUCTOS}/`);
  } catch {
    return false;
  }
}

/**
 * Extrae la ruta del objeto (relativa al bucket) desde su URL pública, o null
 * si la URL no es de nuestro bucket.
 */
export function extraerRutaDeUrl(url: string, baseUrl: string = baseUrlStorage()): string | null {
  if (!esUrlDelBucket(url, baseUrl)) return null;
  const parsed = new URL(url);
  const prefijo = `/storage/v1/object/public/${BUCKET_PRODUCTOS}/`;
  const ruta = decodeURIComponent(parsed.pathname.replace(prefijo, ''));
  return ruta.length > 0 && !ruta.includes('../') ? ruta : null;
}

/**
 * Server Action (service): emite la URL firmada para que el navegador suba el
 * archivo directo a Supabase Storage. Solo ADMIN (productos.gestionar).
 */
export async function crearUrlSubidaFirmada(datos: PeticionSubidaArchivo): Promise<ResultadoUrlSubida> {
  await exigirSesionServidor('productos.gestionar');

  const validado = ArchivoSubidaSchema.parse(datos);
  const extension = extensionDeArchivo(validado.nombre);

  const ruta = generarRutaUnica(validado.tipo, extension);
  const { data, error } = await supabaseAdmin()
    .storage.from(BUCKET_PRODUCTOS)
    .createSignedUploadUrl(ruta);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || 'No se pudo generar la URL de subida.');
  }

  return {
    signedUrl: data.signedUrl,
    publicUrl: urlPublicaDeRuta(data.path || ruta),
    ruta: data.path || ruta,
  };
}

/**
 * Borra archivos del bucket "productos" BEST-EFFORT: solo borra los que sean
 * de nuestro bucket, y nunca falla aunque el borrado dé error. Solo ADMIN.
 */
export async function borrarArchivosProducto(urls: string[]): Promise<{ borrados: number }> {
  await exigirSesionServidor('productos.gestionar');

  const rutas = (urls ?? [])
    .map((u) => extraerRutaDeUrl(u))
    .filter((r): r is string => r !== null);

  if (rutas.length === 0) {
    return { borrados: 0 };
  }

  try {
    const { error } = await supabaseAdmin()
      .storage.from(BUCKET_PRODUCTOS)
      .remove(rutas);
    return { borrados: error ? 0 : rutas.length };
  } catch {
    // Best-effort: un fallo al borrar NUNCA hace fallar la operación del producto.
    return { borrados: 0 };
  }
}

export { EXTENSIONES_VALIDAS };
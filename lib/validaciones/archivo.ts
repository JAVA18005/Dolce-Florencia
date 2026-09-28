// lib/validaciones/archivo.ts — Validación Zod para subida directa a Supabase Storage.
//
// Restricción clave: Vercel limita el cuerpo de requests a funciones a 4.5 MB
// (también en Server Actions). Por eso la subida es directa con URL firmada y
// aquí solo se valida la DECLARACIÓN (nombre, tipo y tamaño del archivo), nunca
// el archivo en sí, que viaja del navegador directo a Supabase.

import { z } from 'zod';

export type TipoArchivo = 'imagen' | 'modelo';

/** Máximos declarados por tipo (en bytes). */
export const LIMITES_ARCHIVO: Record<TipoArchivo, number> = {
  imagen: 5 * 1024 * 1024, // 5 MB
  modelo: 10 * 1024 * 1024, // 10 MB .glb
};

/** Extensiones admitidas por tipo. */
export const EXTENSIONES_VALIDAS: Record<TipoArchivo, string[]> = {
  imagen: ['jpg', 'jpeg', 'png', 'webp'],
  modelo: ['glb'],
};

/** Extrae la extensión en minúsculas del nombre original (sin query ni fragmento). */
export function extensionDeArchivo(nombre: string): string {
  const limpio = nombre.split('?')[0].split('#')[0];
  return limpio.split('.').pop()?.toLowerCase() ?? '';
}

export const ArchivoSubidaSchema = z
  .object({
    tipo: z.enum(['imagen', 'modelo'], {
      errorMap: () => ({ message: 'Tipo de archivo inválido. Debe ser imagen o modelo.' }),
    }),
    nombre: z
      .string()
      .trim()
      .min(1, 'El nombre del archivo es obligatorio')
      .max(255, 'El nombre del archivo no puede superar los 255 caracteres'),
    tamanoBytes: z
      .number()
      .int('El tamaño debe ser un número entero de bytes')
      .positive('El tamaño debe ser mayor a 0'),
  })
  .superRefine((datos, ctx) => {
    const limite = LIMITES_ARCHIVO[datos.tipo];
    if (datos.tamanoBytes > limite) {
      const mb = Math.round(limite / (1024 * 1024));
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tamanoBytes'],
        message: `El archivo supera el máximo de ${mb} MB para ${datos.tipo === 'imagen' ? 'imágenes' : 'modelos 3D'}.`,
      });
    }

    const extension = extensionDeArchivo(datos.nombre);
    if (!EXTENSIONES_VALIDAS[datos.tipo].includes(extension)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['nombre'],
        message: `Extensión .${extension || '[vacía]'} no admitida para ${datos.tipo}. Permitidas: ${EXTENSIONES_VALIDAS[
          datos.tipo
        ]
          .map((e) => `.${e}`)
          .join(', ')}.`,
      });
    }
  });

export type ArchivoSubida = z.infer<typeof ArchivoSubidaSchema>;
// lib/validaciones/producto.ts — Esquemas de validación Zod para Productos y Categorías

import { z } from 'zod';

export const CategoriaSchema = z.object({
  nombre: z
    .string()
    .min(2, 'El nombre de la categoría debe tener al menos 2 caracteres')
    .max(60, 'El nombre de la categoría no puede superar los 60 caracteres')
    .transform((s) => s.trim()),
  orden: z.number().int().default(0),
});

export const ProductoSchema = z.object({
  nombre: z
    .string()
    .min(2, 'El nombre del producto debe tener al menos 2 caracteres')
    .max(100, 'El nombre del producto no puede superar los 100 caracteres')
    .transform((s) => s.trim()),
  descripcion: z
    .string()
    .max(500, 'La descripción no puede superar los 500 caracteres')
    .optional()
    .nullable()
    .transform((s) => (s && s.trim() ? s.trim() : null)),
  categoriaId: z.string().min(1, 'Debes seleccionar una categoría válida'),
  precioCentavos: z
    .number()
    .int('El precio debe ser un número entero en centavos')
    .min(0, 'El precio no puede ser negativo')
    .max(1000000, 'El precio no puede superar los 10,000 Bs')
    .optional()
    .nullable(),
  imagenUrl: z
    .string()
    .max(300, 'La ruta de la imagen no puede superar los 300 caracteres')
    .optional()
    .nullable()
    .transform((s) => (s && s.trim() ? s.trim() : null)),
  modeloArUrl: z
    .string()
    .max(300, 'La ruta del modelo AR no puede superar los 300 caracteres')
    .optional()
    .nullable()
    .transform((s) => (s && s.trim() ? s.trim() : null)),
  modeloArIosUrl: z
    .string()
    .max(300, 'La ruta del modelo iOS no puede superar los 300 caracteres')
    .optional()
    .nullable()
    .transform((s) => (s && s.trim() ? s.trim() : null)),
  aptoMascotas: z.boolean().default(false),
  orden: z.number().int().default(0),
});

export const EditarPrecioSchema = z.object({
  precioCentavos: z
    .number()
    .int('El precio debe ser un número entero en centavos')
    .min(0, 'El precio no puede ser negativo')
    .optional()
    .nullable(),
});

// lib/validaciones/seguimiento.ts — Esquema Zod para consulta pública de seguimiento.

import { z } from 'zod';
import { validarFormatoCodigo } from '../codigo';

export const FormularioSeguimientoSchema = z.object({
  codigo: z
    .string()
    .trim()
    .toUpperCase()
    .refine((val) => validarFormatoCodigo(val), {
      message: 'Ingresa un código de seguimiento válido con formato DF-XXXXXX',
    }),
  ultimos4Digitos: z
    .string()
    .trim()
    .refine((val) => /^\d{4}$/.test(val), {
      message: 'Ingresa exactamente los últimos 4 dígitos del teléfono con el que solicitaste',
    }),
});

export type FormularioSeguimientoEntrada = z.input<typeof FormularioSeguimientoSchema>;
export type FormularioSeguimientoSalida = z.output<typeof FormularioSeguimientoSchema>;

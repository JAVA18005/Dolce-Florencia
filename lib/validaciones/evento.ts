// lib/validaciones/evento.ts — Esquema Zod de validación de celebraciones y eventos en el servidor.

import { z } from 'zod';
import { normalizarTelefono } from '../telefono';
import { parseYMDToDate, esFechaFuturaValida, HORIZONTE_DIAS_EVENTO } from '../fechas';

export const FormularioEventoSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  telefono: z
    .string()
    .trim()
    .refine((val) => normalizarTelefono(val) !== null, {
      message: 'Ingresa un número de teléfono boliviano válido (8 dígitos, ej: 78198181)',
    })
    .transform((val) => normalizarTelefono(val)!),
  fecha: z
    .string()
    .trim()
    .refine(
      (val) => {
        const d = parseYMDToDate(val);
        return d !== null && esFechaFuturaValida(d, HORIZONTE_DIAS_EVENTO);
      },
      {
        message: `La fecha del evento no puede ser pasada ni exceder ${HORIZONTE_DIAS_EVENTO} días a futuro`,
      }
    ),
  modalidad: z.enum(['EN_LOCAL', 'ENTREGA'], {
    errorMap: () => ({ message: 'Selecciona una modalidad válida (En el local o Entrega)' }),
  }),
  personas: z
    .number({ invalid_type_error: 'Ingresa la cantidad estimada de personas' })
    .int('Debe ser un número entero')
    .min(1, 'Mínimo 1 persona')
    .max(500, 'Máximo 500 personas por evento'),
  ocasion: z
    .string()
    .trim()
    .min(2, 'Especifica el tipo de ocasión o celebración')
    .max(100, 'Máximo 100 caracteres'),
  detalles: z
    .string()
    .trim()
    .min(5, 'Por favor cuéntanos algunos detalles de lo que imaginas para tu evento')
    .max(1500, 'Máximo 1500 caracteres'),
  campoTrampa: z.string().max(100).optional(), // Honeypot anti-spam
  turnstileToken: z.string().optional(),
});

export type FormularioEventoEntrada = z.input<typeof FormularioEventoSchema>;
export type FormularioEventoSalida = z.output<typeof FormularioEventoSchema>;

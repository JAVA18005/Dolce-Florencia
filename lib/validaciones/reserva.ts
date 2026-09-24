// lib/validaciones/reserva.ts — Esquema Zod de validación de reservas de mesa en el servidor.

import { z } from 'zod';
import { normalizarTelefono } from '../telefono';
import {
  parseYMDToDate,
  esFechaFuturaValida,
  esHoraLlegadaValida,
  HORIZONTE_DIAS_RESERVA,
} from '../fechas';

export const FormularioReservaSchema = z.object({
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
        return d !== null && esFechaFuturaValida(d, HORIZONTE_DIAS_RESERVA);
      },
      {
        message: `La fecha de reserva no puede ser pasada ni exceder ${HORIZONTE_DIAS_RESERVA} días a futuro`,
      }
    ),
  hora: z
    .string()
    .trim()
    .refine((val) => esHoraLlegadaValida(val), {
      message: 'La hora de llegada debe estar entre 15:00 y 21:30',
    }),
  personas: z
    .number({ invalid_type_error: 'Ingresa la cantidad de personas' })
    .int('Debe ser un número entero')
    .min(1, 'Mínimo 1 persona')
    .max(18, 'Para grupos mayores a 18 personas, por favor solicita un Evento o Celebración'),
  zonaPreferencia: z.enum(['INTERIOR', 'EXTERIOR'], {
    errorMap: () => ({ message: 'Selecciona una zona válida (Interior o Exterior)' }),
  }),
  conMascota: z.boolean().default(false),
  detalles: z.string().trim().max(1500).optional(),
  campoTrampa: z.string().max(100).optional(), // Honeypot anti-spam
  turnstileToken: z.string().optional(),
});

export type FormularioReservaEntrada = z.input<typeof FormularioReservaSchema>;
export type FormularioReservaSalida = z.output<typeof FormularioReservaSchema>;

// lib/validaciones/pedido.ts — Esquema Zod de validación de pedidos en el servidor.

import { z } from 'zod';
import { normalizarTelefono } from '../telefono';
import { parseYMDToDate, esFechaFuturaValida, HORIZONTE_DIAS_RESERVA } from '../fechas';

export const ItemPedidoSchema = z.object({
  productoId: z.string().optional(),
  nombre: z.string().min(1, 'El nombre del producto es requerido').max(120),
  cantidad: z.number().int().min(1, 'La cantidad mínima es 1').max(50, 'Máximo 50 unidades por ítem'),
  nota: z.string().max(250).optional(),
});

export const FormularioPedidoSchema = z
  .object({
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
    entrega: z.enum(['RETIRO', 'DOMICILIO'], {
      errorMap: () => ({ message: 'Selecciona una opción de entrega válida' }),
    }),
    direccionEntrega: z.string().trim().max(300).optional(),
    fechaDeseada: z
      .string()
      .trim()
      .refine(
        (val) => {
          const d = parseYMDToDate(val);
          return d !== null && esFechaFuturaValida(d, HORIZONTE_DIAS_RESERVA);
        },
        {
          message: `La fecha deseada no puede ser pasada ni exceder ${HORIZONTE_DIAS_RESERVA} días a futuro`,
        }
      ),
    horaDeseada: z
      .string()
      .trim()
      .optional()
      .refine((val) => !val || /^([01]\d|2[0-3]):[0-5]\d$/.test(val), {
        message: 'Formato de hora inválido (HH:mm)',
      }),
    items: z
      .array(ItemPedidoSchema)
      .min(1, 'Debes incluir al menos un producto o pedido en la solicitud'),
    detalles: z.string().trim().max(1500).optional(),
    campoTrampa: z.string().max(100).optional(), // Honeypot anti-spam
    turnstileToken: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.entrega === 'DOMICILIO' && (!data.direccionEntrega || data.direccionEntrega.length < 5)) {
        return false;
      }
      return true;
    },
    {
      message: 'Para entregas a domicilio, ingresa tu dirección completa',
      path: ['direccionEntrega'],
    }
  );

export type FormularioPedidoEntrada = z.input<typeof FormularioPedidoSchema>;
export type FormularioPedidoSalida = z.output<typeof FormularioPedidoSchema>;

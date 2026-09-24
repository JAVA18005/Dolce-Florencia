// lib/validaciones/venta.ts — Esquemas de validación Zod para operaciones de venta y cobro

import { z } from 'zod';
import { MetodoPago, OrigenVenta } from '@prisma/client';

export const ItemVentaInputSchema = z.object({
  productoId: z.string().min(1, 'El producto es obligatorio'),
  cantidad: z.number().int('La cantidad debe ser entera').positive('La cantidad debe ser mayor a 0').max(100, 'Cantidad máxima de 100 por ítem'),
});

export const RegistrarVentaSchema = z.object({
  mesaId: z.string().optional().nullable(),
  origen: z.nativeEnum(OrigenVenta).default(OrigenVenta.SALON),
  items: z.array(ItemVentaInputSchema).min(1, 'Debes agregar al menos un producto a la comanda'),
});

export const CobrarVentaSchema = z.object({
  metodoPago: z.nativeEnum(MetodoPago, {
    errorMap: () => ({ message: 'Método de pago inválido (EFECTIVO, QR o TRANSFERENCIA)' }),
  }),
  referenciaPago: z
    .string()
    .max(100, 'La referencia de pago no puede superar los 100 caracteres')
    .optional()
    .nullable()
    .transform((val) => (val && val.trim() ? val.trim() : null)),
});

export const AnularVentaSchema = z.object({
  motivo: z
    .string()
    .min(3, 'El motivo de anulación debe tener al menos 3 caracteres')
    .max(250, 'El motivo no puede superar los 250 caracteres')
    .transform((val) => val.trim()),
});

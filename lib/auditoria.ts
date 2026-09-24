// lib/auditoria.ts — Servicio centralizado de registro de auditoría atómica en base de datos.

import prisma from './db';
import { Prisma } from '@prisma/client';

export interface RegistrarAuditoriaParams {
  usuarioId?: string | null;
  accion: string;
  entidad: string;
  entidadId: string;
  detalle?: Record<string, unknown> | null;
}

/**
 * Registra una acción auditable en la tabla Auditoria.
 * Si se proporciona `tx`, se ejecuta dentro de la misma transacción garantizando atomicidad:
 * si la acción principal o la auditoría fallan, la transacción completa revierte.
 *
 * PRIVACIDAD Y SEGURIDAD:
 * - Nunca registra contraseñas en texto plano ni hashes.
 * - Nunca registra el texto escrito en formularios fallidos (evita registrar claves escritas por error en el correo).
 * - No almacena direcciones IP completas.
 */
export async function registrarAuditoria(
  params: RegistrarAuditoriaParams,
  tx?: Prisma.TransactionClient
) {
  const db = tx || prisma;
  return db.auditoria.create({
    data: {
      usuarioId: params.usuarioId || null,
      accion: params.accion,
      entidad: params.entidad,
      entidadId: params.entidadId,
      detalle: params.detalle ? (params.detalle as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
  });
}

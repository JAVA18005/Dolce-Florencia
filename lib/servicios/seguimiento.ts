// lib/servicios/seguimiento.ts — Consulta pública de estado con rate limit por IP y por código.

'use server';

import { headers } from 'next/headers';
import prisma from '../db';
import { FormularioSeguimientoSchema } from '../validaciones/seguimiento';
import { obtenerIpCliente } from '../ip';
import { verificarYRegistrarRateLimit } from '../rate-limit';
import { obtenerUltimos4Digitos } from '../telefono';
import { fechaAYMD } from '../fechas';

export interface DetalleSeguimientoPublico {
  codigo: string;
  tipo: 'Pedido' | 'Reserva de mesa' | 'Evento / Celebración';
  estado: string;
  fecha: string;
  hora: string | null;
  entrega: string | null;
  resumen: string;
  creadoEn: string;
}

export interface RespuestaSeguimiento {
  exito: boolean;
  mensaje?: string;
  resultado?: DetalleSeguimientoPublico;
  errores?: Record<string, string[]>;
}

const MENSAJE_ERROR_GENERICO =
  'No encontramos ninguna solicitud con los datos proporcionados. Revisa el código y los últimos 4 dígitos del teléfono.';

export async function consultarSeguimientoAction(datos: unknown): Promise<RespuestaSeguimiento> {
  const headersList = await headers();
  const ipCliente = obtenerIpCliente(headersList);

  // 1. Rate limiting por IP: máximo 15 consultas cada 10 minutos
  const rateIp = await verificarYRegistrarRateLimit(`ip:${ipCliente}:seguimiento`, 15, 600);
  if (!rateIp.permitido) {
    return {
      exito: false,
      mensaje: `Has realizado demasiadas consultas seguidas. Por favor espera ${Math.ceil(
        (rateIp.segundosParaReintentar || 60) / 60
      )} minutos.`,
    };
  }

  // 2. Validación Zod de código y dígitos
  const parseo = FormularioSeguimientoSchema.safeParse(datos);
  if (!parseo.success) {
    return {
      exito: false,
      mensaje: 'Revisa los datos de búsqueda.',
      errores: parseo.error.flatten().fieldErrors,
    };
  }

  const { codigo, ultimos4Digitos } = parseo.data;

  // 3. Rate limiting específico por CÓDIGO (máximo 5 intentos por hora por código)
  // Independiente de los dígitos probados para evitar ataques de fuerza bruta
  const rateCodigo = await verificarYRegistrarRateLimit(`codigo:${codigo}:seguimiento`, 5, 3600);
  if (!rateCodigo.permitido) {
    return {
      exito: false,
      mensaje: 'Se han alcanzado los intentos máximos para este código. Por favor intenta más tarde.',
    };
  }

  // 4. Buscar en Pedidos
  const pedido = await prisma.pedido.findUnique({
    where: { codigo },
    include: { items: true },
  });

  if (pedido) {
    const telefonoDigitos = obtenerUltimos4Digitos(pedido.clienteTelefono);
    if (telefonoDigitos === ultimos4Digitos) {
      return {
        exito: true,
        resultado: {
          codigo: pedido.codigo,
          tipo: 'Pedido',
          estado: pedido.estado,
          fecha: fechaAYMD(pedido.fechaDeseada),
          hora: pedido.horaDeseada,
          entrega: pedido.entrega === 'DOMICILIO' ? 'Entrega a domicilio' : 'Retiro en pastelería',
          resumen: pedido.items.map((i) => `${i.cantidad}x ${i.nombre}`).join(', '),
          creadoEn: pedido.creadoEn.toISOString(),
        },
      };
    }
    // Mismo mensaje si el teléfono no coincide
    return {
      exito: false,
      mensaje: MENSAJE_ERROR_GENERICO,
    };
  }

  // 5. Buscar en Reservas / Eventos
  const reserva = await prisma.reserva.findUnique({
    where: { codigo },
  });

  if (reserva) {
    const telefonoDigitos = obtenerUltimos4Digitos(reserva.clienteTelefono);
    if (telefonoDigitos === ultimos4Digitos) {
      const esEvento = reserva.tipo === 'EVENTO';
      return {
        exito: true,
        resultado: {
          codigo: reserva.codigo,
          tipo: esEvento ? 'Evento / Celebración' : 'Reserva de mesa',
          estado: reserva.estado,
          fecha: fechaAYMD(reserva.fecha),
          hora: reserva.hora,
          entrega: reserva.modalidad ? (reserva.modalidad === 'EN_LOCAL' ? 'En el local' : 'Entrega') : null,
          resumen: esEvento
            ? `${reserva.ocasion || 'Evento'} para aprox. ${reserva.personas || 1} personas`
            : `${reserva.personas || 1} persona(s)${reserva.conMascota ? ' · Con mascota' : ''}`,
          creadoEn: reserva.creadoEn.toISOString(),
        },
      };
    }

    return {
      exito: false,
      mensaje: MENSAJE_ERROR_GENERICO,
    };
  }

  // Mismo mensaje idéntico si el registro no existe
  return {
    exito: false,
    mensaje: MENSAJE_ERROR_GENERICO,
  };
}

// lib/servicios/reservas.ts — Server Action para registro de reservas de mesa con aislamiento Serializable y reintentos.

'use server';

import { headers } from 'next/headers';
import { Prisma } from '@prisma/client';
import prisma from '../db';
import { FormularioReservaSchema } from '../validaciones/reserva';
import { parseYMDToDate } from '../fechas';
import { generarCodigoSeguimiento } from '../codigo';
import { verificarTurnstile } from '../turnstile';
import { verificarYRegistrarRateLimit } from '../rate-limit';
import { obtenerIpCliente } from '../ip';
import { generarEnlaceWhatsApp } from '../whatsapp';
import { verificarDisponibilidadReserva } from './disponibilidad';

export interface RespuestaAccionReserva {
  exito: boolean;
  mensaje?: string;
  codigo?: string;
  enlaceWhatsApp?: string;
  errores?: Record<string, string[]>;
}

export async function crearReservaAction(datos: unknown): Promise<RespuestaAccionReserva> {
  const headersList = await headers();
  const ipCliente = obtenerIpCliente(headersList);

  // 1. Rate limiting por IP: máximo 10 reservas por hora
  const controlRate = await verificarYRegistrarRateLimit(`ip:${ipCliente}:reserva`, 10, 3600);
  if (!controlRate.permitido) {
    return {
      exito: false,
      mensaje: `Has alcanzado el límite de solicitudes de reserva. Por favor reintenta en ${Math.ceil(
        (controlRate.segundosParaReintentar || 60) / 60
      )} minutos.`,
    };
  }

  // 2. Validación de entrada con Zod
  const parseo = FormularioReservaSchema.safeParse(datos);
  if (!parseo.success) {
    return {
      exito: false,
      mensaje: 'Por favor revisa los datos ingresados en el formulario.',
      errores: parseo.error.flatten().fieldErrors,
    };
  }

  const {
    nombre,
    telefono,
    fecha,
    hora,
    personas,
    zonaPreferencia,
    conMascota,
    detalles,
    campoTrampa,
    turnstileToken,
  } = parseo.data;

  // 3. Honeypot: si el campo trampa viene lleno, simular éxito silencioso sin persistir
  if (campoTrampa && campoTrampa.trim().length > 0) {
    const codigoFicticio = generarCodigoSeguimiento();
    return {
      exito: true,
      codigo: codigoFicticio,
      enlaceWhatsApp: generarEnlaceWhatsApp('¡Hola! Me gustaría consultar sobre una reserva de mesa.'),
    };
  }

  // 4. Verificación de Turnstile en servidor
  const turnstile = await verificarTurnstile(turnstileToken, ipCliente);
  if (!turnstile.valido) {
    return {
      exito: false,
      mensaje: 'No fue posible verificar la seguridad contra spam. Por favor recarga e intenta de nuevo.',
    };
  }

  const fechaDb = parseYMDToDate(fecha)!;

  // 5. Transacción Serializable con reintentos para evitar colisiones concurrentes (anti doble reserva)
  const MAX_REINTENTOS = 3;
  let intento = 0;

  while (intento < MAX_REINTENTOS) {
    try {
      const resultado = await prisma.$transaction(
        async (tx) => {
          // Verificar disponibilidad dentro de la transacción
          const disp = await verificarDisponibilidadReserva(
            fechaDb,
            hora,
            personas,
            zonaPreferencia,
            tx as unknown as typeof prisma
          );

          if (!disp.disponible) {
            throw new Error(disp.motivo || 'No hay disponibilidad para el horario solicitado.');
          }

          // Generar código único
          let codigo = generarCodigoSeguimiento();
          let intentoCod = 0;
          while (intentoCod < 3) {
            const existente = await tx.reserva.findUnique({ where: { codigo } });
            if (!existente) break;
            codigo = generarCodigoSeguimiento();
            intentoCod++;
          }

          // Crear reserva en estado inicial PENDIENTE
          // La mesaId queda en null; el personal asigna la mesa física al confirmar en el panel
          const reserva = await tx.reserva.create({
            data: {
              codigo,
              tipo: 'MESA',
              estado: 'PENDIENTE',
              clienteNombre: nombre,
              clienteTelefono: telefono,
              fecha: fechaDb,
              hora,
              personas,
              conMascota,
              detalles: detalles
                ? `[Zona preferida: ${zonaPreferencia}] ${detalles}`
                : `[Zona preferida: ${zonaPreferencia}]`,
            },
          });

          return reserva;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        }
      );

      // 6. Generar enlace a WhatsApp con el resumen de la solicitud
      const mensajeWhatsApp = [
        '¡Hola Dolce Florencia! Acabo de solicitar una reserva de mesa en la web:',
        `Código: ${resultado.codigo}`,
        `Nombre: ${nombre}`,
        `Fecha: ${fecha}`,
        `Hora de llegada: ${hora}`,
        `Personas: ${personas}`,
        `Preferencia de zona: ${zonaPreferencia === 'INTERIOR' ? 'Interior' : 'Exterior / Terraza'}`,
        `¿Voy con mi mascota?: ${conMascota ? 'Sí (Pet Friendly)' : 'No'}`,
        detalles ? `Detalles / Ocasión: ${detalles}` : '',
        '',
        '¿Podrían ayudarme a confirmar la reserva?',
      ].filter(Boolean).join('\n');

      const enlaceWhatsApp = generarEnlaceWhatsApp(mensajeWhatsApp);

      return {
        exito: true,
        codigo: resultado.codigo,
        enlaceWhatsApp,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034' // Write conflict en Serializable
      ) {
        intento++;
        if (intento >= MAX_REINTENTOS) {
          return {
            exito: false,
            mensaje: 'El sistema experimentó alta concurrencia. Por favor intenta de nuevo en unos segundos.',
          };
        }
        // Espera aleatoria antes de reintentar
        await new Promise((resolve) => setTimeout(resolve, 50 * intento));
        continue;
      }

      return {
        exito: false,
        mensaje: error instanceof Error ? error.message : 'Ocurrió un error al procesar la reserva.',
      };
    }
  }

  return {
    exito: false,
    mensaje: 'No fue posible registrar la reserva por favor intenta nuevamente.',
  };
}

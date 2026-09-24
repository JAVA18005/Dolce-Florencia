// lib/servicios/eventos.ts — Server Action para registro de celebraciones y eventos públicos.

'use server';

import { headers } from 'next/headers';
import prisma from '../db';
import { FormularioEventoSchema } from '../validaciones/evento';
import { parseYMDToDate } from '../fechas';
import { generarCodigoSeguimiento } from '../codigo';
import { verificarTurnstile } from '../turnstile';
import { verificarYRegistrarRateLimit } from '../rate-limit';
import { obtenerIpCliente } from '../ip';
import { generarEnlaceWhatsApp } from '../whatsapp';

export interface RespuestaAccionEvento {
  exito: boolean;
  mensaje?: string;
  codigo?: string;
  enlaceWhatsApp?: string;
  errores?: Record<string, string[]>;
}

export async function crearEventoAction(datos: unknown): Promise<RespuestaAccionEvento> {
  const headersList = await headers();
  const ipCliente = obtenerIpCliente(headersList);

  // 1. Rate limiting por IP: máximo 5 solicitudes de evento por hora
  const controlRate = await verificarYRegistrarRateLimit(`ip:${ipCliente}:evento`, 5, 3600);
  if (!controlRate.permitido) {
    return {
      exito: false,
      mensaje: `Has alcanzado el límite de solicitudes de evento. Por favor reintenta en ${Math.ceil(
        (controlRate.segundosParaReintentar || 60) / 60
      )} minutos.`,
    };
  }

  // 2. Validación de entrada con Zod
  const parseo = FormularioEventoSchema.safeParse(datos);
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
    modalidad,
    personas,
    ocasion,
    detalles,
    campoTrampa,
    turnstileToken,
  } = parseo.data;

  // 3. Honeypot: si el campo trampa viene lleno, simular éxito silencioso
  if (campoTrampa && campoTrampa.trim().length > 0) {
    const codigoFicticio = generarCodigoSeguimiento();
    return {
      exito: true,
      codigo: codigoFicticio,
      enlaceWhatsApp: generarEnlaceWhatsApp('¡Hola! Me gustaría cotizar un evento especial.'),
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

  // 5. Verificar si el día está bloqueado en DiaBloqueado
  const diaBloqueado = await prisma.diaBloqueado.findUnique({
    where: { fecha: fechaDb },
  });

  if (diaBloqueado) {
    return {
      exito: false,
      mensaje: `El local ya se encuentra cerrado o reservado para esta fecha (${diaBloqueado.motivo}).`,
    };
  }

  // 6. Generar código único aleatorio
  let codigo = generarCodigoSeguimiento();
  let intentoCod = 0;
  while (intentoCod < 3) {
    const existente = await prisma.reserva.findUnique({ where: { codigo } });
    if (!existente) break;
    codigo = generarCodigoSeguimiento();
    intentoCod++;
  }

  // 7. Guardar en Base de Datos
  // ARQUITECTURA.md §3.2 y §5.4: Un evento EN_LOCAL en estado PENDIENTE NO bloquea el día en DiaBloqueado.
  // Solo se crea la fila en DiaBloqueado al confirmarse por el admin en el panel.
  const evento = await prisma.reserva.create({
    data: {
      codigo,
      tipo: 'EVENTO',
      modalidad,
      estado: 'PENDIENTE',
      clienteNombre: nombre,
      clienteTelefono: telefono,
      fecha: fechaDb,
      personas,
      ocasion,
      detalles,
    },
  });

  // 8. Generar mensaje y enlace de WhatsApp
  const mensajeWhatsApp = [
    '¡Hola Dolce Florencia! Acabo de registrar una solicitud de evento en la web:',
    `Código: ${evento.codigo}`,
    `Nombre: ${nombre}`,
    `Fecha propuesta: ${fecha}`,
    `Modalidad: ${modalidad === 'EN_LOCAL' ? 'Celebración en el local' : 'Entrega de repostería/pedido'}`,
    `Personas estimadas: ${personas}`,
    `Ocasión: ${ocasion}`,
    `Detalles de la idea: ${detalles}`,
    '',
    '¿Podrían orientarme con la disponibilidad y presupuesto?',
  ].join('\n');

  const enlaceWhatsApp = generarEnlaceWhatsApp(mensajeWhatsApp);

  return {
    exito: true,
    codigo: evento.codigo,
    enlaceWhatsApp,
  };
}

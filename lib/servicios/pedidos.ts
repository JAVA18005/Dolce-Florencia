// lib/servicios/pedidos.ts — Server Action para registro de pedidos públicos.

'use server';

import { headers } from 'next/headers';
import prisma from '../db';
import { FormularioPedidoSchema } from '../validaciones/pedido';
import { parseYMDToDate } from '../fechas';
import { generarCodigoSeguimiento } from '../codigo';
import { verificarTurnstile } from '../turnstile';
import { verificarYRegistrarRateLimit } from '../rate-limit';
import { obtenerIpCliente } from '../ip';
import { generarEnlaceWhatsApp } from '../whatsapp';
import { formatearCentavosABs } from '../dinero';

export interface RespuestaAccionPedido {
  exito: boolean;
  mensaje?: string;
  codigo?: string;
  enlaceWhatsApp?: string;
  errores?: Record<string, string[]>;
}

export async function crearPedidoAction(datos: unknown): Promise<RespuestaAccionPedido> {
  const headersList = await headers();
  const ipCliente = obtenerIpCliente(headersList);

  // 1. Rate limiting por IP: máximo 10 pedidos por hora
  const controlRate = await verificarYRegistrarRateLimit(`ip:${ipCliente}:pedido`, 10, 3600);
  if (!controlRate.permitido) {
    return {
      exito: false,
      mensaje: `Has alcanzado el límite de solicitudes. Por favor reintenta en ${Math.ceil(
        (controlRate.segundosParaReintentar || 60) / 60
      )} minutos.`,
    };
  }

  // 2. Validación de entrada con Zod
  const parseo = FormularioPedidoSchema.safeParse(datos);
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
    entrega,
    direccionEntrega,
    fechaDeseada,
    horaDeseada,
    items,
    detalles,
    campoTrampa,
    turnstileToken,
  } = parseo.data;

  // 3. Honeypot: si el campo trampa viene lleno, simular éxito silencioso sin guardar nada
  if (campoTrampa && campoTrampa.trim().length > 0) {
    const codigoFicticio = generarCodigoSeguimiento();
    return {
      exito: true,
      codigo: codigoFicticio,
      enlaceWhatsApp: generarEnlaceWhatsApp('¡Hola! Me gustaría consultar sobre un pedido.'),
    };
  }

  // 4. Verificación de Turnstile en servidor (falla cerrado en producción)
  const turnstile = await verificarTurnstile(turnstileToken, ipCliente);
  if (!turnstile.valido) {
    return {
      exito: false,
      mensaje: 'No fue posible verificar la seguridad contra spam. Por favor recarga e intenta de nuevo.',
    };
  }

  const fechaDb = parseYMDToDate(fechaDeseada)!;

  // 5. Cargar productos reales de BD para asegurar nombres y precios oficiales en centavos
  const idsProductos = items
    .map((it) => it.productoId)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  const productosBd = idsProductos.length > 0
    ? await prisma.producto.findMany({
        where: { id: { in: idsProductos }, activo: true },
      })
    : [];

  const mapaProductos = new Map(productosBd.map((p) => [p.id, p]));

  // Preparar ítems copiando nombre y precio exacto de BD
  // Si precioCentavos es null (ej. torta personalizada), queda null y NO inventa ningún total
  const itemsParaCrear = items.map((it) => {
    if (it.productoId && mapaProductos.has(it.productoId)) {
      const prod = mapaProductos.get(it.productoId)!;
      return {
        productoId: prod.id,
        nombre: prod.nombre,
        cantidad: it.cantidad,
        precioUnitarioCentavos: prod.precioCentavos,
        nota: it.nota || null,
      };
    }
    return {
      productoId: null,
      nombre: it.nombre,
      cantidad: it.cantidad,
      precioUnitarioCentavos: null,
      nota: it.nota || null,
    };
  });

  // Generar código único aleatorio no secuencial
  let codigo = generarCodigoSeguimiento();
  let intentoCodigo = 0;
  while (intentoCodigo < 3) {
    const existente = await prisma.pedido.findUnique({ where: { codigo } });
    if (!existente) break;
    codigo = generarCodigoSeguimiento();
    intentoCodigo++;
  }

  // 6. Guardar en Base de Datos con estado inicial PENDIENTE
  const pedidoCreado = await prisma.pedido.create({
    data: {
      codigo,
      estado: 'PENDIENTE',
      clienteNombre: nombre,
      clienteTelefono: telefono,
      entrega,
      direccionEntrega: entrega === 'DOMICILIO' ? direccionEntrega : null,
      fechaDeseada: fechaDb,
      horaDeseada: horaDeseada || null,
      detalles: detalles || null,
      totalAcordadoCentavos: null, // Se acuerda por WhatsApp, nunca se inventa
      items: {
        create: itemsParaCrear,
      },
    },
    include: {
      items: true,
    },
  });

  // 7. Generar mensaje para WhatsApp estructurado y codificado
  const resumenItems = pedidoCreado.items
    .map((it) => {
      const precio = it.precioUnitarioCentavos
        ? ` (${formatearCentavosABs(it.precioUnitarioCentavos * it.cantidad)})`
        : ' (A cotizar)';
      return `• ${it.cantidad}x ${it.nombre}${precio}${it.nota ? ` - Nota: ${it.nota}` : ''}`;
    })
    .join('\n');

  const mensajeWhatsApp = [
    '¡Hola Dolce Florencia! Acabo de registrar una solicitud de pedido en la web:',
    `Código: ${codigo}`,
    `Nombre: ${nombre}`,
    `Fecha deseada: ${fechaDeseada}${horaDeseada ? ` a las ${horaDeseada}` : ''}`,
    `Modalidad: ${entrega === 'DOMICILIO' ? `Entrega a domicilio (${direccionEntrega})` : 'Retiro en local'}`,
    '',
    'Productos solicitados:',
    resumenItems,
    detalles ? `\nDetalles adicionales: ${detalles}` : '',
    '',
    '¿Podrían ayudarme a confirmar la disponibilidad y precio final?',
  ].join('\n');

  const enlaceWhatsApp = generarEnlaceWhatsApp(mensajeWhatsApp);

  return {
    exito: true,
    codigo,
    enlaceWhatsApp,
  };
}

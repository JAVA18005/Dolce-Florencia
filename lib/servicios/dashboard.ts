// lib/servicios/dashboard.ts — Métricas analíticas exclusivas para Admin basadas ÚNICAMENTE en ventas REALIZADA (§5.6)

import prisma from '../db';
import { EstadoVenta } from '@prisma/client';
import { exigirSesionServidor } from '../auth/sesion';
import { obtenerRangoPeriodoBolivia, ZONA_HORARIA_BOLIVIA } from '../fechas';

export type PeriodoDashboard = 'hoy' | 'semana' | 'mes';

export interface MetricasHora {
  hora: number; // 0 a 23
  etiqueta: string; // "15:00", "16:00", etc.
  cantidad: number;
  totalCentavos: number;
}

export interface ProductoVendidoRanking {
  productoId: string | null;
  nombre: string;
  unidadesVendidas: number;
  totalCentavos: number;
}

export interface MetricasDashboard {
  periodo: PeriodoDashboard;
  fechaInicio: Date;
  fechaFin: Date;
  ventasRealizadasCount: number;
  totalVentasCentavos: number;
  ticketPromedioCentavos: number;
  horasPico: MetricasHora[];
  rankingProductos: ProductoVendidoRanking[];
}

/**
 * Obtiene métricas del negocio evaluando EXCLUSIVAMENTE ventas en estado REALIZADA.
 * Filtra por período (hoy, semana, mes) en zona horaria America/La_Paz.
 * Protegido en servidor para usuarios con permiso 'dashboard.ver' (solo ADMIN).
 */
export async function obtenerMetricasDashboard(
  periodo: PeriodoDashboard = 'hoy'
): Promise<MetricasDashboard> {
  await exigirSesionServidor('dashboard.ver');

  const { inicio, fin } = obtenerRangoPeriodoBolivia(periodo);

  // 1. Consultar únicamente ventas con estado REALIZADA cobradas en el rango de fechas
  const ventas = await prisma.venta.findMany({
    where: {
      estado: EstadoVenta.REALIZADA,
      cobradaEn: {
        gte: inicio,
        lte: fin,
      },
    },
    select: {
      id: true,
      totalCentavos: true,
      cobradaEn: true,
      items: {
        select: {
          productoId: true,
          nombre: true,
          cantidad: true,
          precioUnitarioCentavos: true,
        },
      },
    },
    orderBy: { cobradaEn: 'asc' },
  });

  const ventasRealizadasCount = ventas.length;
  const totalVentasCentavos = ventas.reduce((acc, v) => acc + v.totalCentavos, 0);
  const ticketPromedioCentavos =
    ventasRealizadasCount > 0 ? Math.round(totalVentasCentavos / ventasRealizadasCount) : 0;

  // 2. Horas pico (distribución por hora local de Bolivia)
  const contadorHoras: Record<number, { cantidad: number; totalCentavos: number }> = {};
  for (let h = 0; h < 24; h++) {
    contadorHoras[h] = { cantidad: 0, totalCentavos: 0 };
  }

  for (const v of ventas) {
    if (v.cobradaEn) {
      // Extraer hora en formato 'HH' en America/La_Paz
      const horaStr = new Intl.DateTimeFormat('en-US', {
        timeZone: ZONA_HORARIA_BOLIVIA,
        hour: 'numeric',
        hour12: false,
      }).format(v.cobradaEn);

      const horaNum = parseInt(horaStr, 10);
      if (!isNaN(horaNum) && horaNum >= 0 && horaNum < 24) {
        contadorHoras[horaNum].cantidad += 1;
        contadorHoras[horaNum].totalCentavos += v.totalCentavos;
      }
    }
  }

  // Filtrar o mostrar franjas horarias relevantes (ej. 10:00 a 22:00 o todas las 24 horas)
  const horasPico: MetricasHora[] = [];
  for (let h = 0; h < 24; h++) {
    horasPico.push({
      hora: h,
      etiqueta: `${String(h).padStart(2, '0')}:00`,
      cantidad: contadorHoras[h].cantidad,
      totalCentavos: contadorHoras[h].totalCentavos,
    });
  }

  // 3. Ranking de productos más vendidos (por unidades de ítems en ventas REALIZADA)
  const mapaProductos = new Map<string, { nombre: string; unidades: number; totalCentavos: number }>();

  for (const v of ventas) {
    for (const it of v.items) {
      const clave = it.productoId || it.nombre;
      const actual = mapaProductos.get(clave) || {
        nombre: it.nombre,
        unidades: 0,
        totalCentavos: 0,
      };

      actual.unidades += it.cantidad;
      actual.totalCentavos += it.cantidad * it.precioUnitarioCentavos;
      mapaProductos.set(clave, actual);
    }
  }

  const rankingProductos: ProductoVendidoRanking[] = Array.from(mapaProductos.entries())
    .map(([pId, val]) => ({
      productoId: pId,
      nombre: val.nombre,
      unidadesVendidas: val.unidades,
      totalCentavos: val.totalCentavos,
    }))
    .sort((a, b) => b.unidadesVendidas - a.unidadesVendidas || b.totalCentavos - a.totalCentavos)
    .slice(0, 10); // Top 10

  return {
    periodo,
    fechaInicio: inicio,
    fechaFin: fin,
    ventasRealizadasCount,
    totalVentasCentavos,
    ticketPromedioCentavos,
    horasPico,
    rankingProductos,
  };
}

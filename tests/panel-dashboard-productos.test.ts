import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import prisma from '../lib/db';
import { Rol, EstadoVenta, OrigenVenta, MetodoPago } from '@prisma/client';
import { hashearPassword } from '../lib/auth/password';
import { crearSesionEnBd } from '../lib/auth/sesion';
import { obtenerMetricasDashboard } from '../lib/servicios/dashboard';
import {
  crearProducto,
  editarProducto,
  archivarProducto,
  desarchivarProducto,
  crearCategoria,
} from '../lib/servicios/productos';
import { obtenerHoyBolivia } from '../lib/fechas';

let sesionMockActiva: any = null;

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({ 'cf-connecting-ip': '127.0.0.1' })),
  cookies: vi.fn(async () => ({
    get: vi.fn((name: string) => {
      if (name === 'dolce_sesion_panel' && sesionMockActiva) {
        return { value: sesionMockActiva.token };
      }
      return undefined;
    }),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

describe('Hito 4: Dashboard de Métricas y Catálogo de Productos', () => {
  const adminEmail = 'admin-dash-test@dolceflorencia.com';
  const meseroEmail = 'mesero-dash-test@dolceflorencia.com';

  let adminId: string;
  let meseroId: string;
  let adminToken: string;
  let meseroToken: string;
  let categoriaTestId: string;

  beforeEach(async () => {
    const emailsLimpieza = [
      adminEmail,
      meseroEmail,
      'test-admin-ventas@dolceflorencia.com',
      'test-mesero-ventas@dolceflorencia.com',
    ];
    await prisma.ventaItem.deleteMany({
      where: {
        venta: {
          registradaPor: { email: { in: emailsLimpieza } },
        },
      },
    });
    await prisma.venta.deleteMany({
      where: {
        registradaPor: { email: { in: emailsLimpieza } },
      },
    });
    await prisma.producto.deleteMany({
      where: { nombre: { startsWith: 'Prod Hito4 Test' } },
    });
    await prisma.categoria.deleteMany({
      where: { nombre: { startsWith: 'Cat Hito4 Test' } },
    });
    await prisma.auditoria.deleteMany({
      where: { usuario: { email: { in: [adminEmail, meseroEmail] } } },
    });
    await prisma.sesion.deleteMany({
      where: { usuario: { email: { in: [adminEmail, meseroEmail] } } },
    });
    await prisma.usuario.deleteMany({
      where: { email: { in: [adminEmail, meseroEmail] } },
    });

    const hash = await hashearPassword('PasswordDash123!');

    const admin = await prisma.usuario.create({
      data: {
        nombre: 'Admin Dashboard',
        email: adminEmail,
        passwordHash: hash,
        rol: Rol.ADMIN,
        activo: true,
      },
    });
    adminId = admin.id;

    const mesero = await prisma.usuario.create({
      data: {
        nombre: 'Mesero Dashboard',
        email: meseroEmail,
        passwordHash: hash,
        rol: Rol.MESERO,
        activo: true,
      },
    });
    meseroId = mesero.id;

    const sesionAdmin = await crearSesionEnBd(adminId);
    adminToken = sesionAdmin.token;

    const sesionMesero = await crearSesionEnBd(meseroId);
    meseroToken = sesionMesero.token;

    const cat = await prisma.categoria.create({
      data: { nombre: 'Cat Hito4 Test Pastelería', orden: 1 },
    });
    categoriaTestId = cat.id;

    sesionMockActiva = { token: adminToken, usuarioId: adminId };
  });

  afterAll(async () => {
    await prisma.ventaItem.deleteMany({
      where: {
        venta: {
          registradaPor: { email: { in: [adminEmail, meseroEmail] } },
        },
      },
    });
    await prisma.venta.deleteMany({
      where: {
        registradaPor: { email: { in: [adminEmail, meseroEmail] } },
      },
    });
    await prisma.producto.deleteMany({
      where: { nombre: { startsWith: 'Prod Hito4 Test' } },
    });
    await prisma.categoria.deleteMany({
      where: { nombre: { startsWith: 'Cat Hito4 Test' } },
    });
    await prisma.auditoria.deleteMany({
      where: { usuario: { email: { in: [adminEmail, meseroEmail] } } },
    });
    await prisma.sesion.deleteMany({
      where: { usuario: { email: { in: [adminEmail, meseroEmail] } } },
    });
    await prisma.usuario.deleteMany({
      where: { email: { in: [adminEmail, meseroEmail] } },
    });
  });

  it('el dashboard cuenta ÚNICAMENTE ventas REALIZADA (ignora PENDIENTE_COBRO y ANULADA)', async () => {
    sesionMockActiva = { token: adminToken, usuarioId: adminId };
    const hoyUtc = obtenerHoyBolivia();
    // 14:00 hora Bolivia de hoy = 18:00 UTC
    const fechaCobroHoy = new Date(Date.UTC(hoyUtc.getUTCFullYear(), hoyUtc.getUTCMonth(), hoyUtc.getUTCDate(), 18, 0, 0));

    const metricasBase = await obtenerMetricasDashboard('hoy');

    const pRealizada = await prisma.producto.create({
      data: {
        nombre: 'Prod Hito4 Test Croissant Realizada',
        categoriaId: categoriaTestId,
        precioCentavos: 2500,
      },
    });

    const pPendiente = await prisma.producto.create({
      data: {
        nombre: 'Prod Hito4 Test Pendiente',
        categoriaId: categoriaTestId,
        precioCentavos: 3000,
      },
    });

    const pAnulada = await prisma.producto.create({
      data: {
        nombre: 'Prod Hito4 Test Anulada',
        categoriaId: categoriaTestId,
        precioCentavos: 2000,
      },
    });

    // 1. Venta REALIZADA (5000 centavos = Bs 50.00)
    await prisma.venta.create({
      data: {
        estado: EstadoVenta.REALIZADA,
        origen: OrigenVenta.MOSTRADOR,
        totalCentavos: 5000,
        metodoPago: MetodoPago.EFECTIVO,
        registradaPorId: adminId,
        cobradaPorId: adminId,
        cobradaEn: fechaCobroHoy,
        items: {
          create: [{ productoId: pRealizada.id, nombre: pRealizada.nombre, cantidad: 2, precioUnitarioCentavos: 2500 }],
        },
      },
    });

    // 2. Venta PENDIENTE_COBRO (3000 centavos) - NO DEBE CONTAR
    await prisma.venta.create({
      data: {
        estado: EstadoVenta.PENDIENTE_COBRO,
        origen: OrigenVenta.MOSTRADOR,
        totalCentavos: 3000,
        registradaPorId: adminId,
        creadaEn: fechaCobroHoy,
        items: {
          create: [{ productoId: pPendiente.id, nombre: pPendiente.nombre, cantidad: 1, precioUnitarioCentavos: 3000 }],
        },
      },
    });

    // 3. Venta ANULADA (8000 centavos) - NO DEBE CONTAR
    await prisma.venta.create({
      data: {
        estado: EstadoVenta.ANULADA,
        origen: OrigenVenta.MOSTRADOR,
        totalCentavos: 8000,
        anuladaMotivo: 'Error de cobro',
        registradaPorId: adminId,
        cobradaEn: fechaCobroHoy,
        items: {
          create: [{ productoId: pAnulada.id, nombre: pAnulada.nombre, cantidad: 4, precioUnitarioCentavos: 2000 }],
        },
      },
    });

    const metricas = await obtenerMetricasDashboard('hoy');
    // Únicamente la venta REALIZADA incrementó los totales
    expect(metricas.ventasRealizadasCount).toBe(metricasBase.ventasRealizadasCount + 1);
    expect(metricas.totalVentasCentavos).toBe(metricasBase.totalVentasCentavos + 5000);

    // Ranking de productos: el producto de REALIZADA figura con 2 unidades
    const rankingRealizada = metricas.rankingProductos.find((r) => r.nombre === pRealizada.nombre);
    expect(rankingRealizada).toBeDefined();
    expect(rankingRealizada?.unidadesVendidas).toBe(2);

    // Los productos de PENDIENTE_COBRO y ANULADA NUNCA ingresan al ranking
    const rankingPendiente = metricas.rankingProductos.find((r) => r.nombre === pPendiente.nombre);
    expect(rankingPendiente).toBeUndefined();
    const rankingAnulada = metricas.rankingProductos.find((r) => r.nombre === pAnulada.nombre);
    expect(rankingAnulada).toBeUndefined();
  });

  it('límites de día en America/La_Paz incluye ventas cercanas a la medianoche (23:45 Bolivia)', async () => {
    sesionMockActiva = { token: adminToken, usuarioId: adminId };
    const hoyUtc = obtenerHoyBolivia();

    const metricasBase = await obtenerMetricasDashboard('hoy');
    const franja23Base = metricasBase.horasPico.find((h) => h.hora === 23)?.cantidad ?? 0;

    // 23:45 hora Bolivia = 03:45 UTC del día siguiente
    const ventaCercaMedianoche = new Date(
      Date.UTC(hoyUtc.getUTCFullYear(), hoyUtc.getUTCMonth(), hoyUtc.getUTCDate() + 1, 3, 45, 0)
    );

    const p = await prisma.producto.create({
      data: {
        nombre: 'Prod Hito4 Test Medianoche',
        categoriaId: categoriaTestId,
        precioCentavos: 1500,
      },
    });

    await prisma.venta.create({
      data: {
        estado: EstadoVenta.REALIZADA,
        origen: OrigenVenta.MOSTRADOR,
        totalCentavos: 1500,
        metodoPago: MetodoPago.QR,
        registradaPorId: adminId,
        cobradaPorId: adminId,
        cobradaEn: ventaCercaMedianoche,
        items: {
          create: [{ productoId: p.id, nombre: p.nombre, cantidad: 1, precioUnitarioCentavos: 1500 }],
        },
      },
    });

    const metricas = await obtenerMetricasDashboard('hoy');
    expect(metricas.ventasRealizadasCount).toBe(metricasBase.ventasRealizadasCount + 1);
    expect(metricas.totalVentasCentavos).toBe(metricasBase.totalVentasCentavos + 1500);

    // Verifica que la franja de las 23:00 registró la venta
    const franja23 = metricas.horasPico.find((h) => h.hora === 23);
    expect(franja23?.cantidad).toBe(franja23Base + 1);
  });

  it('mesero no puede acceder al dashboard ni gestionar productos', async () => {
    sesionMockActiva = { token: meseroToken, usuarioId: meseroId };

    await expect(obtenerMetricasDashboard('hoy')).rejects.toThrow(/Acceso denegado/);

    await expect(
      crearProducto({
        nombre: 'Prod Ilegal Mesero',
        categoriaId: categoriaTestId,
        precioCentavos: 1000,
      })
    ).rejects.toThrow(/Acceso denegado/);

    await expect(archivarProducto('fake-id')).rejects.toThrow(/Acceso denegado/);
    await expect(crearCategoria({ nombre: 'Cat Ilegal' })).rejects.toThrow(/Acceso denegado/);
  });

  it('CRUD de productos y archivado lógico (activo = false) preserva historial de ventas', async () => {
    sesionMockActiva = { token: adminToken, usuarioId: adminId };

    // 1. Crear producto con precio entero en centavos
    const prod = await crearProducto({
      nombre: 'Prod Hito4 Test Alfajor',
      categoriaId: categoriaTestId,
      precioCentavos: 800, // Bs 8.00
      descripcion: 'Alfajor artesanal relleno de dulce de leche',
      imagenUrl: '/productos/alfajor.jpg',
      aptoMascotas: false,
    });
    expect(prod.id).toBeDefined();
    expect(prod.activo).toBe(true);

    // 2. Simular venta histórica de este producto
    const venta = await prisma.venta.create({
      data: {
        estado: EstadoVenta.REALIZADA,
        totalCentavos: 1600,
        registradaPorId: adminId,
        cobradaPorId: adminId,
        cobradaEn: new Date(),
        items: {
          create: [{ productoId: prod.id, nombre: prod.nombre, cantidad: 2, precioUnitarioCentavos: 800 }],
        },
      },
      include: { items: true },
    });

    // 3. Archivar producto (NO se borra)
    const archivado = await archivarProducto(prod.id);
    expect(archivado.activo).toBe(false);

    // Menú público consulta productos activos: no debe aparecer
    const productosMenu = await prisma.producto.findMany({
      where: { id: prod.id, activo: true },
    });
    expect(productosMenu).toHaveLength(0);

    // Pero la venta histórica conserva el producto y sus datos intactos
    const ventaHistorica = await prisma.venta.findUnique({
      where: { id: venta.id },
      include: { items: true },
    });
    expect(ventaHistorica?.items[0].productoId).toBe(prod.id);
    expect(ventaHistorica?.items[0].precioUnitarioCentavos).toBe(800);

    // 4. Reactivar producto
    const reactivado = await desarchivarProducto(prod.id);
    expect(reactivado.activo).toBe(true);
  });

  it('edición de precios audita precio anterior y nuevo sin afectar ventas anteriores', async () => {
    sesionMockActiva = { token: adminToken, usuarioId: adminId };

    const prod = await crearProducto({
      nombre: 'Prod Hito4 Test Brownie',
      categoriaId: categoriaTestId,
      precioCentavos: 1200, // Bs 12.00
    });

    // Venta al precio viejo
    const v1 = await prisma.venta.create({
      data: {
        estado: EstadoVenta.REALIZADA,
        totalCentavos: 1200,
        registradaPorId: adminId,
        items: {
          create: [{ productoId: prod.id, nombre: prod.nombre, cantidad: 1, precioUnitarioCentavos: 1200 }],
        },
      },
    });

    // Editar precio a 1800 centavos
    await editarProducto(prod.id, {
      precioCentavos: 1800,
    });

    // Auditoría de cambio de precio
    const audit = await prisma.auditoria.findFirst({
      where: { entidadId: prod.id, accion: 'producto.cambiar_precio' },
    });
    expect(audit).not.toBeNull();
    expect((audit?.detalle as any).precioAnteriorCentavos).toBe(1200);
    expect((audit?.detalle as any).precioNuevoCentavos).toBe(1800);

    // Venta anterior sigue conservando 1200 centavos
    const v1Post = await prisma.venta.findUnique({
      where: { id: v1.id },
      include: { items: true },
    });
    expect(v1Post?.items[0].precioUnitarioCentavos).toBe(1200);
  });
});

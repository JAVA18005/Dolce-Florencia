import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import prisma from '../lib/db';
import { Rol, EstadoVenta, OrigenVenta, MetodoPago, ZonaMesa } from '@prisma/client';
import { hashearPassword } from '../lib/auth/password';
import { crearSesionEnBd } from '../lib/auth/sesion';
import { registrarVenta, cobrarVenta, anularVenta } from '../lib/servicios/ventas';
import { listarMesas } from '../lib/servicios/mesas';
import { entregarPedido } from '../lib/servicios/pedidos-panel';
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

describe('Hito 3: Ventas de Salón, Caja, Pedido a Venta y Estados Derivados', () => {
  const adminEmail = 'admin-ventas-test@dolceflorencia.com';
  const meseroEmail = 'mesero-ventas-test@dolceflorencia.com';

  let adminId: string;
  let meseroId: string;
  let adminToken: string;
  let meseroToken: string;

  let mesaNormalId: string;
  let barraMesaId: string;
  let producto1Id: string;
  let producto2Id: string;
  let categoriaTestId: string;

  beforeEach(async () => {
    // Limpieza de datos de prueba
    await prisma.ventaItem.deleteMany();
    await prisma.venta.deleteMany({
      where: {
        OR: [
          { registradaPor: { email: { in: [adminEmail, meseroEmail] } } },
          { pedido: { clienteNombre: { startsWith: 'Test Ventas' } } },
        ],
      },
    });
    await prisma.pedidoItem.deleteMany();
    await prisma.pedido.deleteMany({
      where: { clienteNombre: { startsWith: 'Test Ventas' } },
    });
    await prisma.reserva.deleteMany({
      where: { clienteNombre: { startsWith: 'Test Ventas' } },
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

    const hash = await hashearPassword('PasswordVentas123!');

    const admin = await prisma.usuario.create({
      data: {
        nombre: 'Admin Ventas',
        email: adminEmail,
        passwordHash: hash,
        rol: Rol.ADMIN,
        activo: true,
      },
    });
    adminId = admin.id;

    const mesero = await prisma.usuario.create({
      data: {
        nombre: 'Mesero Ventas',
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

    // Obtener o crear categoría y productos
    let cat = await prisma.categoria.findFirst({ where: { nombre: 'Test Repostería' } });
    if (!cat) {
      cat = await prisma.categoria.create({
        data: { nombre: 'Test Repostería' },
      });
    }
    categoriaTestId = cat.id;

    let p1 = await prisma.producto.findFirst({ where: { nombre: 'Torta Red Velvet Test' } });
    if (!p1) {
      p1 = await prisma.producto.create({
        data: {
          nombre: 'Torta Red Velvet Test',
          categoriaId: categoriaTestId,
          precioCentavos: 2500, // Bs 25.00
          activo: true,
        },
      });
    } else {
      await prisma.producto.update({
        where: { id: p1.id },
        data: { precioCentavos: 2500, activo: true },
      });
    }
    producto1Id = p1.id;

    let p2 = await prisma.producto.findFirst({ where: { nombre: 'Café Latte Test' } });
    if (!p2) {
      p2 = await prisma.producto.create({
        data: {
          nombre: 'Café Latte Test',
          categoriaId: categoriaTestId,
          precioCentavos: 1800, // Bs 18.00
          activo: true,
        },
      });
    } else {
      await prisma.producto.update({
        where: { id: p2.id },
        data: { precioCentavos: 1800, activo: true },
      });
    }
    producto2Id = p2.id;

    // Mesas de prueba (usar las del seed sin alterar capacidades de zona)
    let mNormal = await prisma.mesa.findFirst({
      where: { reservable: true, permiteVariasCuentas: false },
    });
    if (!mNormal) {
      mNormal = await prisma.mesa.create({
        data: {
          nombre: 'Mesa 1',
          zona: ZonaMesa.INTERIOR,
          capacidad: 3,
          reservable: true,
          permiteVariasCuentas: false,
          habilitada: true,
        },
      });
    }
    mesaNormalId = mNormal.id;

    let mBarra = await prisma.mesa.findFirst({
      where: { permiteVariasCuentas: true },
    });
    if (!mBarra) {
      mBarra = await prisma.mesa.create({
        data: {
          nombre: 'Barra',
          zona: ZonaMesa.BARRA,
          capacidad: 3,
          reservable: false,
          permiteVariasCuentas: true,
          habilitada: true,
        },
      });
    }
    barraMesaId = mBarra.id;

    sesionMockActiva = { token: meseroToken, usuarioId: meseroId };
  });

  afterAll(async () => {
    await prisma.ventaItem.deleteMany();
    await prisma.venta.deleteMany({
      where: {
        OR: [
          { registradaPor: { email: { in: [adminEmail, meseroEmail] } } },
          { pedido: { clienteNombre: { startsWith: 'Test Ventas' } } },
        ],
      },
    });
    await prisma.pedidoItem.deleteMany();
    await prisma.pedido.deleteMany({
      where: { clienteNombre: { startsWith: 'Test Ventas' } },
    });
    await prisma.reserva.deleteMany({
      where: { clienteNombre: { startsWith: 'Test Ventas' } },
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

  it('calcula totales en servidor ignorando datos del cliente y copia nombre y precio en los ítems', async () => {
    sesionMockActiva = { token: meseroToken, usuarioId: meseroId };

    // 2 Tortas (2500 c/u) + 1 Café (1800 c/u) = 5000 + 1800 = 6800 centavos (Bs 68.00)
    const res = await registrarVenta({
      mesaId: null, // Mostrador
      items: [
        { productoId: producto1Id, cantidad: 2 },
        { productoId: producto2Id, cantidad: 1 },
      ],
    });

    expect(res.venta.totalCentavos).toBe(6800);
    expect(res.venta.estado).toBe(EstadoVenta.PENDIENTE_COBRO);
    expect(res.venta.registradaPorId).toBe(meseroId);
    expect(res.venta.cobradaPorId).toBeNull();
    expect(res.venta.items).toHaveLength(2);

    const itemTorta = res.venta.items.find((i) => i.productoId === producto1Id);
    expect(itemTorta?.nombre).toBe('Torta Red Velvet Test');
    expect(itemTorta?.precioUnitarioCentavos).toBe(2500);
    expect(itemTorta?.cantidad).toBe(2);

    // Auditoría registrada en la misma transacción
    const audit = await prisma.auditoria.findFirst({
      where: { entidadId: res.venta.id, accion: 'venta.crear' },
    });
    expect(audit).not.toBeNull();
    expect(audit?.usuarioId).toBe(meseroId);
  });

  it('los ítems conservan nombre y precio aunque cambie el catálogo posteriormente', async () => {
    sesionMockActiva = { token: meseroToken, usuarioId: meseroId };

    const res = await registrarVenta({
      mesaId: null,
      items: [{ productoId: producto1Id, cantidad: 1 }],
    });

    const ventaId = res.venta.id;
    const itemOriginal = res.venta.items[0];
    expect(itemOriginal.precioUnitarioCentavos).toBe(2500);
    expect(itemOriginal.nombre).toBe('Torta Red Velvet Test');

    // Cambiar precio y nombre en el catálogo
    await prisma.producto.update({
      where: { id: producto1Id },
      data: {
        nombre: 'Torta Red Velvet Premium Editada',
        precioCentavos: 4500, // Subió a Bs 45.00
      },
    });

    // Consultar la venta y verificar inmutabilidad
    const ventaPost = await prisma.venta.findUnique({
      where: { id: ventaId },
      include: { items: true },
    });
    expect(ventaPost?.totalCentavos).toBe(2500); // Sigue 25.00
    expect(ventaPost?.items[0].nombre).toBe('Torta Red Velvet Test');
    expect(ventaPost?.items[0].precioUnitarioCentavos).toBe(2500);
  });

  it('garantiza cuenta única en mesa normal en BD; si se registran más ítems los suma a la existente', async () => {
    sesionMockActiva = { token: meseroToken, usuarioId: meseroId };

    // 1. Abrir venta en mesa normal con 1 Torta (2500)
    const venta1 = await registrarVenta({
      mesaId: mesaNormalId,
      items: [{ productoId: producto1Id, cantidad: 1 }],
    });
    expect(venta1.esAgregadoAExistente).toBe(false);
    expect(venta1.venta.totalCentavos).toBe(2500);
    expect(venta1.venta.mesaCuentaUnicaAbiertaId).toBe(mesaNormalId);

    // 2. Registrar otra venta en la misma mesa -> el servicio agrega ítems a la comanda existente
    const venta2 = await registrarVenta({
      mesaId: mesaNormalId,
      items: [{ productoId: producto2Id, cantidad: 2 }], // 2 cafés = 3600
    });
    expect(venta2.esAgregadoAExistente).toBe(true);
    expect(venta2.venta.id).toBe(venta1.venta.id); // Es la misma venta
    expect(venta2.venta.items).toHaveLength(2); // 2 líneas de ítem (Torta y Café)
    const unidadesTotales = venta2.venta.items.reduce((acc, i) => acc + i.cantidad, 0);
    expect(unidadesTotales).toBe(3); // 1 torta + 2 cafés

    // 3. Garantía directa en BD: Si se intenta crear otra Venta en PENDIENTE_COBRO con la misma mesa,
    // la restricción única mesaCuentaUnicaAbiertaId rechaza la inserción
    await expect(
      prisma.venta.create({
        data: {
          estado: 'PENDIENTE_COBRO',
          origen: 'SALON',
          mesaId: mesaNormalId,
          mesaCuentaUnicaAbiertaId: mesaNormalId,
          totalCentavos: 1000,
          registradaPorId: meseroId,
        },
      })
    ).rejects.toThrow();
  });

  it('la barra permite varias cuentas abiertas independientes sin bloquearse', async () => {
    sesionMockActiva = { token: meseroToken, usuarioId: meseroId };

    const c1 = await registrarVenta({
      mesaId: barraMesaId,
      items: [{ productoId: producto1Id, cantidad: 1 }],
    });

    const c2 = await registrarVenta({
      mesaId: barraMesaId,
      items: [{ productoId: producto2Id, cantidad: 1 }],
    });

    expect(c1.venta.id).not.toBe(c2.venta.id);
    expect(c1.venta.mesaCuentaUnicaAbiertaId).toBeNull();
    expect(c2.venta.mesaCuentaUnicaAbiertaId).toBeNull();

    // Las mesas calculan estado derivado: la barra muestra cuentas abiertas y no OCUPADA
    const mesas = await listarMesas();
    const barra = mesas.find((m) => m.id === barraMesaId);
    expect(barra?.estadoDerivado).toBe('LIBRE');
    expect(barra?.cuentasAbiertas).toBe(2);
  });

  it('calcula estados derivados de mesa en cada caso y libera la mesa al cobrar', async () => {
    sesionMockActiva = { token: meseroToken, usuarioId: meseroId };
    const hoy = obtenerHoyBolivia();

    // Crear una mesa sin nada -> LIBRE
    let mesas = await listarMesas();
    let m = mesas.find((x) => x.id === mesaNormalId);
    expect(m?.estadoDerivado).toBe('LIBRE');

    // Deshabilitar -> FUERA_DE_SERVICIO
    await prisma.mesa.update({ where: { id: mesaNormalId }, data: { habilitada: false } });
    mesas = await listarMesas();
    m = mesas.find((x) => x.id === mesaNormalId);
    expect(m?.estadoDerivado).toBe('FUERA_DE_SERVICIO');
    await prisma.mesa.update({ where: { id: mesaNormalId }, data: { habilitada: true } });

    // Crear reserva confirmada para hoy -> RESERVADA
    const resv = await prisma.reserva.create({
      data: {
        codigo: 'DF-RES-DERIV',
        tipo: 'MESA',
        clienteNombre: 'Test Ventas Derivado',
        clienteTelefono: '59178198181',
        fecha: hoy,
        hora: '17:00',
        personas: 2,
        estado: 'CONFIRMADA',
        mesaId: mesaNormalId,
      },
    });

    mesas = await listarMesas();
    m = mesas.find((x) => x.id === mesaNormalId);
    expect(m?.estadoDerivado).toBe('RESERVADA');

    // Abrir venta en esa mesa -> OCUPADA y la reserva pasa a CUMPLIDA
    const v = await registrarVenta({
      mesaId: mesaNormalId,
      items: [{ productoId: producto1Id, cantidad: 1 }],
    });

    mesas = await listarMesas();
    m = mesas.find((x) => x.id === mesaNormalId);
    expect(m?.estadoDerivado).toBe('OCUPADA');

    const resvPost = await prisma.reserva.findUnique({ where: { id: resv.id } });
    expect(resvPost?.estado).toBe('CUMPLIDA');

    // Cobrar la venta -> La mesa queda LIBRE sola
    await cobrarVenta(v.venta.id, { metodoPago: MetodoPago.EFECTIVO });

    mesas = await listarMesas();
    m = mesas.find((x) => x.id === mesaNormalId);
    expect(m?.estadoDerivado).toBe('LIBRE');
  });

  it('cobrarVenta: mesero y admin pueden cobrar; anularVenta: solo admin puede anular', async () => {
    // 1. Crear venta
    sesionMockActiva = { token: meseroToken, usuarioId: meseroId };
    const res = await registrarVenta({
      mesaId: null,
      items: [{ productoId: producto1Id, cantidad: 1 }],
    });
    const ventaId = res.venta.id;

    // 2. Mesero cobra
    const cobrada = await cobrarVenta(ventaId, {
      metodoPago: MetodoPago.QR,
      referenciaPago: 'QR-12345',
    });
    expect(cobrada.estado).toBe('REALIZADA');
    expect(cobrada.cobradaPorId).toBe(meseroId);
    expect(cobrada.metodoPago).toBe('QR');
    expect(cobrada.referenciaPago).toBe('QR-12345');

    // Auditoría de cobro
    const auditCobro = await prisma.auditoria.findFirst({
      where: { entidadId: ventaId, accion: 'venta.cobrar' },
    });
    expect(auditCobro).not.toBeNull();

    // 3. Mesero intenta anular -> Acceso denegado
    await expect(anularVenta(ventaId, 'Error de cobro')).rejects.toThrow(/Acceso denegado/);

    // 4. Admin anula
    sesionMockActiva = { token: adminToken, usuarioId: adminId };
    const anulada = await anularVenta(ventaId, 'Cancelado por el cliente antes de servir');
    expect(anulada.estado).toBe('ANULADA');
    expect(anulada.anuladaMotivo).toBe('Cancelado por el cliente antes de servir');

    // Auditoría de anulación
    const auditAnula = await prisma.auditoria.findFirst({
      where: { entidadId: ventaId, accion: 'venta.anular' },
    });
    expect(auditAnula).not.toBeNull();
    expect(auditAnula?.usuarioId).toBe(adminId);
  });

  it('Pedido a Venta: al marcar ENTREGADO crea Venta en misma transacción y previene duplicados concurrentes', async () => {
    sesionMockActiva = { token: meseroToken, usuarioId: meseroId };

    const pedido = await prisma.pedido.create({
      data: {
        codigo: 'DF-PED-ENT',
        clienteNombre: 'Test Ventas Pedido',
        clienteTelefono: '59178198181',
        fechaDeseada: new Date('2026-11-01T00:00:00.000Z'),
        estado: 'CONFIRMADO',
        totalAcordadoCentavos: 5000,
        items: {
          create: [
            {
              productoId: producto1Id,
              nombre: 'Torta Red Velvet Test',
              cantidad: 2,
              precioUnitarioCentavos: 2500,
            },
          ],
        },
      },
    });

    // 1. Primera entrega exitosa
    const res = await entregarPedido(pedido.id);
    expect(res.pedido.estado).toBe('ENTREGADO');
    expect(res.venta.origen).toBe(OrigenVenta.PEDIDO_WEB);
    expect(res.venta.estado).toBe(EstadoVenta.PENDIENTE_COBRO);
    expect(res.venta.totalCentavos).toBe(5000);
    expect(res.venta.pedidoId).toBe(pedido.id);
    expect(res.venta.items).toHaveLength(1);

    // 2. Segundo llamado (doble clic o idempotencia) no duplica la venta
    const res2 = await entregarPedido(pedido.id);
    expect(res2.esDuplicado).toBe(true);
    expect(res2.venta.id).toBe(res.venta.id);

    const totalVentasDePedido = await prisma.venta.count({
      where: { pedidoId: pedido.id },
    });
    expect(totalVentasDePedido).toBe(1);

    // 3. Auditoría atómica registrada
    const auditEntrega = await prisma.auditoria.findFirst({
      where: { entidadId: pedido.id, accion: 'pedido.entregar' },
    });
    expect(auditEntrega).not.toBeNull();

    const auditVentaPedido = await prisma.auditoria.findFirst({
      where: { entidadId: res.venta.id, accion: 'venta.crear_desde_pedido' },
    });
    expect(auditVentaPedido).not.toBeNull();
  });
});

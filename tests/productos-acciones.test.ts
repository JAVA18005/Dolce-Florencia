// tests/productos-acciones.test.ts — Borrado de archivos del bucket en las
// acciones de guardado. Verifica que el borrado se deriva de la comparación
// BD anterior vs. nuevos valores (NUNCA de valores arbitrarios del cliente) y
// que crear no borra nada.

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import prisma from '../lib/db';
import { Rol } from '@prisma/client';
import { hashearPassword } from '../lib/auth/password';
import { crearSesionEnBd } from '../lib/auth/sesion';
import {
  crearProductoAction,
  editarProductoAction,
} from '@/app/(panel)/panel/productos/acciones';

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

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const mocks = vi.hoisted(() => ({
  borrarArchivos: vi.fn(),
}));

vi.mock('@/lib/servicios/almacenamiento', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/servicios/almacenamiento')>();
  return { ...mod, borrarArchivosProducto: mocks.borrarArchivos };
});

const baseUrl = 'https://stub.supabase.co/storage/v1/object/public/productos';

describe('Acciones de producto: borrado de bucket derivado de la BD (no del cliente)', () => {
  const adminEmail = 'admin-acciones-test@dolceflorencia.com';
  const meseroEmail = 'mesero-acciones-test@dolceflorencia.com';

  let adminToken: string;
  let meseroToken: string;
  let categoriaId: string;

  beforeEach(async () => {
    for (const email of [adminEmail, meseroEmail]) {
      await prisma.ventaItem.deleteMany({ where: { venta: { registradaPor: { email } } } });
      await prisma.venta.deleteMany({ where: { registradaPor: { email } } });
      await prisma.auditoria.deleteMany({ where: { usuario: { email } } });
      await prisma.sesion.deleteMany({ where: { usuario: { email } } });
      await prisma.usuario.deleteMany({ where: { email } });
    }
    await prisma.producto.deleteMany({ where: { nombre: { startsWith: 'Prod Accion Test' } } });
    await prisma.categoria.deleteMany({ where: { nombre: { startsWith: 'Cat Accion Test' } } });

    const hash = await hashearPassword('PasswordAccion123!');
    const admin = await prisma.usuario.create({
      data: { nombre: 'Admin Acciones', email: adminEmail, passwordHash: hash, rol: Rol.ADMIN, activo: true },
    });
    const mesero = await prisma.usuario.create({
      data: { nombre: 'Mesero Acciones', email: meseroEmail, passwordHash: hash, rol: Rol.MESERO, activo: true },
    });
    adminToken = (await crearSesionEnBd(admin.id)).token;
    meseroToken = (await crearSesionEnBd(mesero.id)).token;

    const cat = await prisma.categoria.create({ data: { nombre: 'Cat Accion Test', orden: 1 } });
    categoriaId = cat.id;

    process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://stub.supabase.co';

    mocks.borrarArchivos.mockReset();
    mocks.borrarArchivos.mockResolvedValue({ borrados: 1 });

    sesionMockActiva = { token: adminToken, usuarioId: '' };
  });

  afterAll(async () => {
    for (const email of [adminEmail, meseroEmail]) {
      await prisma.ventaItem.deleteMany({ where: { venta: { registradaPor: { email } } } });
      await prisma.venta.deleteMany({ where: { registradaPor: { email } } });
      await prisma.auditoria.deleteMany({ where: { usuario: { email } } });
      await prisma.sesion.deleteMany({ where: { usuario: { email } } });
      await prisma.usuario.deleteMany({ where: { email } });
    }
    await prisma.producto.deleteMany({ where: { nombre: { startsWith: 'Prod Accion Test' } } });
    await prisma.categoria.deleteMany({ where: { nombre: { startsWith: 'Cat Accion Test' } } });
  });

  it('crearProductoAction NUNCA borra archivos del bucket', async () => {
    sesionMockActiva = { token: adminToken, usuarioId: '' };

    const res = await crearProductoAction({
      nombre: 'Prod Accion Test Crear',
      categoriaId,
      imagenUrl: `${baseUrl}/imagenes/arbitraria.jpg`, // valor del cliente: irrelevante
    });

    expect(res.error).toBeUndefined();
    expect(res.exito).toBe(true);
    expect(mocks.borrarArchivos).not.toHaveBeenCalled();
  });

  it('editarProductoAction borra SOLO el archivo anterior que dejó de usarse', async () => {
    sesionMockActiva = { token: adminToken, usuarioId: '' };

    const prod = await prisma.producto.create({
      data: {
        nombre: 'Prod Accion Test Reemplazo',
        categoriaId,
        imagenUrl: `${baseUrl}/imagenes/vieja.jpg`,
        modeloArUrl: `${baseUrl}/modelos/viejo.glb`,
      },
    });

    // Se reemplaza la imagen pero el modelo se mantiene igual.
    const res = await editarProductoAction(prod.id, {
      imagenUrl: `${baseUrl}/imagenes/nueva.jpg`,
      modeloArUrl: `${baseUrl}/modelos/viejo.glb`,
    });

    expect(res.error).toBeUndefined();
    expect(mocks.borrarArchivos).toHaveBeenCalledTimes(1);
    expect(mocks.borrarArchivos).toHaveBeenCalledWith([`${baseUrl}/imagenes/vieja.jpg`]);

    const persistido = await prisma.producto.findUnique({ where: { id: prod.id } });
    expect(persistido?.imagenUrl).toBe(`${baseUrl}/imagenes/nueva.jpg`);
    expect(persistido?.modeloArUrl).toBe(`${baseUrl}/modelos/viejo.glb`);
  });

  it('una URL arbitraria enviada por el cliente NO dispara borrado alguno', async () => {
    sesionMockActiva = { token: adminToken, usuarioId: '' };

    const prod = await prisma.producto.create({
      data: { nombre: 'Prod Accion Test Arbitraria', categoriaId, imagenUrl: null },
    });

    // El cliente "inventa" una URL de nuestro bucket en imagenUrl: como el
    // producto no la tenía antes en BD, no hay nada que borrar.
    const res = await editarProductoAction(prod.id, {
      imagenUrl: `${baseUrl}/imagenes/inyectada.jpg`,
    });

    expect(res.error).toBeUndefined();
    expect(mocks.borrarArchivos).not.toHaveBeenCalled();

    const persistido = await prisma.producto.findUnique({ where: { id: prod.id } });
    expect(persistido?.imagenUrl).toBe(`${baseUrl}/imagenes/inyectada.jpg`);
  });

  it('editarProductoAction al quitar la imagen borra el archivo anterior del bucket', async () => {
    sesionMockActiva = { token: adminToken, usuarioId: '' };

    const prod = await prisma.producto.create({
      data: {
        nombre: 'Prod Accion Test Quitar',
        categoriaId,
        imagenUrl: `${baseUrl}/imagenes/a-quitar.jpg`,
        modeloArUrl: `${baseUrl}/modelos/queda.glb`,
      },
    });

    const res = await editarProductoAction(prod.id, { imagenUrl: null });

    expect(res.error).toBeUndefined();
    expect(mocks.borrarArchivos).toHaveBeenCalledTimes(1);
    expect(mocks.borrarArchivos).toHaveBeenCalledWith([`${baseUrl}/imagenes/a-quitar.jpg`]);
  });

  it('NO borra nada si el guardado falla (el producto sigue apuntando a su archivo)', async () => {
    sesionMockActiva = { token: adminToken, usuarioId: '' };

    const prod = await prisma.producto.create({
      data: { nombre: 'Prod Accion Test Fallo', categoriaId, imagenUrl: `${baseUrl}/imagenes/vieja.jpg` },
    });

    // datos inválidos: el nombre vacío hace fallar la validación Zod.
    const res = await editarProductoAction(prod.id, { nombre: '', imagenUrl: `${baseUrl}/imagenes/nueva.jpg` });

    expect(res.error).toBeTruthy();
    expect(mocks.borrarArchivos).not.toHaveBeenCalled();

    const persistido = await prisma.producto.findUnique({ where: { id: prod.id } });
    expect(persistido?.imagenUrl).toBe(`${baseUrl}/imagenes/vieja.jpg`);
  });

  it('rechaza a un mesero: no guarda y no borra', async () => {
    sesionMockActiva = { token: meseroToken, usuarioId: '' };

    const prod = await prisma.producto.create({
      data: { nombre: 'Prod Accion Test Mesero', categoriaId, imagenUrl: `${baseUrl}/imagenes/sin-borrar.jpg` },
    });

    const res = await editarProductoAction(prod.id, { nombre: 'Prod Accion Test Mesero' });

    expect(res.error).toMatch(/Acceso denegado/);
    expect(mocks.borrarArchivos).not.toHaveBeenCalled();
  });
});
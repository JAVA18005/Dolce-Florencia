// lib/servicios/productos.ts — Gestión de catálogo de productos, categorías y archivado lógico (§5.6)

import prisma from '../db';
import { exigirSesionServidor } from '../auth/sesion';
import { registrarAuditoria } from '../auditoria';
import { CategoriaSchema, ProductoSchema } from '../validaciones/producto';

export interface CrearProductoDatos {
  nombre: string;
  descripcion?: string | null;
  categoriaId: string;
  precioCentavos?: number | null;
  imagenUrl?: string | null;
  modeloArUrl?: string | null;
  modeloArIosUrl?: string | null;
  aptoMascotas?: boolean;
  orden?: number;
}

export interface EditarProductoDatos extends Partial<CrearProductoDatos> {
  activo?: boolean;
}

/**
 * Lista todas las categorías para administración.
 */
export async function listarCategoriasAdmin() {
  await exigirSesionServidor('productos.gestionar');
  return prisma.categoria.findMany({
    orderBy: { orden: 'asc' },
    include: {
      _count: {
        select: { productos: true },
      },
    },
  });
}

/**
 * Crea una nueva categoría en el catálogo.
 */
export async function crearCategoria(datos: { nombre: string; orden?: number }) {
  const sesion = await exigirSesionServidor('productos.gestionar');
  const validado = CategoriaSchema.parse(datos);

  const categoria = await prisma.categoria.create({
    data: {
      nombre: validado.nombre,
      orden: validado.orden ?? 0,
    },
  });

  await registrarAuditoria({
    usuarioId: sesion.usuario.id,
    accion: 'categoria.crear',
    entidad: 'Categoria',
    entidadId: categoria.id,
    detalle: { nombre: categoria.nombre },
  });

  return categoria;
}

/**
 * Edita una categoría existente.
 */
export async function editarCategoria(
  id: string,
  datos: { nombre: string; orden?: number }
) {
  const sesion = await exigirSesionServidor('productos.gestionar');
  const validado = CategoriaSchema.parse(datos);

  const categoria = await prisma.categoria.update({
    where: { id },
    data: {
      nombre: validado.nombre,
      orden: validado.orden ?? 0,
    },
  });

  await registrarAuditoria({
    usuarioId: sesion.usuario.id,
    accion: 'categoria.editar',
    entidad: 'Categoria',
    entidadId: categoria.id,
    detalle: { nombre: categoria.nombre },
  });

  return categoria;
}

/**
 * Lista productos para el panel administrativo con filtros opcionales.
 */
export async function listarProductosAdmin(filtros?: {
  categoriaId?: string;
  incluirInactivos?: boolean;
}) {
  await exigirSesionServidor('productos.gestionar');

  const where: any = {};
  if (filtros?.categoriaId) {
    where.categoriaId = filtros.categoriaId;
  }
  if (!filtros?.incluirInactivos) {
    where.activo = true;
  }

  return prisma.producto.findMany({
    where,
    include: {
      categoria: true,
      _count: {
        select: {
          ventaItems: true,
          pedidoItems: true,
        },
      },
    },
    orderBy: [{ categoria: { orden: 'asc' } }, { orden: 'asc' }, { nombre: 'asc' }],
  });
}

/**
 * Crea un nuevo producto en el catálogo.
 */
export async function crearProducto(datos: CrearProductoDatos) {
  const sesion = await exigirSesionServidor('productos.gestionar');
  const validado = ProductoSchema.parse(datos);

  const producto = await prisma.producto.create({
    data: {
      nombre: validado.nombre,
      descripcion: validado.descripcion,
      categoriaId: validado.categoriaId,
      precioCentavos: validado.precioCentavos ?? null,
      imagenUrl: validado.imagenUrl,
      modeloArUrl: validado.modeloArUrl,
      modeloArIosUrl: validado.modeloArIosUrl,
      aptoMascotas: validado.aptoMascotas ?? false,
      orden: validado.orden ?? 0,
      activo: true,
    },
    include: { categoria: true },
  });

  await registrarAuditoria({
    usuarioId: sesion.usuario.id,
    accion: 'producto.crear',
    entidad: 'Producto',
    entidadId: producto.id,
    detalle: {
      nombre: producto.nombre,
      precioCentavos: producto.precioCentavos,
      categoria: producto.categoria.nombre,
    },
  });

  return producto;
}

/**
 * Edita un producto existente y audita cambios de precio (§5.6).
 */
export async function editarProducto(id: string, datos: EditarProductoDatos) {
  const sesion = await exigirSesionServidor('productos.gestionar');

  const productoActual = await prisma.producto.findUnique({
    where: { id },
  });

  if (!productoActual) {
    throw new Error('Producto no encontrado.');
  }

  const validado = ProductoSchema.partial().parse(datos);

  const productoActualizado = await prisma.producto.update({
    where: { id },
    data: {
      nombre: validado.nombre ?? undefined,
      descripcion: validado.descripcion,
      categoriaId: validado.categoriaId ?? undefined,
      precioCentavos: validado.precioCentavos,
      imagenUrl: validado.imagenUrl,
      modeloArUrl: validado.modeloArUrl,
      modeloArIosUrl: validado.modeloArIosUrl,
      aptoMascotas: validado.aptoMascotas ?? undefined,
      orden: validado.orden ?? undefined,
      activo: datos.activo !== undefined ? datos.activo : undefined,
    },
    include: { categoria: true },
  });

  const cambioPrecio = productoActual.precioCentavos !== productoActualizado.precioCentavos;

  await registrarAuditoria({
    usuarioId: sesion.usuario.id,
    accion: cambioPrecio ? 'producto.cambiar_precio' : 'producto.editar',
    entidad: 'Producto',
    entidadId: productoActualizado.id,
    detalle: {
      nombre: productoActualizado.nombre,
      precioAnteriorCentavos: productoActual.precioCentavos,
      precioNuevoCentavos: productoActualizado.precioCentavos,
    },
  });

  return productoActualizado;
}

/**
 * Archiva un producto (activo = false).
 * REGLA ESTRICTA ARQUITECTURA.md §5.6: Los productos NO se borran físicamente
 * para preservar la integridad del historial de ventas y pedidos.
 */
export async function archivarProducto(id: string) {
  const sesion = await exigirSesionServidor('productos.gestionar');

  const producto = await prisma.producto.update({
    where: { id },
    data: { activo: false },
  });

  await registrarAuditoria({
    usuarioId: sesion.usuario.id,
    accion: 'producto.archivar',
    entidad: 'Producto',
    entidadId: producto.id,
    detalle: { nombre: producto.nombre },
  });

  return producto;
}

/**
 * Restaura / reactiva un producto previamente archivado.
 */
export async function desarchivarProducto(id: string) {
  const sesion = await exigirSesionServidor('productos.gestionar');

  const producto = await prisma.producto.update({
    where: { id },
    data: { activo: true },
  });

  await registrarAuditoria({
    usuarioId: sesion.usuario.id,
    accion: 'producto.activar',
    entidad: 'Producto',
    entidadId: producto.id,
    detalle: { nombre: producto.nombre },
  });

  return producto;
}

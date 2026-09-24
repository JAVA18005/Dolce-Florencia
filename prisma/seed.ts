// prisma/seed.ts — Dolce Florencia
// Idempotente con upsert: 17 categorías, 65 productos, 8 mesas y 4 ajustes.

import { PrismaClient, ZonaMesa } from '@prisma/client';
import { menu } from './menu-data';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de Dolce Florencia...');

  // 1. Ajustes iniciales de negocio (ARQUITECTURA.md §10)
  const ajustes = [
    { clave: 'hora_apertura', valor: '15:00' },
    { clave: 'hora_cierre', valor: '22:00' },
    { clave: 'ultima_llegada', valor: '21:30' },
    { clave: 'tolerancia_llegada_min', valor: '30' },
  ];

  for (const ajuste of ajustes) {
    await prisma.ajuste.upsert({
      where: { clave: ajuste.clave },
      update: { valor: ajuste.valor },
      create: ajuste,
    });
  }
  console.log(`✅ ${ajustes.length} ajustes sincronizados.`);

  // 2. Mesas iniciales (ARQUITECTURA.md §10)
  const mesas = [
    { nombre: 'Mesa 1', zona: ZonaMesa.INTERIOR, capacidad: 3, reservable: true, permiteVariasCuentas: false, aceptaMascotas: true, orden: 1 },
    { nombre: 'Mesa 2', zona: ZonaMesa.INTERIOR, capacidad: 3, reservable: true, permiteVariasCuentas: false, aceptaMascotas: true, orden: 2 },
    { nombre: 'Mesa 3', zona: ZonaMesa.INTERIOR, capacidad: 3, reservable: true, permiteVariasCuentas: false, aceptaMascotas: true, orden: 3 },
    { nombre: 'Mesa 4', zona: ZonaMesa.INTERIOR, capacidad: 4, reservable: true, permiteVariasCuentas: false, aceptaMascotas: true, orden: 4 },
    { nombre: 'Terraza 1', zona: ZonaMesa.EXTERIOR, capacidad: 2, reservable: true, permiteVariasCuentas: false, aceptaMascotas: true, orden: 5 },
    { nombre: 'Terraza 2', zona: ZonaMesa.EXTERIOR, capacidad: 2, reservable: true, permiteVariasCuentas: false, aceptaMascotas: true, orden: 6 },
    { nombre: 'Sofá', zona: ZonaMesa.SOFA, capacidad: 5, reservable: true, permiteVariasCuentas: false, aceptaMascotas: true, orden: 7 },
    { nombre: 'Barra', zona: ZonaMesa.BARRA, capacidad: 3, reservable: false, permiteVariasCuentas: true, aceptaMascotas: true, orden: 8 },
  ];

  for (const m of mesas) {
    await prisma.mesa.upsert({
      where: { nombre: m.nombre },
      update: {
        zona: m.zona,
        capacidad: m.capacidad,
        reservable: m.reservable,
        permiteVariasCuentas: m.permiteVariasCuentas,
        aceptaMascotas: m.aceptaMascotas,
        orden: m.orden,
        habilitada: true,
      },
      create: m,
    });
  }
  console.log(`✅ ${mesas.length} mesas sincronizadas.`);

  // 3. Categorías y Productos del Menú Real (prisma/menu-data.ts)
  let totalProductos = 0;
  for (const cat of menu) {
    const categoria = await prisma.categoria.upsert({
      where: { nombre: cat.categoria },
      update: { orden: cat.orden },
      create: {
        nombre: cat.categoria,
        orden: cat.orden,
      },
    });

    for (const prod of cat.productos) {
      const aptoMascotas = prod.nombre.toLowerCase().includes('mascota');
      const productoExistente = await prisma.producto.findFirst({
        where: {
          nombre: prod.nombre,
          categoriaId: categoria.id,
        },
      });

      if (productoExistente) {
        await prisma.producto.update({
          where: { id: productoExistente.id },
          data: {
            descripcion: prod.descripcion,
            precioCentavos: prod.precioCentavos,
            orden: prod.orden,
            aptoMascotas,
            activo: true,
          },
        });
      } else {
        await prisma.producto.create({
          data: {
            nombre: prod.nombre,
            descripcion: prod.descripcion,
            precioCentavos: prod.precioCentavos,
            orden: prod.orden,
            aptoMascotas,
            categoriaId: categoria.id,
          },
        });
      }
      totalProductos++;
    }
  }

  console.log(`✅ ${menu.length} categorías y ${totalProductos} productos sincronizados.`);
  console.log('✨ Seed completado con éxito.');
}

main()
  .catch((e) => {
    console.error('Error durante seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

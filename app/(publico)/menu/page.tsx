import Link from 'next/link';
import prisma from '@/lib/db';
import FiltrosMenu from '@/components/publico/FiltrosMenu';

export const dynamic = 'force-dynamic';

export default async function MenuPage() {
  const [categorias, productos] = await Promise.all([
    prisma.categoria.findMany({
      orderBy: { orden: 'asc' },
    }),
    prisma.producto.findMany({
      where: { activo: true },
      include: {
        categoria: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
      orderBy: [{ categoria: { orden: 'asc' } }, { orden: 'asc' }],
    }),
  ]);

  return (
    <>
      <section className="page-intro wrap">
        <span className="eyebrow">La colección Florencia</span>
        <h1>
          Elige tu próximo
          <br />
          <em>momento favorito.</em>
        </h1>
        <p>
          Cafés de especialidad, matchas, paninis, croissants y repostería
          artesanal. Precios en Bolivianos; consultas y pedidos especiales vía
          WhatsApp.
        </p>
      </section>

      <section className="wrap catalog">
        <FiltrosMenu categorias={categorias} productos={productos} />
      </section>

      <section className="celebrate wrap">
        <div className="candy-ribbon" aria-hidden="true" />
        <span className="eyebrow">Tu ocasión. Nuestro toque dulce.</span>
        <h2>
          Lo bonito de celebrar
          <br />
          es <em>compartirlo.</em>
        </h2>
        <p>Cuéntanos qué imaginas. Le damos forma juntos.</p>
        <Link className="button olive" href="/pedidos">
          Preparar un pedido <span>↗</span>
        </Link>
        <span className="celebrate-flower" aria-hidden="true">
          ✳
        </span>
      </section>
    </>
  );
}

import Link from 'next/link';
import prisma from '@/lib/db';
import PastelInteractivo from '@/components/pastel/PastelInteractivo';
import CanvasCrema from '@/components/pastel/CanvasCrema';
import TransicionCrema from '@/components/pastel/TransicionCrema';
import SeccionRitual from '@/components/pastel/SeccionRitual';
import TarjetaProducto from '@/components/publico/TarjetaProducto';
import ClayReveal from '@/components/movimiento/ClayReveal';

export const dynamic = 'force-dynamic';

export default async function InicioPage() {
  // Leemos 3 productos destacados de la base de datos para el resumen de colección
  const productosDestacados = await prisma.producto.findMany({
    where: { activo: true },
    include: { categoria: true },
    orderBy: { orden: 'asc' },
    take: 3,
  });

  return (
    <>
      {/* ────────── Hero Section ────────── */}
      <section className="hero">
        <CanvasCrema alpha={0.78} />

        <div className="wrap hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="tiny-flower">✳</span> El lado dulce de la vida
            </span>
            <h1>
              Hay momentos
              <br />
              que merecen
              <br />
              <em>algo delicioso.</em>
            </h1>
            <p>
              Un antojo, un encuentro, una gran celebración.
              <br />
              Hacemos de lo cotidiano un recuerdo dulce.
            </p>
            <div className="actions">
              <Link href="/menu" className="button">
                Descubre la colección <span>↗</span>
              </Link>
              <Link href="/reservas" className="quiet-link">
                Tengo algo que celebrar ↗
              </Link>
            </div>
            <div className="hero-note">
              <span className="line" /> Hecho con calma. Compartido con amor.
            </div>
          </div>

          <div className="hero-visual-wrapper">
            <PastelInteractivo mostrarBotonDesarmar={true} />
          </div>
        </div>

        <div className="wrap hero-bottom">
          <span>PASTELERÍA & MOMENTOS BONITOS</span>
          <a href="#ritual">
            Desliza. Lo dulce está por venir <span>↓</span>
          </a>
          <span>01 — 04</span>
        </div>
      </section>

      {/* ────────── Transición de Glaseado ────────── */}
      <TransicionCrema />

      {/* ────────── El Ritual Florencia (Cálculo optimizado de scroll) ────────── */}
      <SeccionRitual />

      {/* ────────── Resumen de la Colección ────────── */}
      <section className="collection wrap">
        <ClayReveal className="section-heading">
          <div>
            <span className="eyebrow">02 / La colección</span>
            <h2>
              Amor al <em>primer bocado.</em>
            </h2>
          </div>
          <Link className="text-link" href="/menu">
            Ver toda la colección <span>↗</span>
          </Link>
        </ClayReveal>

        <div className="product-grid">
          {productosDestacados.map((prod) => (
            <TarjetaProducto key={prod.id} producto={prod} />
          ))}
        </div>
      </section>

      {/* ────────── Esencia Florencia ────────── */}
      <section className="essence wrap">
        <div className="atelier" aria-hidden="true">
          <div className="dessert-shape">
            <i />
            <b />
            <em />
          </div>
        </div>
        <ClayReveal className="essence-copy">
          <span className="eyebrow">03 / Nuestra esencia</span>
          <h2>
            Un nombre italiano.
            <br />
            Un corazón
            <br />
            <em>muy dulce.</em>
          </h2>
          <p>
            Creemos en las mesas que reúnen, en los detalles que sorprenden y en
            ese último pedacito que todos quieren compartir.
          </p>
          <Link className="text-link" href="/nosotros">
            Conoce nuestro universo <span>↗</span>
          </Link>
        </ClayReveal>
      </section>

      {/* ────────── Llamada a la Acción ────────── */}
      <section className="celebrate wrap">
        <div className="candy-ribbon" aria-hidden="true" />
        <ClayReveal className="eyebrow" as="span">
          Tu ocasión. Nuestro toque dulce.
        </ClayReveal>
        <ClayReveal as="h2">
          Lo bonito de celebrar
          <br />
          es <em>compartirlo.</em>
        </ClayReveal>
        <p>Cuéntanos qué imaginas. Le damos forma juntos.</p>
        <Link className="button olive" href="/reservas">
          Planeemos algo especial <span>↗</span>
        </Link>
        <span className="celebrate-flower" aria-hidden="true">
          ✳
        </span>
      </section>
    </>
  );
}

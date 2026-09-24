import Link from 'next/link';
import CanvasCrema from '@/components/pastel/CanvasCrema';
import ClayReveal from '@/components/movimiento/ClayReveal';

export default function NosotrosPage() {
  return (
    <>
      <section className="about-hero wrap">
        <CanvasCrema alpha={0.55} />
        <span className="eyebrow">El universo Dolce Florencia</span>
        <h1>
          La vida sabe mejor
          <br />
          cuando se <em>comparte.</em>
        </h1>
        <p>
          Más que un postre o un café, un espacio cálido pensado para celebrar,
          disfrutar con calma y compartir momentos dulces.
        </p>
      </section>

      <section className="essence wrap">
        <div className="atelier" aria-hidden="true">
          <div className="dessert-shape">
            <i />
            <b />
            <em />
          </div>
        </div>
        <ClayReveal className="essence-copy">
          <span className="eyebrow">Nuestra esencia</span>
          <h2>
            Pequeños detalles.
            <br />
            <em>Recuerdos enormes.</em>
          </h2>
          <p>
            Dolce Florencia nace de una idea sencilla: darle un lugar especial a
            los momentos dulces. Los que se planean durante meses y los que
            aparecen una tarde cualquiera con un buen café.
          </p>
          <p>
            Con la calidez de la piedra y la vegetación de nuestro local, un
            ambiente amigable para tus mascotas y una pastelería hecha con cariño,
            cada visita es una invitación a desconectar.
          </p>
        </ClayReveal>
      </section>

      <section className="values">
        <CanvasCrema alpha={0.78} />
        <div className="wrap">
          <span className="eyebrow">Lo que nos mueve</span>
          <h2>
            El ingrediente que une todo:
            <br />
            <em>hacerlo con cariño.</em>
          </h2>
          <div className="value-grid">
            <ClayReveal as="article">
              <span>01 / ✳</span>
              <h3>El detalle</h3>
              <p>
                Lo pequeño también importa. Una textura suave, un acabado delicado
                y una presentación que te hace sonreír desde el primer vistazo.
              </p>
            </ClayReveal>

            <ClayReveal as="article">
              <span>02 / ♡</span>
              <h3>La cercanía</h3>
              <p>
                Detrás de cada mesa y de cada pedido hay una historia. Queremos
                escuchar la tuya y recibirte a ti y a tu mascota como en casa.
              </p>
            </ClayReveal>

            <ClayReveal as="article">
              <span>03 / ✧</span>
              <h3>La imaginación</h3>
              <p>
                Cada celebración abre una posibilidad. Postres artesanales,
                tortas personalizadas y momentos pensados para recordar.
              </p>
            </ClayReveal>
          </div>
        </div>
      </section>

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

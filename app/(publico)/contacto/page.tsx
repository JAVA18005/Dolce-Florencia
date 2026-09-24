import { generarEnlaceWhatsApp } from '@/lib/whatsapp';

export default function ContactoPage() {
  const enlaceWhatsApp = generarEnlaceWhatsApp(
    '¡Hola Dolce Florencia! Me gustaría hacer una consulta.'
  );

  return (
    <>
      <section className="page-intro wrap">
        <span className="eyebrow">Estamos para escucharte</span>
        <h1>
          Las buenas historias
          <br />
          empiezan con un <em>hola.</em>
        </h1>
        <p>
          Visítanos para disfrutar de un buen café o escríbenos directamente a
          nuestro WhatsApp para coordinar pedidos y consultas.
        </p>
      </section>

      <section className="wrap contact-layout">
        <div className="contact-card">
          <span className="eyebrow">Información del local</span>
          <h2>Ven a visitarnos</h2>

          <div className="contact-item">
            <strong>Dirección</strong>
            <p>Edificio Lar de Rosa, barrio Luis de Fuentes, zona Senac</p>
          </div>

          <div className="contact-item">
            <strong>Horario de atención</strong>
            <p>Lunes a domingo, de 15:00 a 22:00</p>
            <p style={{ fontSize: '13px', color: 'var(--cafe-suave)', marginTop: '4px' }}>
              (Última llegada para reservas: 21:30)
            </p>
          </div>

          <div className="contact-item">
            <strong>Cafetería Pet Friendly</strong>
            <p>Tu mascota siempre es bienvenida en todas nuestras mesas y terraza.</p>
          </div>

          <div style={{ marginTop: '36px' }}>
            <a
              href={enlaceWhatsApp}
              target="_blank"
              rel="noopener noreferrer"
              className="button"
              style={{ width: '100%' }}
            >
              Escribir por WhatsApp <span>↗</span>
            </a>
          </div>
        </div>

        <div className="map-container">
          <iframe
            title="Ubicación de Dolce Florencia"
            src="https://maps.google.com/maps?q=-21.5417,-64.7415&hl=es&z=16&output=embed"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>
    </>
  );
}

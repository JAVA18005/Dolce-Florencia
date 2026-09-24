import { generarEnlaceWhatsApp } from '@/lib/whatsapp';

export default function EventosPage() {
  const enlaceWhatsApp = generarEnlaceWhatsApp(
    '¡Hola Dolce Florencia! Me gustaría consultar sobre la organización de un evento o celebración especial.'
  );

  return (
    <section className="wrap" style={{ paddingBlock: '80px' }}>
      <div className="proximamente-card">
        <span className="eyebrow">Celebraciones y eventos</span>
        <h2>Momentos para recordar</h2>
        <p>
          Cumpleaños, aniversarios y reuniones en nuestro local o con entrega de
          repostería. Coordinamos todos los detalles, temáticas y porciones
          directamente contigo.
        </p>
        <a
          href={enlaceWhatsApp}
          target="_blank"
          rel="noopener noreferrer"
          className="button"
        >
          Conversar sobre mi evento <span>↗</span>
        </a>
      </div>
    </section>
  );
}

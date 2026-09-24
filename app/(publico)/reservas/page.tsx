import { generarEnlaceWhatsApp } from '@/lib/whatsapp';

export default function ReservasPage() {
  const enlaceWhatsApp = generarEnlaceWhatsApp(
    '¡Hola Dolce Florencia! Me gustaría consultar disponibilidad para reservar una mesa.'
  );

  return (
    <section className="wrap" style={{ paddingBlock: '80px' }}>
      <div className="proximamente-card">
        <span className="eyebrow">Reservas de mesa</span>
        <h2>Tu mesa te espera</h2>
        <p>
          El sistema automático de reservas de mesa (interior, exterior y sofá)
          estará listo en la siguiente fase. Puedes reservar tu lugar y avisarnos
          si vienes con tu mascota escribiéndonos por WhatsApp.
        </p>
        <a
          href={enlaceWhatsApp}
          target="_blank"
          rel="noopener noreferrer"
          className="button"
        >
          Consultar reserva por WhatsApp <span>↗</span>
        </a>
      </div>
    </section>
  );
}

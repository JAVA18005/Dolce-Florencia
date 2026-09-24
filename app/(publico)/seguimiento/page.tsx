import { generarEnlaceWhatsApp } from '@/lib/whatsapp';

export default function SeguimientoPage() {
  const enlaceWhatsApp = generarEnlaceWhatsApp(
    '¡Hola Dolce Florencia! Me gustaría consultar el estado de mi pedido.'
  );

  return (
    <section className="wrap" style={{ paddingBlock: '80px' }}>
      <div className="proximamente-card">
        <span className="eyebrow">Estado de pedidos</span>
        <h2>Tu pedido, en conversación</h2>
        <p>
          El seguimiento por código y teléfono se activará en la Fase 2 junto con
          el panel de pedidos. Si ya realizaste una solicitud y deseas saber cómo
          va tu entrega o retiro, consúltanos directamente por WhatsApp.
        </p>
        <a
          href={enlaceWhatsApp}
          target="_blank"
          rel="noopener noreferrer"
          className="button"
        >
          Consultar estado por WhatsApp <span>↗</span>
        </a>
      </div>
    </section>
  );
}

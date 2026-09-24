import { generarEnlaceWhatsApp } from '@/lib/whatsapp';

export default function PedidosPage() {
  const enlaceWhatsApp = generarEnlaceWhatsApp(
    '¡Hola Dolce Florencia! Me gustaría coordinar un pedido.'
  );

  return (
    <section className="wrap" style={{ paddingBlock: '80px' }}>
      <div className="proximamente-card">
        <span className="eyebrow">Pedidos personalizados</span>
        <h2>Hagamos algo delicioso</h2>
        <p>
          El formulario interactivo de pedidos web estará disponible muy pronto.
          Mientras tanto, estamos tomando y cotizando todos los pedidos, tortas
          personalizadas y entregas directamente por WhatsApp.
        </p>
        <a
          href={enlaceWhatsApp}
          target="_blank"
          rel="noopener noreferrer"
          className="button"
        >
          Hacer pedido por WhatsApp <span>↗</span>
        </a>
      </div>
    </section>
  );
}

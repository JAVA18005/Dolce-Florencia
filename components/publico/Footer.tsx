'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMovimiento } from '@/components/movimiento/MovimientoContext';
import { useModoCamara } from '@/components/ar/ModoCamaraContext';

export default function Footer() {
  const { pausado, sistemaReducido, efectivoPausado, alternarPausa } = useMovimiento();
  const { modoCamara, alternarModoCamara } = useModoCamara();

  const textoBoton = sistemaReducido
    ? 'Movimiento reducido del sistema'
    : pausado
    ? 'Activar movimiento'
    : 'Pausar movimiento';

  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div>
          <Link href="/" className="brand">
            <div className="brand-seal" aria-hidden="true">
              <Image
                src="/brand/logo-pasteleria.png"
                alt="Dolce Florencia"
                width={48}
                height={48}
              />
            </div>
            <span>
              Dolce Florencia
              <small>PASTELERÍA ARTESANAL</small>
            </span>
          </Link>
          <p>
            Hay momentos que merecen
            <br />
            un recuerdo dulce.
          </p>
        </div>

        <div>
          <span className="eyebrow">Ven por algo bonito</span>
          <Link href="/menu">Nuestra colección</Link>
          <Link href="/nosotros">El universo Florencia</Link>
          <Link href="/reservas">Reservar mesa</Link>
          <Link href="/eventos">Celebraciones especiales</Link>
        </div>

        <div>
          <span className="eyebrow">Sigamos conversando</span>
          <Link href="/contacto">Contacto y ubicación</Link>
          <Link href="/seguimiento">Consultar mi pedido</Link>
          <Link href="/pedidos">Hacer un pedido ↗</Link>
        </div>
      </div>

      <div className="wrap footer-bottom">
        <span>© {new Date().getFullYear()} Dolce Florencia</span>
        <span>Hecho para celebrar. Hecho para recordar.</span>
        <Link
          href="/panel/login"
          style={{ fontSize: '12px', color: 'inherit', opacity: 0.65, textDecoration: 'none' }}
        >
          Acceso personal
        </Link>
        <button
          type="button"
          aria-pressed={modoCamara}
          onClick={alternarModoCamara}
          style={{
            fontSize: '12px',
            color: 'inherit',
            fontFamily: 'inherit',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            opacity: 0.65,
          }}
        >
          {modoCamara ? 'Desactivar modo cámara' : 'Activar modo cámara'}
        </button>
        <button
          className="motion-toggle"
          type="button"
          disabled={sistemaReducido}
          aria-pressed={efectivoPausado}
          onClick={alternarPausa}
        >
          {textoBoton}
        </button>
      </div>
    </footer>
  );
}

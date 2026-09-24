'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export default function Header() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const pathname = usePathname();

  const enlaces = [
    { href: '/', etiqueta: 'Inicio' },
    { href: '/menu', etiqueta: 'La colección' },
    { href: '/nosotros', etiqueta: 'Nuestra esencia' },
    { href: '/contacto', etiqueta: 'Contacto' },
  ];

  return (
    <>
      <a className="skip" href="#contenido">
        Saltar al contenido
      </a>
      <header className="site-header">
        <div className="wrap nav-wrap">
          <Link href="/" className="brand" aria-label="Dolce Florencia, inicio">
            <div className="brand-seal" aria-hidden="true">
              <Image
                src="/brand/logo-pasteleria.png"
                alt="Dolce Florencia"
                width={48}
                height={48}
                priority
              />
            </div>
            <span>
              Dolce Florencia
              <small>PASTELERÍA ARTESANAL</small>
            </span>
          </Link>

          <button
            className="nav-toggle"
            aria-expanded={menuAbierto}
            aria-controls="navigation"
            onClick={() => setMenuAbierto(!menuAbierto)}
          >
            Menú <span>{menuAbierto ? '✕' : '☰'}</span>
          </button>

          <nav
            id="navigation"
            aria-label="Navegación principal"
            className={menuAbierto ? 'is-open' : ''}
          >
            {enlaces.map((e) => (
              <Link
                key={e.href}
                href={e.href}
                aria-current={pathname === e.href ? 'page' : undefined}
                onClick={() => setMenuAbierto(false)}
              >
                {e.etiqueta}
              </Link>
            ))}
            <Link
              className="nav-order"
              href="/pedidos"
              onClick={() => setMenuAbierto(false)}
            >
              Hagamos tu pedido <span>↗</span>
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
}

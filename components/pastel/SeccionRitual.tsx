'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import PastelInteractivo from './PastelInteractivo';
import { useMovimiento } from '@/components/movimiento/MovimientoContext';

export default function SeccionRitual() {
  const ritualRef = useRef<HTMLElement>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const { efectivoPausado } = useMovimiento();

  useEffect(() => {
    if (efectivoPausado) {
      artRef.current?.style.setProperty('--progress', '1');
      return;
    }

    let ticking = false;

    const updateScroll = () => {
      ticking = false;
      if (!ritualRef.current || !artRef.current) return;
      const rect = ritualRef.current.getBoundingClientRect();

      // No calcular si está fuera del viewport
      if (rect.top > window.innerHeight || rect.bottom < 0) return;

      const progress = Math.min(
        1,
        Math.max(0, (150 - rect.top) / Math.max(1, rect.height - window.innerHeight))
      );

      artRef.current.style.setProperty('--progress', progress.toFixed(4));
    };

    const scheduleScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateScroll);
      }
    };

    window.addEventListener('scroll', scheduleScroll, { passive: true });
    window.addEventListener('resize', scheduleScroll, { passive: true });
    scheduleScroll();

    return () => {
      window.removeEventListener('scroll', scheduleScroll);
      window.removeEventListener('resize', scheduleScroll);
    };
  }, [efectivoPausado]);

  return (
    <section id="ritual" className="ritual" ref={ritualRef}>
      <div className="wrap ritual-grid">
        <div className="ritual-sticky">
          <span className="eyebrow">01 / El ritual Florencia</span>
          <h2>
            La felicidad,
            <br />
            <em>capa a capa.</em>
          </h2>
          <p>
            Las cosas bonitas llevan su tiempo.
            <br />
            Desliza y descubre nuestro toque final.
          </p>
          <div className="ritual-art" ref={artRef}>
            <PastelInteractivo mini={true} />
            <div className="morph-shape" />
          </div>
        </div>

        <div className="ritual-steps">
          <article data-stage="0">
            <span className="step-number">01</span>
            <h3>
              Todo empieza
              <br />
              con una buena base.
            </h3>
            <p>Ese primer bocado suave que invita a quedarse un rato más.</p>
          </article>

          <article data-stage="1">
            <span className="step-number">02</span>
            <h3>
              Lo especial
              <br />
              está en el interior.
            </h3>
            <p>
              Texturas que se encuentran. Capas que hacen de cada porción un
              pequeño ritual.
            </p>
          </article>

          <article data-stage="2">
            <span className="step-number">03</span>
            <h3>
              Y termina con
              <br />
              un toque de magia.
            </h3>
            <p>
              Un detalle, un color, una dedicatoria. Ahora sí: está listo para tu
              momento.
            </p>
            <Link className="text-link" href="/pedidos">
              Imaginemos el tuyo <span>↗</span>
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}

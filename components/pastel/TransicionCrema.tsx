'use client';

import { useEffect, useRef } from 'react';
import { useMovimiento } from '@/components/movimiento/MovimientoContext';

export default function TransicionCrema() {
  const transitionRef = useRef<HTMLDivElement>(null);
  const { efectivoPausado } = useMovimiento();

  useEffect(() => {
    const el = transitionRef.current;
    if (!el) return;

    if (efectivoPausado) {
      el.style.setProperty('--drip', '1');
      return;
    }

    let scrollFrame = 0;

    const onScroll = () => {
      if (efectivoPausado || scrollFrame) return;

      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          const dripValue = 0.6 + Math.min(1, Math.max(0, 1 - rect.top / window.innerHeight)) * 0.65;
          el.style.setProperty('--drip', dripValue.toFixed(4));
        }
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (scrollFrame) cancelAnimationFrame(scrollFrame);
    };
  }, [efectivoPausado]);

  return (
    <div className="cream-transition" ref={transitionRef} aria-hidden="true">
      <div className="cream-lip" />
      <i />
      <i />
      <i />
      <i />
      <i />
      <i />
      <i />
      <span>Una pizca de magia en cada detalle</span>
    </div>
  );
}

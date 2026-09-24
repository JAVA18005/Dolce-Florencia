'use client';

import React, { useEffect, useRef } from 'react';
import { useMovimiento } from '@/components/movimiento/MovimientoContext';

interface ClayRevealProps {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
  style?: React.CSSProperties;
}

export default function ClayReveal({
  children,
  className = '',
  as: Component = 'div',
  style,
  ...props
}: ClayRevealProps & React.HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement>(null);
  const { efectivoPausado } = useMovimiento();

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return;

    if (efectivoPausado) {
      el.classList.remove('is-waiting');
      return;
    }

    if (!('IntersectionObserver' in window)) return;

    // Solo se ocultan bloques si están debajo del viewport al momento de montar
    if (el.getBoundingClientRect().top > window.innerHeight) {
      el.classList.add('clay-reveal', 'is-waiting');

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              el.classList.remove('is-waiting');
              observer.unobserve(el);
            }
          });
        },
        { threshold: 0.08 }
      );

      observer.observe(el);

      return () => {
        observer.disconnect();
      };
    }
  }, [efectivoPausado]);

  return (
    <Component ref={ref} className={className} style={style} {...props}>
      {children}
    </Component>
  );
}

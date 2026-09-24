'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { formatearCentavosABs } from '@/lib/dinero';
import { useMovimiento } from '@/components/movimiento/MovimientoContext';

export interface ProductoDTO {
  id: string;
  nombre: string;
  descripcion: string | null;
  precioCentavos: number | null;
  categoriaId: string;
  categoria?: {
    id: string;
    nombre: string;
  };
  orden: number;
  aptoMascotas: boolean;
}

export default function TarjetaProducto({ producto }: { producto: ProductoDTO }) {
  const cardRef = useRef<HTMLElement>(null);
  const frameRef = useRef<number>(0);
  const { efectivoPausado } = useMovimiento();

  const resetTilt = () => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
    if (cardRef.current) {
      cardRef.current.style.removeProperty('--tilt-x');
      cardRef.current.style.removeProperty('--tilt-y');
    }
  };

  useEffect(() => {
    if (efectivoPausado) {
      resetTilt();
    }
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [efectivoPausado]);

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (efectivoPausado || typeof window === 'undefined') return;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!finePointer || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    if (!frameRef.current) {
      frameRef.current = requestAnimationFrame(() => {
        if (cardRef.current) {
          cardRef.current.style.setProperty('--tilt-x', `${-y * 6}deg`);
          cardRef.current.style.setProperty('--tilt-y', `${x * 7}deg`);
        }
        frameRef.current = 0;
      });
    }
  };

  const precioTexto = formatearCentavosABs(producto.precioCentavos);
  const nombreCategoria = producto.categoria?.nombre || 'Especialidad';

  return (
    <article
      ref={cardRef}
      className="product-card"
      data-category={nombreCategoria}
      onPointerMove={onPointerMove}
      onPointerLeave={resetTilt}
    >
      <div
        className="photo-frame"
        role="img"
        aria-label={`Ilustración de ${producto.nombre}`}
      >
        <span className="frame-corner">DF / ATELIER</span>
        <div className="dessert-shape" aria-hidden="true">
          <i />
          <b />
          <em />
        </div>
        <span className="frame-caption">{producto.nombre}</span>
        <span className="frame-star" aria-hidden="true">
          ✳
        </span>
      </div>

      <div className="product-meta">
        <span>{nombreCategoria}</span>
        <span className="product-price">{precioTexto}</span>
      </div>

      <h3>{producto.nombre}</h3>
      <p>{producto.descripcion || 'Elaborado artesanalmente con ingredientes seleccionados.'}</p>

      <Link
        className="text-link"
        href={`/pedidos?producto=${encodeURIComponent(producto.nombre)}`}
      >
        Pedir o consultar <span>↗</span>
      </Link>
    </article>
  );
}

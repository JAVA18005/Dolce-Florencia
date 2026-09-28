'use client';

import { useEffect, useRef, useState } from 'react';

interface ModalProps {
  abierto: boolean;
  codigo: string;
  enlaceWhatsApp?: string;
  onCerrar: () => void;
  tipo?: 'pedido' | 'reserva' | 'evento' | string;
  tipoTitulo?: string;
}

const SELECCION_ENFOCABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function ModalSolicitudExitosa({
  abierto,
  codigo,
  enlaceWhatsApp,
  onCerrar,
  tipo = 'pedido',
  tipoTitulo,
}: ModalProps) {
  const [copiado, setCopiado] = useState(false);
  const tarjetaRef = useRef<HTMLDivElement>(null);
  const focoPrevioRef = useRef<HTMLElement | null>(null);

  const tituloFinal =
    tipoTitulo ||
    (tipo === 'reserva'
      ? '¡Solicitud de reserva recibida!'
      : tipo === 'evento'
      ? '¡Propuesta de evento recibida!'
      : '¡Solicitud recibida!');

  useEffect(() => {
    if (!abierto) return;

    focoPrevioRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const contenedor = tarjetaRef.current;
    const primerEnfocable = contenedor?.querySelector(SELECCION_ENFOCABLE) as HTMLElement | null;
    primerEnfocable?.focus();

    const manejarTeclado = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCerrar();
        return;
      }
      if (e.key !== 'Tab') return;
      if (!contenedor) return;

      const enfocables = Array.from(
        contenedor.querySelectorAll<HTMLElement>(SELECCION_ENFOCABLE)
      ).filter((el) => el.offsetParent !== null);
      if (enfocables.length === 0) return;

      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      const activo = document.activeElement;

      if (e.shiftKey) {
        if (activo === primero || !contenedor.contains(activo)) {
          e.preventDefault();
          ultimo.focus();
        }
      } else if (activo === ultimo || !contenedor.contains(activo)) {
        e.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener('keydown', manejarTeclado);

    return () => {
      document.removeEventListener('keydown', manejarTeclado);
      document.body.style.overflow = overflowAnterior;
      focoPrevioRef.current?.focus();
      focoPrevioRef.current = null;
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  const copiarCodigo = async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Ignorar error de portapapeles
    }
  };

  return (
    <div className="modal-solicitud-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
      <div ref={tarjetaRef} className="modal-solicitud-tarjeta">
        <button
          onClick={onCerrar}
          aria-label="Cerrar ventana"
          className="modal-solicitud-cerrar"
        >
          ✕
        </button>

        <span className="eyebrow modal-solicitud-eyebrow">Un paso más hacia algo dulce</span>
        <h2 id="modal-titulo" className="modal-solicitud-titulo">
          {tituloFinal}
        </h2>

        <p className="modal-solicitud-parrafo">
          Hemos registrado tu solicitud en nuestro sistema. Para coordinar disponibilidad,
          precios y confirmar tu pedido, por favor envía el mensaje preparado en WhatsApp.
        </p>

        <div className="modal-codigo-modulo">
          <div className="modal-codigo-info">
            <span className="modal-codigo-etiqueta-modal">Código de seguimiento</span>
            <strong className="modal-codigo-valor-modal">{codigo}</strong>
          </div>

          <button type="button" onClick={copiarCodigo} className="modal-codigo-copiar">
            {copiado ? '✓ Copiado' : 'Copiar'}
          </button>
        </div>

        <p className="modal-solicitud-aviso">
          ℹ️ Guarda este código y los últimos 4 dígitos de tu teléfono para consultar el estado
          en la sección de seguimiento.
        </p>

        <div className="modal-solicitud-pie">
          {enlaceWhatsApp && (
            <a
              href={enlaceWhatsApp}
              target="_blank"
              rel="noopener noreferrer"
              className="button"
            >
              Abrir WhatsApp para enviar solicitud <span>↗</span>
            </a>
          )}

          <button type="button" onClick={onCerrar} className="modal-solicitud-cerrar-texto">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
'use client';

import { useState } from 'react';

interface ModalProps {
  abierto: boolean;
  codigo: string;
  enlaceWhatsApp?: string;
  onCerrar: () => void;
  tipo?: 'pedido' | 'reserva' | 'evento' | string;
  tipoTitulo?: string;
}

export default function ModalSolicitudExitosa({
  abierto,
  codigo,
  enlaceWhatsApp,
  onCerrar,
  tipo = 'pedido',
  tipoTitulo,
}: ModalProps) {
  const [copiado, setCopiado] = useState(false);

  const tituloFinal =
    tipoTitulo ||
    (tipo === 'reserva'
      ? '¡Reserva Solicitada!'
      : tipo === 'evento'
      ? '¡Propuesta de Evento Registrada!'
      : '¡Pedido Registrado!');

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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-titulo"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(43, 35, 32, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: 'var(--hueso)',
          borderRadius: '28px',
          border: '1px solid var(--linea)',
          maxWidth: '540px',
          width: '100%',
          padding: '36px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
          position: 'relative',
        }}
      >
        <button
          onClick={onCerrar}
          aria-label="Cerrar ventana"
          style={{
            position: 'absolute',
            top: '20px',
            right: '24px',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: 'var(--cafe)',
          }}
        >
          ✕
        </button>

        <span className="eyebrow" style={{ marginBottom: '12px' }}>
          Un paso más hacia algo dulce
        </span>
        <h2 id="modal-titulo" style={{ fontSize: '36px', marginBottom: '14px' }}>
          {tituloFinal}
        </h2>

        <p style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--cafe-suave)' }}>
          Hemos registrado tu solicitud en nuestro sistema. Para coordinar disponibilidad,
          precios y confirmar tu pedido, por favor envía el mensaje preparado en WhatsApp.
        </p>

        {/* Tarjeta de Código */}
        <div
          style={{
            background: 'var(--rosa)',
            borderRadius: '16px',
            padding: '18px 24px',
            marginBlock: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px dashed var(--fucsia)',
          }}
        >
          <div>
            <span
              style={{
                display: 'block',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '.14em',
                color: 'var(--cafe-suave)',
              }}
            >
              Código de seguimiento
            </span>
            <strong
              style={{
                fontFamily: 'monospace',
                fontSize: '26px',
                color: 'var(--fucsia-accion)',
                letterSpacing: '.05em',
              }}
            >
              {codigo}
            </strong>
          </div>

          <button
            type="button"
            onClick={copiarCodigo}
            style={{
              background: 'var(--hueso)',
              border: '1px solid var(--linea)',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {copiado ? '✓ Copiado' : 'Copiar'}
          </button>
        </div>

        <p
          style={{
            fontSize: '12px',
            color: 'var(--cafe-suave)',
            marginBottom: '26px',
            background: 'rgba(107, 122, 94, 0.08)',
            padding: '12px 16px',
            borderRadius: '10px',
          }}
        >
          ℹ️ Guarda este código y los últimos 4 dígitos de tu teléfono para consultar el estado
          en la sección de seguimiento.
        </p>

        {enlaceWhatsApp && (
          <a
            href={enlaceWhatsApp}
            target="_blank"
            rel="noopener noreferrer"
            className="button"
            style={{ width: '100%', marginBottom: '10px' }}
          >
            Abrir WhatsApp para enviar solicitud <span>↗</span>
          </a>
        )}

        <button
          type="button"
          onClick={onCerrar}
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            padding: '12px',
            fontSize: '13px',
            color: 'var(--cafe-suave)',
            textDecoration: 'underline',
            cursor: 'pointer',
          }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

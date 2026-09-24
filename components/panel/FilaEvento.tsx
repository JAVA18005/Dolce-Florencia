'use client';

import { useState } from 'react';
import { confirmarEventoAction, cancelarEventoAction } from '@/app/(panel)/panel/eventos/acciones';
import { generarEnlaceWhatsApp } from '@/lib/whatsapp';

interface Props {
  evento: any;
  capacidadTotalLocal: number;
}

export default function FilaEvento({ evento, capacidadTotalLocal }: Props) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const fechaStr = new Date(evento.fecha).toISOString().split('T')[0];
  const esEnLocal = evento.modalidad === 'EN_LOCAL';
  const personas = evento.personas || 0;
  const cerrariaLocal = esEnLocal && personas >= capacidadTotalLocal;

  const mensajeWhatsApp = `Hola ${evento.clienteNombre}, te saludamos de Dolce Florencia respecto a tu solicitud de evento #${evento.codigo} para el día ${fechaStr}.`;
  const linkWhatsApp = generarEnlaceWhatsApp(mensajeWhatsApp, evento.clienteTelefono);

  const handleConfirmar = async () => {
    let confirmMsg = `¿Confirmar evento #${evento.codigo} (${evento.clienteNombre})?`;
    if (cerrariaLocal) {
      confirmMsg += `\n⚠️ ATENCIÓN: Este evento tiene ${personas} personas (>= capacidad total ${capacidadTotalLocal}). Al confirmarlo se cerrará el local al público y se bloqueará el día en el calendario.`;
    }

    if (!confirm(confirmMsg)) return;

    setCargando(true);
    setError(null);
    setMensajeExito(null);
    try {
      const res = await confirmarEventoAction(evento.id);
      if (res.error) {
        setError(res.error);
      } else if (res.mensaje) {
        setMensajeExito(res.mensaje);
      }
    } catch (e: any) {
      setError(e.message || 'Error inesperado');
    } finally {
      setCargando(false);
    }
  };

  const handleCancelar = async () => {
    if (!confirm(`¿Estás seguro de cancelar el evento #${evento.codigo}? Si creó un bloqueo en el calendario, se liberará.`)) return;

    setCargando(true);
    setError(null);
    setMensajeExito(null);
    try {
      const res = await cancelarEventoAction(evento.id);
      if (res.error) setError(res.error);
    } catch (e: any) {
      setError(e.message || 'Error al cancelar');
    } finally {
      setCargando(false);
    }
  };

  return (
    <tr>
      <td>
        <span style={{ fontWeight: 700, color: 'var(--cafe-deep)', display: 'block' }}>
          {evento.codigo}
        </span>
        <span style={{ fontSize: '13px', color: 'var(--cafe)' }}>{evento.clienteNombre}</span>
        <span style={{ fontSize: '12px', color: 'var(--cafe-suave)', display: 'block' }}>
          📞 {evento.clienteTelefono}
        </span>
        {error && <span style={{ color: '#c92a2a', fontSize: '11px', display: 'block' }}>⚠️ {error}</span>}
        {mensajeExito && <span style={{ color: '#2b8a3e', fontSize: '11px', display: 'block' }}>✅ {mensajeExito}</span>}
      </td>

      <td>
        <span style={{ fontWeight: 600, display: 'block' }}>{fechaStr}</span>
        <span style={{ fontSize: '12px', color: 'var(--cafe-suave)' }}>
          Hora: {evento.hora || 'Flexible'}
        </span>
        <span style={{ display: 'block', fontSize: '12px', color: 'var(--cafe-deep)' }}>
          {personas} personas {evento.ocasion ? `· ${evento.ocasion}` : ''}
        </span>
      </td>

      <td>
        <span
          style={{
            display: 'inline-block',
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '10px',
            background: esEnLocal ? '#f8f0fc' : '#e7f5ff',
            color: esEnLocal ? '#ae3ec9' : '#1971c2',
            marginBottom: '4px',
          }}
        >
          {esEnLocal ? '🏛️ En Local' : '📦 Entrega'}
        </span>

        {cerrariaLocal && (
          <span
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 700,
              color: '#d9480f',
            }}
          >
            🔒 Cierra local (≥ {capacidadTotalLocal} personas)
          </span>
        )}
        {evento.diaBloqueado && (
          <span style={{ display: 'block', fontSize: '10px', color: '#2b8a3e', fontWeight: 600 }}>
            ✓ Día bloqueado en calendario
          </span>
        )}
      </td>

      <td>
        <span className={`badge-estado ${evento.estado.toLowerCase()}`}>
          {evento.estado}
        </span>
      </td>

      <td>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <a
            href={linkWhatsApp}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp-sm"
            title="Abrir chat en WhatsApp"
          >
            💬 WhatsApp
          </a>

          {evento.estado === 'PENDIENTE' && (
            <button
              type="button"
              onClick={handleConfirmar}
              disabled={cargando}
              className="btn-accion-sm btn-exito"
            >
              {cargando ? '...' : 'Confirmar'}
            </button>
          )}

          {evento.estado === 'CONFIRMADA' && (
            <button
              type="button"
              onClick={handleCancelar}
              disabled={cargando}
              className="btn-accion-sm btn-peligro"
            >
              {cargando ? '...' : 'Cancelar Evento'}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

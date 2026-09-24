'use client';

import { useState } from 'react';
import { desbloquearDiaManualAction } from '@/app/(panel)/panel/calendario/acciones';

interface Props {
  bloqueo: any;
  puedeDesbloquear: boolean;
}

export default function FilaDiaBloqueado({ bloqueo, puedeDesbloquear }: Props) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fechaStr = new Date(bloqueo.fecha).toISOString().split('T')[0];
  const esPorEvento = !!bloqueo.reservaId;

  const handleDesbloquear = async () => {
    if (!confirm(`¿Desbloquear la fecha ${fechaStr}? El público podrá volver a solicitar reservas para este día.`)) {
      return;
    }

    setCargando(true);
    setError(null);
    try {
      const res = await desbloquearDiaManualAction(fechaStr);
      if (res?.error) setError(res.error);
    } catch (e: any) {
      setError(e.message || 'Error al desbloquear');
    } finally {
      setCargando(false);
    }
  };

  return (
    <tr>
      <td>
        <strong style={{ color: 'var(--cafe-deep)', fontSize: '15px' }}>{fechaStr}</strong>
        {error && <span style={{ color: '#c92a2a', fontSize: '11px', display: 'block' }}>⚠️ {error}</span>}
      </td>

      <td>
        <span>{bloqueo.motivo}</span>
      </td>

      <td>
        <span
          style={{
            display: 'inline-block',
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '6px',
            fontWeight: 600,
            background: esPorEvento ? '#f8f0fc' : '#fff3bf',
            color: esPorEvento ? '#ae3ec9' : '#d9480f',
          }}
        >
          {esPorEvento ? `Evento #${bloqueo.reserva?.codigo || ''}` : 'Bloqueo Manual Admin'}
        </span>
      </td>

      <td>
        <span style={{ fontSize: '12px', color: 'var(--cafe-suave)' }}>
          {bloqueo.creadoPor?.nombre || 'Sistema'}
        </span>
      </td>

      <td>
        {esPorEvento ? (
          <span style={{ fontSize: '11px', color: 'var(--cafe-suave)' }}>
            Vía Módulo Eventos
          </span>
        ) : puedeDesbloquear ? (
          <button
            type="button"
            onClick={handleDesbloquear}
            disabled={cargando}
            className="btn-accion-sm btn-peligro"
          >
            {cargando ? '...' : 'Desbloquear'}
          </button>
        ) : (
          <span style={{ fontSize: '12px', color: 'var(--cafe-suave)' }}>Solo lectura</span>
        )}
      </td>
    </tr>
  );
}

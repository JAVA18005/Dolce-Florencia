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
        <strong style={{ color: 'var(--cafe-deep)', fontSize: 'var(--fs-lead)' }}>{fechaStr}</strong>
        {error && <span style={{ color: 'var(--color-error)', fontSize: 'var(--fs-small)', display: 'block' }}>⚠️ {error}</span>}
      </td>

      <td>
        <span>{bloqueo.motivo}</span>
      </td>

      <td>
        <span
          style={{
            display: 'inline-block',
            fontSize: 'var(--fs-small)',
            padding: '2px 8px',
            borderRadius: '6px',
            fontWeight: 600,
            background: esPorEvento ? 'var(--fucsia-pastel)' : 'var(--color-advertencia-bg)',
            color: esPorEvento ? 'var(--fucsia-accion)' : 'var(--color-advertencia)',
          }}
        >
          {esPorEvento ? `Evento #${bloqueo.reserva?.codigo || ''}` : 'Bloqueo Manual Admin'}
        </span>
      </td>

      <td>
        <span style={{ fontSize: 'var(--fs-small)', color: 'var(--cafe-suave)' }}>
          {bloqueo.creadoPor?.nombre || 'Sistema'}
        </span>
      </td>

      <td>
        {esPorEvento ? (
          <span style={{ fontSize: 'var(--fs-small)', color: 'var(--cafe-suave)' }}>
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
          <span style={{ fontSize: 'var(--fs-small)', color: 'var(--cafe-suave)' }}>Solo lectura</span>
        )}
      </td>
    </tr>
  );
}

'use client';

import { useState } from 'react';
import { alternarHabilitacionMesaAction } from '@/app/(panel)/panel/mesas/acciones';
import { MesaConEstado } from '@/lib/servicios/mesas';

interface Props {
  mesa: MesaConEstado;
  puedeEditar: boolean;
}

export default function FilaMesa({ mesa, puedeEditar }: Props) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async () => {
    if (!confirm(`¿${mesa.habilitada ? 'Deshabilitar' : 'Habilitar'} la ${mesa.nombre}?`)) return;

    setCargando(true);
    setError(null);
    try {
      const res = await alternarHabilitacionMesaAction(mesa.id, !mesa.habilitada);
      if (res.error) setError(res.error);
    } catch (e: any) {
      setError(e.message || 'Error inesperado');
    } finally {
      setCargando(false);
    }
  };

  const getBadgeClase = (estado: string) => {
    switch (estado) {
      case 'LIBRE':
        return 'confirmada';
      case 'RESERVADA':
        return 'pendiente';
      case 'OCUPADA':
        return 'cumplida';
      case 'FUERA_DE_SERVICIO':
        return 'cancelada';
      default:
        return '';
    }
  };

  return (
    <tr>
      <td>
        <strong style={{ color: 'var(--cafe-deep)', fontSize: 'var(--fs-lead)', display: 'block' }}>
          {mesa.nombre}
        </strong>
        <span style={{ fontSize: 'var(--fs-small)', color: 'var(--cafe-suave)' }}>
          Zona: {mesa.zona} · Capacidad: {mesa.capacidad} personas
        </span>
        {error && <span style={{ color: 'var(--color-error)', fontSize: 'var(--fs-small)', display: 'block' }}>⚠️ {error}</span>}
      </td>

      <td>
        <span
          style={{
            display: 'inline-block',
            fontSize: 'var(--fs-small)',
            padding: '2px 8px',
            borderRadius: '6px',
            background: mesa.reservable ? 'var(--color-info-bg)' : 'var(--color-advertencia-bg)',
            color: mesa.reservable ? 'var(--color-info)' : 'var(--color-advertencia)',
            fontWeight: 600,
          }}
        >
          {mesa.reservable ? '✓ Reservable' : '⛔ No reservable (Solo ventas/Barra)'}
        </span>
        {mesa.permiteVariasCuentas && (
          <span style={{ display: 'block', fontSize: 'var(--fs-small)', color: 'var(--cafe-suave)', marginTop: '2px' }}>
            Multi-cuenta permitida
          </span>
        )}
      </td>

      <td>
        <span className={`badge-estado ${getBadgeClase(mesa.estadoDerivado)}`}>
          {mesa.estadoDerivado.replace(/_/g, ' ')}
        </span>
      </td>

      <td>
        {puedeEditar ? (
          <button
            type="button"
            onClick={handleToggle}
            disabled={cargando}
            className={`btn-accion-sm ${mesa.habilitada ? 'btn-peligro' : 'btn-exito'}`}
          >
            {cargando ? '...' : mesa.habilitada ? 'Deshabilitar' : 'Habilitar'}
          </button>
        ) : (
          <span style={{ fontSize: 'var(--fs-small)', color: 'var(--cafe-suave)' }}>Solo lectura</span>
        )}
      </td>
    </tr>
  );
}

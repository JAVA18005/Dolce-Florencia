'use client';

import { useMemo } from 'react';

interface SelectorFechaProps {
  id?: string;
  nombre?: string;
  label?: string;
  valor: string;
  onChange: (fecha: string) => void;
  fechasBloqueadas?: string[];
  maxDias?: number;
  diasHorizonte?: number;
  requerido?: boolean;
  error?: string;
}

export default function SelectorFecha({
  id = 'fecha',
  nombre = 'fecha',
  label,
  valor,
  onChange,
  fechasBloqueadas = [],
  maxDias,
  diasHorizonte = 60,
  requerido = true,
  error,
}: SelectorFechaProps) {
  const limiteDias = maxDias || diasHorizonte;

  // Calcular fecha mínima (hoy en Bolivia) y máxima (horizonte)
  const { minStr, maxStr } = useMemo(() => {
    const ahora = new Date();
    // Bolivia es UTC-4
    const partesHoy = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/La_Paz',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(ahora);

    const [y, m, d] = partesHoy.split('-').map(Number);
    const hoyUtc = new Date(Date.UTC(y, m - 1, d));
    const limiteUtc = new Date(hoyUtc.getTime() + limiteDias * 24 * 60 * 60 * 1000);

    const partesMax = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/La_Paz',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(limiteUtc);

    return { minStr: partesHoy, maxStr: partesMax };
  }, [limiteDias]);

  const esFechaBloqueada = fechasBloqueadas.includes(valor);

  const manejarCambio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nuevaFecha = e.target.value;
    onChange(nuevaFecha);
  };

  return (
    <div className="field-group">
      {label && (
        <label htmlFor={id} className="field-label">
          {label} {requerido && <span className="requerido">*</span>}
        </label>
      )}
      <input
        type="date"
        id={id}
        name={nombre}
        value={valor}
        min={minStr}
        max={maxStr}
        required={requerido}
        onChange={manejarCambio}
        className={`field-input ${error || esFechaBloqueada ? 'field-error' : ''}`}
      />
      {error && <span className="field-error-mensaje">{error}</span>}
      {esFechaBloqueada && (
        <p
          role="alert"
          style={{
            fontSize: '12px',
            color: 'var(--fucsia-accion)',
            marginTop: '6px',
            fontWeight: 500,
          }}
        >
          ⚠️ Esta fecha se encuentra bloqueada por el local (evento o cierre programado). Por favor elige otro día.
        </p>
      )}
    </div>
  );
}

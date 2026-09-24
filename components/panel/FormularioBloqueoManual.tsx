'use client';

import { useActionState, useState } from 'react';
import { bloquearDiaManualAction } from '@/app/(panel)/panel/calendario/acciones';

export default function FormularioBloqueoManual() {
  const [abierto, setAbierto] = useState(false);
  const [estado, formAction, pendiente] = useActionState(async (prev: any, formData: FormData) => {
    const res = await bloquearDiaManualAction(prev, formData);
    if (res?.exito) setAbierto(false);
    return res;
  }, null);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="btn btn-primario"
      >
        + Bloquear Fecha Manualmente
      </button>
    );
  }

  return (
    <div className="panel-card-form" style={{ maxWidth: '100%', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--cafe-deep)' }}>
          Bloquear Fecha en el Calendario (Feriado, Mantenimiento o Cierre)
        </h3>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="btn-accion-sm"
        >
          Cancelar ✕
        </button>
      </div>

      {estado?.error && (
        <div className="alerta-panel alerta-error" role="alert">
          <span>⛔</span>
          <span>{estado.error}</span>
        </div>
      )}

      {estado?.mensaje && (
        <div className="alerta-panel alerta-aviso" role="status">
          <span>ℹ️</span>
          <span>{estado.mensaje}</span>
        </div>
      )}

      <form action={formAction}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div className="field-group">
            <label htmlFor="fecha" className="field-label">
              Fecha a Bloquear <span className="req">*</span>
            </label>
            <input
              id="fecha"
              name="fecha"
              type="date"
              required
              className="field-input"
            />
          </div>

          <div className="field-group">
            <label htmlFor="motivo" className="field-label">
              Motivo del Cierre / Bloqueo <span className="req">*</span>
            </label>
            <input
              id="motivo"
              name="motivo"
              type="text"
              required
              placeholder="Ej. Feriado Nacional de Todos Santos"
              className="field-input"
            />
          </div>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
          <button type="submit" disabled={pendiente} className="btn btn-primario">
            {pendiente ? 'Bloqueando día...' : 'Confirmar Bloqueo'}
          </button>
          <button type="button" onClick={() => setAbierto(false)} className="btn btn-secundario">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

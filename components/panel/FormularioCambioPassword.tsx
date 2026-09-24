'use client';

import { useActionState } from 'react';
import { cambiarPasswordPropioAction } from '@/app/(panel)/panel/cuenta/acciones';

interface Props {
  esObligatorio?: boolean;
}

export default function FormularioCambioPassword({ esObligatorio = false }: Props) {
  const [estado, formAction, pendiente] = useActionState(cambiarPasswordPropioAction, null);

  return (
    <form action={formAction} className="panel-login-form">
      <input type="hidden" name="esObligatorio" value={esObligatorio ? 'true' : 'false'} />

      {estado?.error && (
        <div className="alerta-panel alerta-error" role="alert">
          <span>⛔</span>
          <span>{estado.error}</span>
        </div>
      )}

      {estado?.exito && (
        <div className="alerta-panel alerta-exito" role="status">
          <span>✅</span>
          <span>{estado.mensaje || 'Contraseña actualizada exitosamente.'}</span>
        </div>
      )}

      <div className="field-group">
        <label htmlFor="passwordActual" className="field-label">
          Contraseña Actual o Temporal <span className="req">*</span>
        </label>
        <input
          id="passwordActual"
          name="passwordActual"
          type="password"
          required
          autoComplete="current-password"
          className="field-input"
          placeholder="••••••••••••"
        />
      </div>

      <div className="field-group">
        <label htmlFor="passwordNueva" className="field-label">
          Nueva Contraseña (mínimo 12 caracteres, máx 72 bytes UTF-8) <span className="req">*</span>
        </label>
        <input
          id="passwordNueva"
          name="passwordNueva"
          type="password"
          required
          minLength={12}
          autoComplete="new-password"
          className="field-input"
          placeholder="••••••••••••"
        />
        <span className="field-hint">
          Usa una combinación robusta de letras, números y símbolos.
        </span>
      </div>

      <div className="field-group">
        <label htmlFor="confirmacion" className="field-label">
          Confirmar Nueva Contraseña <span className="req">*</span>
        </label>
        <input
          id="confirmacion"
          name="confirmacion"
          type="password"
          required
          minLength={12}
          autoComplete="new-password"
          className="field-input"
          placeholder="••••••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={pendiente}
        className="btn btn-primario"
        style={{ width: '100%', marginTop: '10px' }}
      >
        {pendiente ? 'Actualizando contraseña...' : 'Guardar Nueva Contraseña'}
      </button>
    </form>
  );
}

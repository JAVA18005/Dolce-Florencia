'use client';

import { useActionState } from 'react';
import { iniciarSesionAction } from '@/app/(panel)/panel/acciones';

export default function FormularioLogin() {
  const [state, formAction, isPending] = useActionState(iniciarSesionAction, null);

  return (
    <form action={formAction} className="formulario-solicitud panel-login-card" noValidate>
      <div className="panel-login-cabecera">
        <span className="eyebrow">Acceso Restringido</span>
        <h1 className="panel-login-titulo">Personal Dolce Florencia</h1>
        <p className="panel-login-desc">
          Ingresa con tu correo institucional y contraseña autorizada.
        </p>
      </div>

      {state?.error && (
        <div className="alerta-error" role="alert" tabIndex={-1}>
          <p className="alerta-error-texto">{state.error}</p>
        </div>
      )}

      <div className="field-group">
        <label htmlFor="email" className="field-label">
          Correo Electrónico <span className="requerido">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          placeholder="ejemplo@dolceflorencia.com"
          className="field-input"
        />
      </div>

      <div className="field-group">
        <label htmlFor="password" className="field-label">
          Contraseña <span className="requerido">*</span>
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••••••"
          className="field-input"
        />
      </div>

      <div className="form-acciones" style={{ marginTop: '24px' }}>
        <button
          type="submit"
          className="btn btn-primary btn-lg"
          disabled={isPending}
          style={{ width: '100%', maxWidth: '100%' }}
        >
          {isPending ? 'Verificando credenciales...' : 'Ingresar al Panel'}
        </button>
      </div>

      <p className="field-ayuda" style={{ textAlign: 'center', marginTop: '18px' }}>
        Por seguridad, los intentos fallidos son monitoreados y pueden resultar en bloqueo temporal.
      </p>
    </form>
  );
}

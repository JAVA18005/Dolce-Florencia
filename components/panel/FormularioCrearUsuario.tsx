'use client';

import { useActionState, useState } from 'react';
import { crearUsuarioAction } from '@/app/(panel)/panel/usuarios/acciones';

export default function FormularioCrearUsuario() {
  const [abierto, setAbierto] = useState(false);
  const [estado, formAction, pendiente] = useActionState(async (prev: any, formData: FormData) => {
    const res = await crearUsuarioAction(prev, formData);
    if (res?.exito) {
      setAbierto(false);
    }
    return res;
  }, null);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="btn btn-primario"
      >
        + Agregar Nuevo Empleado
      </button>
    );
  }

  return (
    <div className="panel-card-form" style={{ maxWidth: '100%', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--cafe-deep)' }}>
          Crear Nuevo Usuario de Personal
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

      <form action={formAction}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div className="field-group">
            <label htmlFor="nombre" className="field-label">
              Nombre Completo <span className="req">*</span>
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              required
              className="field-input"
              placeholder="Ej. Rodrigo Flores"
            />
          </div>

          <div className="field-group">
            <label htmlFor="email" className="field-label">
              Correo Electrónico <span className="req">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="field-input"
              placeholder="rodrigo@dolceflorencia.com"
            />
          </div>

          <div className="field-group">
            <label htmlFor="rol" className="field-label">
              Rol del Sistema <span className="req">*</span>
            </label>
            <select id="rol" name="rol" required className="field-input">
              <option value="MESERO">MESERO (Atención de mesas y pedidos)</option>
              <option value="ADMIN">ADMIN (Acceso total)</option>
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="passwordInicial" className="field-label">
              Contraseña Temporal (mín. 12 caracteres, máx 72 bytes) <span className="req">*</span>
            </label>
            <input
              id="passwordInicial"
              name="passwordInicial"
              type="password"
              required
              minLength={12}
              className="field-input"
              placeholder="••••••••••••"
            />
            <span className="field-hint">
              El usuario deberá cambiarla obligatoriamente en su primer ingreso.
            </span>
          </div>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
          <button
            type="submit"
            disabled={pendiente}
            className="btn btn-primario"
          >
            {pendiente ? 'Guardando en BD...' : 'Crear Usuario'}
          </button>
          <button
            type="button"
            onClick={() => setAbierto(false)}
            className="btn btn-secundario"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Rol } from '@prisma/client';
import {
  cambiarEstadoUsuarioAction,
  cambiarRolUsuarioAction,
  restablecerPasswordAction,
} from '@/app/(panel)/panel/usuarios/acciones';

interface FilaUsuarioProps {
  usuario: {
    id: string;
    nombre: string;
    email: string;
    rol: Rol;
    activo: boolean;
    debeCambiarPassword: boolean;
    creadoEn: Date;
  };
  esUsuarioActual: boolean;
}

export default function FilaUsuario({ usuario, esUsuarioActual }: FilaUsuarioProps) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrandoModalClave, setMostrandoModalClave] = useState(false);
  const [claveTemporal, setClaveTemporal] = useState('');

  const alternarEstado = async () => {
    if (esUsuarioActual && usuario.activo) {
      alert('No puedes desactivar tu propia cuenta.');
      return;
    }

    if (!confirm(`¿Estás seguro de ${usuario.activo ? 'desactivar' : 'activar'} a ${usuario.nombre}?`)) {
      return;
    }

    setCargando(true);
    setError(null);
    try {
      const res = await cambiarEstadoUsuarioAction(usuario.id, !usuario.activo);
      if (res?.error) setError(res.error);
    } catch (e: any) {
      setError(e.message || 'Error al cambiar estado.');
    } finally {
      setCargando(false);
    }
  };

  const alternarRol = async () => {
    const nuevoRol = usuario.rol === Rol.ADMIN ? Rol.MESERO : Rol.ADMIN;
    if (esUsuarioActual && nuevoRol !== Rol.ADMIN) {
      alert('No puedes quitarte el rol de administrador a ti mismo.');
      return;
    }

    if (!confirm(`¿Cambiar el rol de ${usuario.nombre} a ${nuevoRol}? Sus sesiones actuales se revocarán.`)) {
      return;
    }

    setCargando(true);
    setError(null);
    try {
      const res = await cambiarRolUsuarioAction(usuario.id, nuevoRol);
      if (res?.error) setError(res.error);
    } catch (e: any) {
      setError(e.message || 'Error al cambiar rol.');
    } finally {
      setCargando(false);
    }
  };

  const ejecutarRestablecimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (claveTemporal.length < 12) {
      alert('La contraseña temporal debe tener al menos 12 caracteres.');
      return;
    }

    setCargando(true);
    setError(null);
    try {
      const res = await restablecerPasswordAction(usuario.id, claveTemporal);
      if (res?.error) {
        setError(res.error);
      } else {
        alert(`Contraseña temporal asignada. El usuario ${usuario.nombre} deberá cambiarla al iniciar sesión.`);
        setMostrandoModalClave(false);
        setClaveTemporal('');
      }
    } catch (e: any) {
      setError(e.message || 'Error al restablecer contraseña.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      <tr>
        <td>
          <strong style={{ color: 'var(--cafe-deep)', display: 'block' }}>{usuario.nombre}</strong>
          <span style={{ fontSize: '12px', color: 'var(--cafe-suave)' }}>{usuario.email}</span>
          {esUsuarioActual && (
            <span style={{ fontSize: '11px', color: 'var(--fucsia-accion)', fontWeight: 600, display: 'block' }}>
              (Tu sesión actual)
            </span>
          )}
          {error && (
            <span style={{ fontSize: '11px', color: '#c92a2a', display: 'block', marginTop: '4px' }}>
              ⚠️ {error}
            </span>
          )}
        </td>

        <td>
          <span className={`badge-rol ${usuario.rol === Rol.ADMIN ? 'badge-admin' : 'badge-mesero'}`}>
            {usuario.rol}
          </span>
          {!esUsuarioActual && (
            <button
              type="button"
              onClick={alternarRol}
              disabled={cargando}
              className="btn-accion-sm"
              style={{ display: 'block', marginTop: '6px', fontSize: '11px' }}
              title="Cambiar rol"
            >
              Cambiar a {usuario.rol === Rol.ADMIN ? 'Mesero' : 'Admin'}
            </button>
          )}
        </td>

        <td>
          <span className={`badge-estado ${usuario.activo ? 'confirmada' : 'badge-inactivo'}`}>
            {usuario.activo ? 'Activo' : 'Inactivo'}
          </span>
          {usuario.debeCambiarPassword && (
            <span
              style={{
                display: 'block',
                marginTop: '4px',
                fontSize: '11px',
                color: '#d9480f',
                fontWeight: 600,
              }}
            >
              Pendiente cambio de clave
            </span>
          )}
        </td>

        <td>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={alternarEstado}
              disabled={cargando || (esUsuarioActual && usuario.activo)}
              className={`btn-accion-sm ${usuario.activo ? 'btn-peligro' : 'btn-exito'}`}
              title={esUsuarioActual ? 'No puedes desactivarte a ti mismo' : ''}
            >
              {usuario.activo ? 'Desactivar' : 'Activar'}
            </button>

            <button
              type="button"
              onClick={() => setMostrandoModalClave(true)}
              disabled={cargando}
              className="btn-accion-sm"
            >
              Restablecer Clave
            </button>
          </div>
        </td>
      </tr>

      {/* Modal / Diálogo para restablecer contraseña temporal */}
      {mostrandoModalClave && (
        <tr>
          <td colSpan={4} style={{ background: '#fdf7f4', padding: '16px 20px', borderLeft: '4px solid var(--fucsia-accion)' }}>
            <form onSubmit={ejecutarRestablecimiento} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cafe-deep)' }}>
                Nueva contraseña temporal para {usuario.nombre}:
              </span>
              <input
                type="password"
                required
                minLength={12}
                value={claveTemporal}
                onChange={(e) => setClaveTemporal(e.target.value)}
                placeholder="Mínimo 12 caracteres..."
                className="field-input"
                style={{ maxWidth: '280px', padding: '6px 12px', fontSize: '13px' }}
              />
              <button
                type="submit"
                disabled={cargando}
                className="btn btn-primario"
                style={{ padding: '8px 16px', fontSize: '12px' }}
              >
                {cargando ? 'Guardando...' : 'Asignar Clave'}
              </button>
              <button
                type="button"
                onClick={() => setMostrandoModalClave(false)}
                className="btn btn-secundario"
                style={{ padding: '8px 16px', fontSize: '12px' }}
              >
                Cancelar
              </button>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}

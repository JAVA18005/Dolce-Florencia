// TODO: eliminar antes del despliegue
'use client';

import { useState } from 'react';
import { probarAccionRestringidaAdminAction } from '@/app/(panel)/panel/acciones';

export default function BotonPruebaAutorizacion() {
  // TODO: eliminar antes del despliegue
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<{ exito: boolean; mensaje: string } | null>(null);

  const ejecutarPrueba = async () => {
    setCargando(true);
    setResultado(null);
    try {
      const res = await probarAccionRestringidaAdminAction();
      setResultado(res);
    } catch (e: any) {
      setResultado({ exito: false, mensaje: e.message || 'Error inesperado' });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="panel-tarjeta-prueba">
      <h3 style={{ fontSize: 'var(--fs-lead)', margin: '0 0 8px', color: 'var(--cafe-deep)' }}>
        Prueba de Verificación en Servidor (Solo Administrador)
      </h3>
      <p style={{ fontSize: 'var(--fs-small)', color: 'var(--cafe-suave)', margin: '0 0 14px' }}>
        Presiona para invocar un Server Action protegido por <code>puede(rol, 'configuracion.gestionar')</code>.
        Si la sesión es de rol Mesero, el servidor rechazará la petición con un error 403.
      </p>

      <button
        type="button"
        onClick={ejecutarPrueba}
        disabled={cargando}
        className="btn btn-secundario"
      >
        {cargando ? 'Verificando en servidor...' : 'Ejecutar acción restringida de Admin'}
      </button>

      {resultado && (
        <div
          role="status"
          style={{
            marginTop: '12px',
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: 'var(--fs-small)',
            fontWeight: 600,
            background: resultado.exito ? 'var(--color-exito-bg)' : 'var(--color-error-bg)',
            color: resultado.exito ? 'var(--color-exito)' : 'var(--color-error)',
            border: `1px solid ${resultado.exito ? 'var(--color-exito-border)' : 'var(--color-error-border)'}`,
          }}
        >
          {resultado.exito ? '✅ ' : '⛔ '} {resultado.mensaje}
        </div>
      )}
    </div>
  );
}

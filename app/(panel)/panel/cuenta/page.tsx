import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { obtenerSesionServidor } from '@/lib/auth/sesion';
import PanelTopbar from '@/components/panel/PanelTopbar';
import FormularioCambioPassword from '@/components/panel/FormularioCambioPassword';
import { cerrarTodasMisSesionesAction } from './acciones';

export const metadata: Metadata = {
  title: 'Mi Cuenta & Seguridad | Panel Dolce Florencia',
};

export default async function MiCuentaPage() {
  const sesion = await obtenerSesionServidor();

  if (!sesion) {
    redirect('/panel/login');
  }

  const { usuario } = sesion;

  if (usuario.debeCambiarPassword) {
    redirect('/panel/cambiar-password');
  }

  return (
    <div className="panel-layout-wrap">
      <PanelTopbar usuario={usuario} rutaActual="/panel/cuenta" />

      <main className="wrap panel-principal">
        <div className="panel-cabecera-modulo">
          <div>
            <span className="eyebrow">Seguridad de Acceso</span>
            <h1 className="panel-titulo">Mi Cuenta de Personal</h1>
            <p className="panel-subtitulo">
              Configura tus credenciales de acceso y gestiona las sesiones activas en tus dispositivos.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px', alignItems: 'start' }}>
          {/* Tarjeta de datos de usuario */}
          <div className="panel-card-form">
            <h2 style={{ fontSize: '20px', fontFamily: 'var(--font-cormorant), serif', color: 'var(--cafe-deep)', margin: '0 0 16px' }}>
              Información de Perfil
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '14px', color: 'var(--cafe)' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '12px', textTransform: 'uppercase', color: 'var(--cafe-suave)' }}>
                  Nombre Completo
                </strong>
                <span>{usuario.nombre}</span>
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '12px', textTransform: 'uppercase', color: 'var(--cafe-suave)' }}>
                  Correo Electrónico
                </strong>
                <span>{usuario.email}</span>
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '12px', textTransform: 'uppercase', color: 'var(--cafe-suave)' }}>
                  Rol de Sistema
                </strong>
                <span className={`badge-rol ${usuario.rol === 'ADMIN' ? 'badge-admin' : 'badge-mesero'}`} style={{ display: 'inline-block', marginTop: '4px' }}>
                  {usuario.rol}
                </span>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--linea)', margin: '24px 0' }} />

            <h3 style={{ fontSize: '16px', color: 'var(--cafe-deep)', margin: '0 0 8px' }}>
              Sesiones Activas
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--cafe-suave)', margin: '0 0 16px', lineHeight: 1.5 }}>
              Si sospechas que dejaste abierta tu cuenta en otro equipo o dispositivo móvil, puedes revocar de inmediato todos los accesos excepto este.
            </p>

            <form action={cerrarTodasMisSesionesAction}>
              <button
                type="submit"
                className="btn-accion-sm btn-peligro"
                style={{ padding: '8px 16px' }}
              >
                🔒 Cerrar todas mis sesiones
              </button>
            </form>
          </div>

          {/* Formulario de cambio de contraseña */}
          <div className="panel-card-form">
            <h2 style={{ fontSize: '20px', fontFamily: 'var(--font-cormorant), serif', color: 'var(--cafe-deep)', margin: '0 0 8px' }}>
              Cambiar Contraseña
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--cafe-suave)', margin: '0 0 20px', lineHeight: 1.5 }}>
              Ingresa tu contraseña actual seguida de la nueva contraseña. Al cambiarla, las demás sesiones se revocarán automáticamente.
            </p>

            <FormularioCambioPassword esObligatorio={false} />
          </div>
        </div>
      </main>
    </div>
  );
}

import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { obtenerSesionServidor } from '@/lib/auth/sesion';
import FormularioCambioPassword from '@/components/panel/FormularioCambioPassword';

export const metadata: Metadata = {
  title: 'Actualización Obligatoria de Contraseña | Dolce Florencia',
};

export default async function CambiarPasswordObligatorioPage() {
  const sesion = await obtenerSesionServidor();

  if (!sesion) {
    redirect('/panel/login');
  }

  // Si ya no debe cambiarla, redirigir al panel principal
  if (!sesion.usuario.debeCambiarPassword) {
    redirect('/panel');
  }

  return (
    <div className="panel-login-wrap">
      <div className="panel-login-card" style={{ maxWidth: '480px' }}>
        <div className="panel-login-cabecera">
          <span className="eyebrow" style={{ color: 'var(--fucsia-accion)' }}>Primer Inicio de Sesión</span>
          <h1 className="panel-login-titulo">Actualizar Contraseña</h1>
          <p className="panel-login-desc">
            Por seguridad de la empresa, debes cambiar la contraseña inicial temporal asignada por el administrador antes de acceder al panel.
          </p>
        </div>

        <FormularioCambioPassword esObligatorio={true} />
      </div>
    </div>
  );
}

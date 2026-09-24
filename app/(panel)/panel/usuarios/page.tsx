import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { exigirSesionServidor } from '@/lib/auth/sesion';
import { listarUsuariosPersonal } from '@/lib/servicios/usuarios';
import PanelTopbar from '@/components/panel/PanelTopbar';
import FormularioCrearUsuario from '@/components/panel/FormularioCrearUsuario';
import FilaUsuario from '@/components/panel/FilaUsuario';

export const metadata: Metadata = {
  title: 'Gestión de Personal | Panel Dolce Florencia',
};

export default async function GestionUsuariosPage() {
  let sesion;
  try {
    sesion = await exigirSesionServidor('usuarios.gestionar');
  } catch {
    redirect('/panel');
  }

  const { usuario } = sesion;

  if (usuario.debeCambiarPassword) {
    redirect('/panel/cambiar-password');
  }

  const listaUsuarios = await listarUsuariosPersonal();

  return (
    <div className="panel-layout-wrap">
      <PanelTopbar usuario={usuario} rutaActual="/panel/usuarios" />

      <main className="wrap panel-principal">
        <div className="panel-cabecera-modulo">
          <div>
            <span className="eyebrow" style={{ color: 'var(--fucsia-accion)' }}>Administración</span>
            <h1 className="panel-titulo">Personal & Permisos</h1>
            <p className="panel-subtitulo">
              Crea cuentas de acceso, asigna roles de Mesero o Administrador y gestiona la seguridad del equipo.
            </p>
          </div>

          <FormularioCrearUsuario />
        </div>

        <div className="panel-tabla-contenedor">
          <table className="panel-tabla">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {listaUsuarios.map((u) => (
                <FilaUsuario
                  key={u.id}
                  usuario={u}
                  esUsuarioActual={u.id === usuario.id}
                />
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

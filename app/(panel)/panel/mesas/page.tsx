import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { exigirSesionServidor } from '@/lib/auth/sesion';
import { puede } from '@/lib/permisos';
import { listarMesas } from '@/lib/servicios/mesas';
import PanelTopbar from '@/components/panel/PanelTopbar';
import FilaMesa from '@/components/panel/FilaMesa';

export const metadata: Metadata = {
  title: 'Mesas & Salón | Panel Dolce Florencia',
};

export default async function GestionMesasPage() {
  let sesion;
  try {
    sesion = await exigirSesionServidor('mesas.ver');
  } catch {
    redirect('/panel');
  }

  const { usuario } = sesion;

  if (usuario.debeCambiarPassword) {
    redirect('/panel/cambiar-password');
  }

  const mesas = await listarMesas();
  const puedeEditar = puede(usuario.rol, 'mesas.gestionar');

  return (
    <div className="panel-layout-wrap">
      <PanelTopbar usuario={usuario} rutaActual="/panel/mesas" />

      <main className="wrap panel-principal">
        <div className="panel-cabecera-modulo">
          <div>
            <span className="eyebrow" style={{ color: 'var(--fucsia-accion)' }}>Salón & Capacidad</span>
            <h1 className="panel-titulo">Mesas del Local</h1>
            <p className="panel-subtitulo">
              Estado derivado en vivo (Libre, Reservada, Fuera de Servicio). La Barra admite varias cuentas abiertas a la vez y no es reservable.
            </p>
          </div>
        </div>

        <div className="panel-tabla-contenedor">
          <table className="panel-tabla">
            <thead>
              <tr>
                <th>Mesa / Ubicación</th>
                <th>Tipo de Servicio</th>
                <th>Estado Actual (Hoy)</th>
                <th>Gestión</th>
              </tr>
            </thead>
            <tbody>
              {mesas.map((m) => (
                <FilaMesa key={m.id} mesa={m} puedeEditar={puedeEditar} />
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

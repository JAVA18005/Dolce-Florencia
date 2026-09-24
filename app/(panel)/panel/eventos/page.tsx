import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { exigirSesionServidor } from '@/lib/auth/sesion';
import { listarEventos, calcularCapacidadTotalLocal } from '@/lib/servicios/eventos-panel';
import PanelTopbar from '@/components/panel/PanelTopbar';
import FilaEvento from '@/components/panel/FilaEvento';

export const metadata: Metadata = {
  title: 'Gestión de Eventos | Panel Dolce Florencia',
};

export default async function GestionEventosPage() {
  let sesion;
  try {
    sesion = await exigirSesionServidor('eventos.confirmar');
  } catch {
    redirect('/panel');
  }

  const { usuario } = sesion;

  if (usuario.debeCambiarPassword) {
    redirect('/panel/cambiar-password');
  }

  const [eventos, capacidadTotal] = await Promise.all([
    listarEventos(),
    calcularCapacidadTotalLocal(),
  ]);

  return (
    <div className="panel-layout-wrap">
      <PanelTopbar usuario={usuario} rutaActual="/panel/eventos" />

      <main className="wrap panel-principal">
        <div className="panel-cabecera-modulo">
          <div>
            <span className="eyebrow" style={{ color: 'var(--fucsia-accion)' }}>Exclusivo Administrador</span>
            <h1 className="panel-titulo">Eventos & Celebraciones</h1>
            <p className="panel-subtitulo">
              Revisa solicitudes de eventos especiales, coordina por WhatsApp y aprueba cierres de local cuando la asistencia supera la capacidad del salón ({capacidadTotal} personas).
            </p>
          </div>
        </div>

        <div className="panel-tabla-contenedor">
          <table className="panel-tabla">
            <thead>
              <tr>
                <th>Código / Cliente</th>
                <th>Fecha & Asistencia</th>
                <th>Modalidad & Impacto</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {eventos.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--cafe-suave)' }}>
                    No hay solicitudes de eventos registradas.
                  </td>
                </tr>
              ) : (
                eventos.map((ev) => (
                  <FilaEvento
                    key={ev.id}
                    evento={ev}
                    capacidadTotalLocal={capacidadTotal}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

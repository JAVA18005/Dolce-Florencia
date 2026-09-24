import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { exigirSesionServidor } from '@/lib/auth/sesion';
import { listarReservasMesa } from '@/lib/servicios/reservas-panel';
import { listarMesas } from '@/lib/servicios/mesas';
import PanelTopbar from '@/components/panel/PanelTopbar';
import FilaReserva from '@/components/panel/FilaReserva';

export const metadata: Metadata = {
  title: 'Gestión de Reservas | Panel Dolce Florencia',
};

export default async function GestionReservasPage() {
  let sesion;
  try {
    sesion = await exigirSesionServidor('reservas.gestionar');
  } catch {
    redirect('/panel');
  }

  const { usuario } = sesion;

  if (usuario.debeCambiarPassword) {
    redirect('/panel/cambiar-password');
  }

  const [reservas, mesas] = await Promise.all([
    listarReservasMesa(),
    listarMesas(),
  ]);

  const mesasHabilitadasReservables = mesas.filter((m) => m.habilitada && m.reservable);

  return (
    <div className="panel-layout-wrap">
      <PanelTopbar usuario={usuario} rutaActual="/panel/reservas" />

      <main className="wrap panel-principal">
        <div className="panel-cabecera-modulo">
          <div>
            <span className="eyebrow" style={{ color: 'var(--fucsia-accion)' }}>Servicio de Salón</span>
            <h1 className="panel-titulo">Reservas de Mesa</h1>
            <p className="panel-subtitulo">
              Asigna mesas a las visitas programadas, contacta a clientes por WhatsApp y monitorea no-shows.
            </p>
          </div>
        </div>

        <div className="panel-tabla-contenedor">
          <table className="panel-tabla">
            <thead>
              <tr>
                <th>Código / Cliente</th>
                <th>Fecha & Hora</th>
                <th>Mesa Asignada</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {reservas.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--cafe-suave)' }}>
                    No hay reservas de mesa registradas.
                  </td>
                </tr>
              ) : (
                reservas.map((r) => (
                  <FilaReserva
                    key={r.id}
                    reserva={r}
                    mesasDisponibles={mesasHabilitadasReservables}
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

import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { exigirSesionServidor } from '@/lib/auth/sesion';
import { puede } from '@/lib/permisos';
import { listarDiasBloqueados } from '@/lib/servicios/calendario';
import PanelTopbar from '@/components/panel/PanelTopbar';
import FormularioBloqueoManual from '@/components/panel/FormularioBloqueoManual';
import FilaDiaBloqueado from '@/components/panel/FilaDiaBloqueado';

export const metadata: Metadata = {
  title: 'Calendario & Cierres | Panel Dolce Florencia',
};

export default async function GestionCalendarioPage() {
  let sesion;
  try {
    sesion = await exigirSesionServidor('dias.bloquear');
  } catch {
    redirect('/panel');
  }

  const { usuario } = sesion;

  if (usuario.debeCambiarPassword) {
    redirect('/panel/cambiar-password');
  }

  const diasBloqueados = await listarDiasBloqueados();
  const puedeBloquear = puede(usuario.rol, 'dias.bloquear');

  return (
    <div className="panel-layout-wrap">
      <PanelTopbar usuario={usuario} rutaActual="/panel/calendario" />

      <main className="wrap panel-principal">
        <div className="panel-cabecera-modulo">
          <div>
            <span className="eyebrow" style={{ color: 'var(--fucsia-accion)' }}>Control de Disponibilidad</span>
            <h1 className="panel-titulo">Calendario & Días Bloqueados</h1>
            <p className="panel-subtitulo">
              Fechas cerradas en las cuales la web no permite al público solicitar reservas de mesa ni eventos en el local.
            </p>
          </div>

          {puedeBloquear && <FormularioBloqueoManual />}
        </div>

        <div className="panel-tabla-contenedor">
          <table className="panel-tabla">
            <thead>
              <tr>
                <th>Fecha Bloqueada</th>
                <th>Motivo del Cierre</th>
                <th>Origen</th>
                <th>Registrado Por</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {diasBloqueados.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--cafe-suave)' }}>
                    No hay fechas bloqueadas en el calendario.
                  </td>
                </tr>
              ) : (
                diasBloqueados.map((b) => (
                  <FilaDiaBloqueado
                    key={b.fecha.toISOString()}
                    bloqueo={b}
                    puedeDesbloquear={puedeBloquear}
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

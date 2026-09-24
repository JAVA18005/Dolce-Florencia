import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { exigirSesionServidor } from '@/lib/auth/sesion';
import { listarPedidos } from '@/lib/servicios/pedidos-panel';
import PanelTopbar from '@/components/panel/PanelTopbar';
import FilaPedido from '@/components/panel/FilaPedido';

export const metadata: Metadata = {
  title: 'Gestión de Pedidos | Panel Dolce Florencia',
};

export default async function GestionPedidosPage() {
  let sesion;
  try {
    sesion = await exigirSesionServidor('pedidos.gestionar');
  } catch {
    redirect('/panel');
  }

  const { usuario } = sesion;

  if (usuario.debeCambiarPassword) {
    redirect('/panel/cambiar-password');
  }

  const pedidos = await listarPedidos();

  return (
    <div className="panel-layout-wrap">
      <PanelTopbar usuario={usuario} rutaActual="/panel/pedidos" />

      <main className="wrap panel-principal">
        <div className="panel-cabecera-modulo">
          <div>
            <span className="eyebrow" style={{ color: 'var(--fucsia-accion)' }}>Bandeja Web</span>
            <h1 className="panel-titulo">Pedidos de Clientes</h1>
            <p className="panel-subtitulo">
              Gestiona las solicitudes recibidas desde la web, acuerda detalles y confirma montos por WhatsApp.
            </p>
          </div>
        </div>

        <div className="panel-tabla-contenedor">
          <table className="panel-tabla">
            <thead>
              <tr>
                <th>Código / Cliente</th>
                <th>Fecha Deseada</th>
                <th>Detalle / Ítems</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--cafe-suave)' }}>
                    No hay pedidos registrados en este momento.
                  </td>
                </tr>
              ) : (
                pedidos.map((p) => <FilaPedido key={p.id} pedido={p} />)
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

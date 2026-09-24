import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { exigirSesionServidor } from '@/lib/auth/sesion';
import { listarVentas } from '@/lib/servicios/ventas';
import { listarMesas } from '@/lib/servicios/mesas';
import PanelTopbar from '@/components/panel/PanelTopbar';
import FilaVenta from '@/components/panel/FilaVenta';
import FormularioNuevaVenta from '@/components/panel/FormularioNuevaVenta';

export const metadata: Metadata = {
  title: 'Ventas & Caja | Panel Dolce Florencia',
};

export default async function GestionVentasPage() {
  let sesion;
  try {
    sesion = await exigirSesionServidor('ventas.registrar');
  } catch {
    redirect('/panel');
  }

  const { usuario } = sesion;

  if (usuario.debeCambiarPassword) {
    redirect('/panel/cambiar-password');
  }

  const [ventas, mesas, productos] = await Promise.all([
    listarVentas({ limite: 50 }),
    listarMesas(),
    prisma.producto.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        precioCentavos: true,
        categoria: { select: { nombre: true } },
      },
      orderBy: { orden: 'asc' },
    }),
  ]);

  const ventasAbiertas = ventas.filter((v) => v.estado === 'PENDIENTE_COBRO');
  const ventasCobradas = ventas.filter((v) => v.estado !== 'PENDIENTE_COBRO');

  return (
    <div className="panel-layout-wrap">
      <PanelTopbar usuario={usuario} rutaActual="/panel/ventas" />

      <main className="wrap panel-principal">
        <div className="panel-cabecera-modulo">
          <div>
            <span className="eyebrow" style={{ color: 'var(--fucsia-accion)' }}>Servicio & Caja</span>
            <h1 className="panel-titulo">Ventas & Comandas</h1>
            <p className="panel-subtitulo">
              Abre cuentas por mesa o mostrador, agrega productos a comandas activas y cobra en caja (Efectivo, QR o Transferencia).
            </p>
          </div>
        </div>

        {/* Formulario rápido para abrir comanda / registrar venta */}
        <FormularioNuevaVenta mesas={mesas} productos={productos} />

        {/* Sección: Comandas Abiertas / Pendientes de Cobro */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--cafe-deep)' }}>
              Comandas Abiertas ({ventasAbiertas.length})
            </h2>
            <span className="badge-estado pendiente">Pendiente de cobro</span>
          </div>

          <div className="panel-tabla-contenedor">
            <table className="panel-tabla">
              <thead>
                <tr>
                  <th>Ticket / Hora</th>
                  <th>Ubicación / Origen</th>
                  <th>Detalle de Consumos</th>
                  <th>Total Calculado</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ventasAbiertas.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--cafe-suave)' }}>
                      No hay comandas abiertas en este momento. Todas las mesas están al día.
                    </td>
                  </tr>
                ) : (
                  ventasAbiertas.map((v) => (
                    <FilaVenta
                      key={v.id}
                      venta={v}
                      rolUsuario={usuario.rol}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sección: Historial Reciente de Ventas Realizadas / Anuladas */}
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '14px', color: 'var(--cafe-deep)' }}>
            Últimas Ventas Cobradas
          </h2>

          <div className="panel-tabla-contenedor">
            <table className="panel-tabla">
              <thead>
                <tr>
                  <th>Ticket / Hora</th>
                  <th>Ubicación / Origen</th>
                  <th>Detalle de Consumos</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ventasCobradas.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--cafe-suave)' }}>
                      No hay historial de ventas cerradas recientemente.
                    </td>
                  </tr>
                ) : (
                  ventasCobradas.map((v) => (
                    <FilaVenta
                      key={v.id}
                      venta={v}
                      rolUsuario={usuario.rol}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

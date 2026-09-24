import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { exigirSesionServidor } from '@/lib/auth/sesion';
import { obtenerMetricasDashboard, PeriodoDashboard } from '@/lib/servicios/dashboard';
import { formatearCentavosABs } from '@/lib/dinero';
import PanelTopbar from '@/components/panel/PanelTopbar';

export const metadata: Metadata = {
  title: 'Dashboard Métricas | Panel Dolce Florencia',
};

interface Props {
  searchParams: Promise<{ periodo?: string }>;
}

export default async function DashboardPage({ searchParams }: Props) {
  let sesion;
  try {
    sesion = await exigirSesionServidor('dashboard.ver');
  } catch {
    redirect('/panel');
  }

  const { usuario } = sesion;

  if (usuario.debeCambiarPassword) {
    redirect('/panel/cambiar-password');
  }

  const params = await searchParams;
  const periodoValido: PeriodoDashboard =
    params.periodo === 'semana' || params.periodo === 'mes' ? params.periodo : 'hoy';

  const metricas = await obtenerMetricasDashboard(periodoValido);

  const maxVentasHora = Math.max(1, ...metricas.horasPico.map((h) => h.cantidad));

  return (
    <div className="panel-layout-wrap">
      <PanelTopbar usuario={usuario} rutaActual="/panel/dashboard" />

      <main className="wrap panel-principal">
        <div className="panel-cabecera-modulo">
          <div>
            <span className="eyebrow" style={{ color: 'var(--fucsia-accion)' }}>Exclusivo Administrador</span>
            <h1 className="panel-titulo">Dashboard de Rendimiento</h1>
            <p className="panel-subtitulo">
              Métricas consolidadas calculadas exclusivamente sobre ventas cerradas y cobradas (REALIZADA) en hora local de Bolivia.
            </p>
          </div>

          {/* Filtro de Período */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Link
              href="/panel/dashboard?periodo=hoy"
              className={`panel-nav-link ${periodoValido === 'hoy' ? 'activo' : ''}`}
              style={{ background: periodoValido === 'hoy' ? 'var(--fucsia-accion)' : 'var(--hueso)', color: periodoValido === 'hoy' ? '#fff' : 'var(--cafe)', border: '1px solid var(--linea)' }}
            >
              Hoy
            </Link>
            <Link
              href="/panel/dashboard?periodo=semana"
              className={`panel-nav-link ${periodoValido === 'semana' ? 'activo' : ''}`}
              style={{ background: periodoValido === 'semana' ? 'var(--fucsia-accion)' : 'var(--hueso)', color: periodoValido === 'semana' ? '#fff' : 'var(--cafe)', border: '1px solid var(--linea)' }}
            >
              Esta Semana
            </Link>
            <Link
              href="/panel/dashboard?periodo=mes"
              className={`panel-nav-link ${periodoValido === 'mes' ? 'activo' : ''}`}
              style={{ background: periodoValido === 'mes' ? 'var(--fucsia-accion)' : 'var(--hueso)', color: periodoValido === 'mes' ? '#fff' : 'var(--cafe)', border: '1px solid var(--linea)' }}
            >
              Este Mes
            </Link>
          </div>
        </div>

        {/* Tarjetas Principales de KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          <div className="panel-modulo-tarjeta" style={{ borderLeft: '4px solid #2b8a3e' }}>
            <span className="modulo-tag">Ingresos Efectivos</span>
            <h3 style={{ fontSize: '26px', fontWeight: 800, margin: '8px 0', color: 'var(--cafe-deep)' }}>
              {formatearCentavosABs(metricas.totalVentasCentavos)}
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--cafe-suave)' }}>
              Total recaudado en ventas cobradas
            </p>
          </div>

          <div className="panel-modulo-tarjeta" style={{ borderLeft: '4px solid var(--fucsia-accion)' }}>
            <span className="modulo-tag">Transacciones</span>
            <h3 style={{ fontSize: '26px', fontWeight: 800, margin: '8px 0', color: 'var(--cafe-deep)' }}>
              {metricas.ventasRealizadasCount}
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--cafe-suave)' }}>
              Tickets cerrados exitosamente
            </p>
          </div>

          <div className="panel-modulo-tarjeta" style={{ borderLeft: '4px solid #1971c2' }}>
            <span className="modulo-tag">Consumo Promedio</span>
            <h3 style={{ fontSize: '26px', fontWeight: 800, margin: '8px 0', color: 'var(--cafe-deep)' }}>
              {formatearCentavosABs(metricas.ticketPromedioCentavos)}
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--cafe-suave)' }}>
              Promedio por ticket cobrado
            </p>
          </div>
        </div>

        {/* Gráfico de Horas Pico (Ventas por Franja Horaria) */}
        <div className="panel-card-form" style={{ maxWidth: '100%', marginBottom: '32px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--cafe-deep)' }}>
              Horas Pico de Atención
            </h2>
            <p style={{ fontSize: '13px', margin: 0, color: 'var(--cafe-suave)' }}>
              Distribución de volumen de ventas según la hora de cobro en caja (08:00 a 22:00 hora Bolivia).
            </p>
          </div>

          {metricas.ventasRealizadasCount === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px', color: 'var(--cafe-suave)' }}>
              No hay ventas realizadas registradas en este período para graficar horas pico.
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '180px', paddingTop: '20px', paddingBottom: '10px', overflowX: 'auto' }}>
              {metricas.horasPico
                .filter((h) => h.hora >= 8 && h.hora <= 22)
                .map((hp) => {
                  const alturaPct = hp.cantidad > 0 ? Math.max(12, Math.round((hp.cantidad / maxVentasHora) * 100)) : 4;
                  return (
                    <div key={hp.hora} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: '36px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: hp.cantidad > 0 ? 'var(--fucsia-accion)' : 'transparent', marginBottom: '4px' }}>
                        {hp.cantidad > 0 ? hp.cantidad : ''}
                      </div>
                      <div
                        style={{
                          width: '100%',
                          maxWidth: '28px',
                          height: `${alturaPct}%`,
                          background: hp.cantidad > 0 ? 'var(--fucsia-accion)' : 'var(--linea)',
                          borderRadius: '6px 6px 2px 2px',
                          transition: 'height 0.3s ease',
                        }}
                        title={`${hp.etiqueta}: ${hp.cantidad} ventas (${formatearCentavosABs(hp.totalCentavos)})`}
                      />
                      <span style={{ fontSize: '11px', color: 'var(--cafe-suave)', marginTop: '8px' }}>
                        {hp.hora}h
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Ranking de Productos Más Vendidos */}
        <div>
          <div style={{ marginBottom: '14px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--cafe-deep)' }}>
              Ranking de Productos Más Vendidos
            </h2>
            <p style={{ fontSize: '13px', margin: 0, color: 'var(--cafe-suave)' }}>
              Top 10 productos con mayor cantidad de unidades vendidas en transacciones realizadas.
            </p>
          </div>

          <div className="panel-tabla-contenedor">
            <table className="panel-tabla">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>#</th>
                  <th>Producto</th>
                  <th style={{ textAlign: 'right' }}>Unidades Vendidas</th>
                  <th style={{ textAlign: 'right' }}>Total Facturado</th>
                </tr>
              </thead>
              <tbody>
                {metricas.rankingProductos.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '36px', color: 'var(--cafe-suave)' }}>
                      No se han registrado ventas de productos en este período.
                    </td>
                  </tr>
                ) : (
                  metricas.rankingProductos.map((p, index) => (
                    <tr key={p.productoId || p.nombre}>
                      <td style={{ fontWeight: 700, color: index < 3 ? 'var(--fucsia-accion)' : 'var(--cafe-suave)' }}>
                        #{index + 1}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--cafe-deep)' }}>
                        {p.nombre}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>
                        {p.unidadesVendidas} uds.
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--fucsia-accion)' }}>
                        {formatearCentavosABs(p.totalCentavos)}
                      </td>
                    </tr>
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

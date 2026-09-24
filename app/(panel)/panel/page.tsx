import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { obtenerSesionServidor } from '@/lib/auth/sesion';
import { puede } from '@/lib/permisos';
import { cerrarSesionAction } from '@/app/(panel)/panel/acciones';
import BotonPruebaAutorizacion from '@/components/panel/BotonPruebaAutorizacion';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Panel de Gestión | Dolce Florencia',
};

export default async function PanelDashboardPage() {
  const sesion = await obtenerSesionServidor();

  if (!sesion) {
    redirect('/panel/login');
  }

  const { usuario } = sesion;
  const esAdmin = usuario.rol === 'ADMIN';

  return (
    <div className="panel-layout-wrap">
      {/* Barra superior del panel */}
      <header className="panel-topbar">
        <div className="wrap panel-topbar-inner">
          <div className="panel-marca">
            <span className="panel-marca-icono" aria-hidden="true">DF</span>
            <div>
              <span className="panel-marca-nombre">Dolce Florencia</span>
              <span className="panel-marca-sub">Panel de Personal</span>
            </div>
          </div>

          <div className="panel-usuario-info">
            <div className="panel-usuario-texto">
              <span className="panel-usuario-nombre">{usuario.nombre}</span>
              <span className={`badge-rol ${esAdmin ? 'badge-admin' : 'badge-mesero'}`}>
                {usuario.rol}
              </span>
            </div>

            <form action={cerrarSesionAction}>
              <button type="submit" className="btn-cerrar-sesion" title="Cerrar sesión activa">
                Salir ↗
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Contenido principal del panel */}
      <main className="wrap panel-principal">
        <div className="panel-bienvenida">
          <span className="eyebrow">Sesión Activa</span>
          <h1 className="panel-titulo">Hola, {usuario.nombre.split(' ')[0]}</h1>
          <p className="panel-subtitulo">
            Bienvenido al sistema de gestión de Dolce Florencia. Selecciona un módulo para comenzar.
          </p>
        </div>

        {/* Módulos accesibles según rol */}
        <section className="panel-modulos-grid">
          {puede(usuario.rol, 'mesas.ver') && (
            <div className="panel-modulo-tarjeta">
              <span className="modulo-tag">Servicio</span>
              <h2 className="modulo-titulo">Salón & Mesas</h2>
              <p className="modulo-desc">
                Estado en vivo de mesas y cuentas abiertas en la Barra.
              </p>
              <span className="modulo-estado-fase">Hito 3</span>
            </div>
          )}

          {puede(usuario.rol, 'pedidos.gestionar') && (
            <div className="panel-modulo-tarjeta">
              <span className="modulo-tag">Solicitudes</span>
              <h2 className="modulo-titulo">Pedidos Web</h2>
              <p className="modulo-desc">
                Bandeja de pedidos para confirmar, cotizar y acordar retiro o entrega.
              </p>
              <span className="modulo-estado-fase">Hito 2</span>
            </div>
          )}

          {puede(usuario.rol, 'reservas.gestionar') && (
            <div className="panel-modulo-tarjeta">
              <span className="modulo-tag">Atención</span>
              <h2 className="modulo-titulo">Reservas & Eventos</h2>
              <p className="modulo-desc">
                Asignación de mesas, confirmación de visitas y eventos pet-friendly.
              </p>
              <span className="modulo-estado-fase">Hito 2</span>
            </div>
          )}

          {puede(usuario.rol, 'ventas.registrar') && (
            <div className="panel-modulo-tarjeta">
              <span className="modulo-tag">Caja</span>
              <h2 className="modulo-titulo">Ventas & Cobros</h2>
              <p className="modulo-desc">
                Registro de consumos y cobro en caja con efectivo, QR o transferencia.
              </p>
              <span className="modulo-estado-fase">Hito 3</span>
            </div>
          )}

          {puede(usuario.rol, 'dashboard.ver') && (
            <div className="panel-modulo-tarjeta tarjeta-admin">
              <span className="modulo-tag">Exclusivo Admin</span>
              <h2 className="modulo-titulo">Métricas & Dashboard</h2>
              <p className="modulo-desc">
                Ventas realizadas, ticket promedio, horas pico y ranking de productos.
              </p>
              <span className="modulo-estado-fase">Hito 4</span>
            </div>
          )}

          {puede(usuario.rol, 'productos.gestionar') && (
            <div className="panel-modulo-tarjeta tarjeta-admin">
              <span className="modulo-tag">Exclusivo Admin</span>
              <h2 className="modulo-titulo">Catálogo de Productos</h2>
              <p className="modulo-desc">
                Gestión de menú, precios en centavos, fotos y modelos 3D AR.
              </p>
              <span className="modulo-estado-fase">Hito 4</span>
            </div>
          )}

          {puede(usuario.rol, 'dias.bloquear') && (
            <div className="panel-modulo-tarjeta tarjeta-admin">
              <span className="modulo-tag">Exclusivo Admin</span>
              <h2 className="modulo-titulo">Calendario & Bloqueos</h2>
              <p className="modulo-desc">
                Bloqueo manual de días y visualización de cierres por eventos.
              </p>
              <span className="modulo-estado-fase">Hito 2</span>
            </div>
          )}
        </section>

        {/* TODO: eliminar antes del despliegue */}
        {/* Componente interactivo para pruebas de autorización en servidor (solo desarrollo / testing) */}
        {process.env.NODE_ENV !== 'production' && (
          <section style={{ marginTop: '40px' }}>
            <BotonPruebaAutorizacion />
          </section>
        )}
      </main>
    </div>
  );
}

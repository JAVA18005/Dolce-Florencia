import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { obtenerSesionServidor } from '@/lib/auth/sesion';
import { puede } from '@/lib/permisos';
import BotonPruebaAutorizacion from '@/components/panel/BotonPruebaAutorizacion';
import PanelTopbar from '@/components/panel/PanelTopbar';
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

  if (usuario.debeCambiarPassword) {
    redirect('/panel/cambiar-password');
  }

  return (
    <div className="panel-layout-wrap">
      <PanelTopbar usuario={usuario} rutaActual="/panel" />

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
          {puede(usuario.rol, 'ventas.registrar') && (
            <Link href="/panel/ventas" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="panel-modulo-tarjeta">
                <span className="modulo-tag">Servicio & Caja</span>
                <h2 className="modulo-titulo">Ventas & Comandas</h2>
                <p className="modulo-desc">
                  Apertura de comandas por mesa, mostrador, adición de consumos y cobro en caja.
                </p>
                <span className="modulo-estado-fase" style={{ background: '#d3f9d8', color: '#2b8a3e' }}>
                  Disponible ↗
                </span>
              </div>
            </Link>
          )}

          {puede(usuario.rol, 'pedidos.gestionar') && (
            <Link href="/panel/pedidos" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="panel-modulo-tarjeta">
                <span className="modulo-tag">Solicitudes</span>
                <h2 className="modulo-titulo">Pedidos Web</h2>
                <p className="modulo-desc">
                  Bandeja de pedidos para confirmar, cotizar y acordar retiro o entrega.
                </p>
                <span className="modulo-estado-fase" style={{ background: '#d3f9d8', color: '#2b8a3e' }}>
                  Disponible ↗
                </span>
              </div>
            </Link>
          )}

          {puede(usuario.rol, 'reservas.gestionar') && (
            <Link href="/panel/reservas" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="panel-modulo-tarjeta">
                <span className="modulo-tag">Atención</span>
                <h2 className="modulo-titulo">Reservas de Mesa</h2>
                <p className="modulo-desc">
                  Asignación de mesas, confirmación de visitas, atención pet-friendly y no-shows.
                </p>
                <span className="modulo-estado-fase" style={{ background: '#d3f9d8', color: '#2b8a3e' }}>
                  Disponible ↗
                </span>
              </div>
            </Link>
          )}

          {puede(usuario.rol, 'eventos.confirmar') && (
            <Link href="/panel/eventos" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="panel-modulo-tarjeta tarjeta-admin">
                <span className="modulo-tag">Exclusivo Admin</span>
                <h2 className="modulo-titulo">Eventos & Cierres</h2>
                <p className="modulo-desc">
                  Aprobación de celebraciones en local o entrega y control de cierres totales.
                </p>
                <span className="modulo-estado-fase" style={{ background: '#d3f9d8', color: '#2b8a3e' }}>
                  Disponible ↗
                </span>
              </div>
            </Link>
          )}

          {puede(usuario.rol, 'mesas.ver') && (
            <Link href="/panel/mesas" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="panel-modulo-tarjeta">
                <span className="modulo-tag">Servicio</span>
                <h2 className="modulo-titulo">Salón & Mesas</h2>
                <p className="modulo-desc">
                  Estado en vivo de mesas y cuentas abiertas en la Barra.
                </p>
                <span className="modulo-estado-fase" style={{ background: '#d3f9d8', color: '#2b8a3e' }}>
                  Disponible ↗
                </span>
              </div>
            </Link>
          )}

          {puede(usuario.rol, 'dias.bloquear') && (
            <Link href="/panel/calendario" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="panel-modulo-tarjeta tarjeta-admin">
                <span className="modulo-tag">Exclusivo Admin</span>
                <h2 className="modulo-titulo">Calendario & Bloqueos</h2>
                <p className="modulo-desc">
                  Bloqueo manual de días y visualización de cierres por eventos.
                </p>
                <span className="modulo-estado-fase" style={{ background: '#d3f9d8', color: '#2b8a3e' }}>
                  Disponible ↗
                </span>
              </div>
            </Link>
          )}

          {puede(usuario.rol, 'usuarios.gestionar') && (
            <Link href="/panel/usuarios" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="panel-modulo-tarjeta tarjeta-admin">
                <span className="modulo-tag">Exclusivo Admin</span>
                <h2 className="modulo-titulo">Personal & Accesos</h2>
                <p className="modulo-desc">
                  Gestión de usuarios, asignación de roles y control de credenciales.
                </p>
                <span className="modulo-estado-fase" style={{ background: '#d3f9d8', color: '#2b8a3e' }}>
                  Disponible ↗
                </span>
              </div>
            </Link>
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

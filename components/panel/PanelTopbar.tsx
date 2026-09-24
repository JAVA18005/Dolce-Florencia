// components/panel/PanelTopbar.tsx — Barra superior de navegación unificada para el personal.

import Link from 'next/link';
import { Rol } from '@prisma/client';
import { cerrarSesionAction } from '@/app/(panel)/panel/acciones';
import { puede } from '@/lib/permisos';

interface PanelTopbarProps {
  usuario: {
    id: string;
    nombre: string;
    rol: Rol;
  };
  rutaActual?: string;
}

export default function PanelTopbar({ usuario, rutaActual }: PanelTopbarProps) {
  const esAdmin = usuario.rol === Rol.ADMIN;

  return (
    <header className="panel-topbar">
      <div className="wrap panel-topbar-inner">
        <div className="panel-marca">
          <Link href="/panel" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <span className="panel-marca-icono" aria-hidden="true">DF</span>
            <div>
              <span className="panel-marca-nombre">Dolce Florencia</span>
              <span className="panel-marca-sub">Panel de Personal</span>
            </div>
          </Link>
        </div>

        <nav className="panel-nav" aria-label="Navegación del panel">
          <Link
            href="/panel"
            className={`panel-nav-link ${rutaActual === '/panel' ? 'activo' : ''}`}
          >
            Inicio
          </Link>

          {puede(usuario.rol, 'dashboard.ver') && (
            <Link
              href="/panel/dashboard"
              className={`panel-nav-link ${rutaActual?.startsWith('/panel/dashboard') ? 'activo' : ''}`}
            >
              Dashboard
            </Link>
          )}

          {puede(usuario.rol, 'ventas.registrar') && (
            <Link
              href="/panel/ventas"
              className={`panel-nav-link ${rutaActual?.startsWith('/panel/ventas') ? 'activo' : ''}`}
            >
              Ventas & Caja
            </Link>
          )}

          {puede(usuario.rol, 'pedidos.gestionar') && (
            <Link
              href="/panel/pedidos"
              className={`panel-nav-link ${rutaActual?.startsWith('/panel/pedidos') ? 'activo' : ''}`}
            >
              Pedidos
            </Link>
          )}

          {puede(usuario.rol, 'reservas.gestionar') && (
            <Link
              href="/panel/reservas"
              className={`panel-nav-link ${rutaActual?.startsWith('/panel/reservas') ? 'activo' : ''}`}
            >
              Reservas
            </Link>
          )}

          {puede(usuario.rol, 'eventos.confirmar') && (
            <Link
              href="/panel/eventos"
              className={`panel-nav-link ${rutaActual?.startsWith('/panel/eventos') ? 'activo' : ''}`}
            >
              Eventos
            </Link>
          )}

          {puede(usuario.rol, 'mesas.ver') && (
            <Link
              href="/panel/mesas"
              className={`panel-nav-link ${rutaActual?.startsWith('/panel/mesas') ? 'activo' : ''}`}
            >
              Mesas
            </Link>
          )}

          {puede(usuario.rol, 'dias.bloquear') && (
            <Link
              href="/panel/calendario"
              className={`panel-nav-link ${rutaActual?.startsWith('/panel/calendario') ? 'activo' : ''}`}
            >
              Calendario
            </Link>
          )}

          {puede(usuario.rol, 'productos.gestionar') && (
            <Link
              href="/panel/productos"
              className={`panel-nav-link ${rutaActual?.startsWith('/panel/productos') ? 'activo' : ''}`}
            >
              Productos
            </Link>
          )}

          {puede(usuario.rol, 'usuarios.gestionar') && (
            <Link
              href="/panel/usuarios"
              className={`panel-nav-link ${rutaActual?.startsWith('/panel/usuarios') ? 'activo' : ''}`}
            >
              Personal
            </Link>
          )}

          <Link
            href="/panel/cuenta"
            className={`panel-nav-link ${rutaActual?.startsWith('/panel/cuenta') ? 'activo' : ''}`}
          >
            Mi Cuenta
          </Link>
        </nav>

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
  );
}

import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { exigirSesionServidor } from '@/lib/auth/sesion';
import { listarCategoriasAdmin, listarProductosAdmin } from '@/lib/servicios/productos';
import PanelTopbar from '@/components/panel/PanelTopbar';
import FilaProducto from '@/components/panel/FilaProducto';
import FormularioProducto from '@/components/panel/FormularioProducto';
import FormularioCategoria from '@/components/panel/FormularioCategoria';

export const metadata: Metadata = {
  title: 'Catálogo de Productos | Panel Dolce Florencia',
};

export default async function GestionProductosPage() {
  let sesion;
  try {
    sesion = await exigirSesionServidor('productos.gestionar');
  } catch {
    redirect('/panel');
  }

  const { usuario } = sesion;

  if (usuario.debeCambiarPassword) {
    redirect('/panel/cambiar-password');
  }

  const [categorias, productos] = await Promise.all([
    listarCategoriasAdmin(),
    listarProductosAdmin({ incluirInactivos: true }),
  ]);

  const productosActivosCount = productos.filter((p) => p.activo).length;
  const productosArchivadosCount = productos.filter((p) => !p.activo).length;

  return (
    <div className="panel-layout-wrap">
      <PanelTopbar usuario={usuario} rutaActual="/panel/productos" />

      <main className="wrap panel-principal">
        <div className="panel-cabecera-modulo">
          <div>
            <span className="eyebrow" style={{ color: 'var(--fucsia-accion)' }}>Exclusivo Administrador</span>
            <h1 className="panel-titulo">Catálogo de Productos & Menú</h1>
            <p className="panel-subtitulo">
              Gestiona el catálogo de pastelería, cafetería y celebraciones. Los productos no se eliminan físicamente para preservar el historial de ventas; se archivan para ocultarlos del menú público.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--cafe-suave)' }}>
              <strong>{productosActivosCount}</strong> activos · <strong>{productosArchivadosCount}</strong> archivados
            </span>
          </div>
        </div>

        {/* Acciones de Creación */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
          <FormularioProducto categorias={categorias} />
          <FormularioCategoria />
        </div>

        {/* Tabla de Productos */}
        <div className="panel-tabla-contenedor">
          <table className="panel-tabla">
            <thead>
              <tr>
                <th>Producto / Descripción</th>
                <th>Categoría</th>
                <th>Precio Actual</th>
                <th>Estado & Historial</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--cafe-suave)' }}>
                    No hay productos registrados en el catálogo.
                  </td>
                </tr>
              ) : (
                productos.map((prod) => (
                  <FilaProducto
                    key={prod.id}
                    producto={prod}
                    categorias={categorias}
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

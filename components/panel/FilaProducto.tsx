'use client';

import { useState } from 'react';
import { archivarProductoAction, desarchivarProductoAction, editarProductoAction } from '@/app/(panel)/panel/productos/acciones';
import { formatearCentavosABs } from '@/lib/dinero';

interface Categoria {
  id: string;
  nombre: string;
}

interface Props {
  producto: any;
  categorias: Categoria[];
}

export default function FilaProducto({ producto, categorias }: Props) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);

  // Campos de edición
  const [nombre, setNombre] = useState(producto.nombre);
  const [categoriaId, setCategoriaId] = useState(producto.categoriaId);
  const [precioBs, setPrecioBs] = useState(
    producto.precioCentavos !== null ? (producto.precioCentavos / 100).toFixed(2) : ''
  );
  const [descripcion, setDescripcion] = useState(producto.descripcion || '');
  const [imagenUrl, setImagenUrl] = useState(producto.imagenUrl || '');
  const [modeloArUrl, setModeloArUrl] = useState(producto.modeloArUrl || '');
  const [modeloArIosUrl, setModeloArIosUrl] = useState(producto.modeloArIosUrl || '');
  const [aptoMascotas, setAptoMascotas] = useState(producto.aptoMascotas);

  const handleArchivar = async () => {
    if (!confirm(`¿Archivar el producto "${producto.nombre}"? Ya no aparecerá en el menú público pero se preservará su historial de ventas.`)) {
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const res = await archivarProductoAction(producto.id);
      if (res.error) setError(res.error);
    } catch (e: any) {
      setError(e.message || 'Error al archivar');
    } finally {
      setCargando(false);
    }
  };

  const handleReactivar = async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await desarchivarProductoAction(producto.id);
      if (res.error) setError(res.error);
    } catch (e: any) {
      setError(e.message || 'Error al reactivar');
    } finally {
      setCargando(false);
    }
  };

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError(null);

    let precioCentavos: number | null = null;
    if (precioBs.trim()) {
      const num = Math.round(parseFloat(precioBs) * 100);
      if (isNaN(num) || num < 0) {
        alert('Ingresa un precio válido en Bs.');
        setCargando(false);
        return;
      }
      precioCentavos = num;
    }

    try {
      const res = await editarProductoAction(producto.id, {
        nombre,
        categoriaId,
        precioCentavos,
        descripcion: descripcion || null,
        imagenUrl: imagenUrl || null,
        modeloArUrl: modeloArUrl || null,
        modeloArIosUrl: modeloArIosUrl || null,
        aptoMascotas,
      });

      if (res.error) {
        setError(res.error);
      } else {
        setEditando(false);
      }
    } catch (e: any) {
      setError(e.message || 'Error al guardar');
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      <tr style={{ opacity: producto.activo ? 1 : 0.65 }}>
        <td>
          <div style={{ fontWeight: 600, color: 'var(--cafe-deep)' }}>
            {producto.nombre}
          </div>
          {producto.descripcion && (
            <div style={{ fontSize: '12px', color: 'var(--cafe-suave)', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {producto.descripcion}
            </div>
          )}
          {error && <div style={{ color: '#c92a2a', fontSize: '11px', marginTop: '4px' }}>{error}</div>}
        </td>

        <td>
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--cafe)' }}>
            {producto.categoria.nombre}
          </span>
          {producto.aptoMascotas && (
            <span style={{ display: 'inline-block', marginLeft: '6px', fontSize: '11px', background: '#e7f5ff', color: '#1971c2', padding: '1px 6px', borderRadius: '4px' }}>
              🐾 Pet
            </span>
          )}
        </td>

        <td>
          <div style={{ fontWeight: 700, color: 'var(--fucsia-accion)' }}>
            {producto.precioCentavos !== null ? formatearCentavosABs(producto.precioCentavos) : 'A consultar'}
          </div>
        </td>

        <td>
          <span className={`badge-estado ${producto.activo ? 'confirmada' : 'cancelada'}`}>
            {producto.activo ? 'Activo' : 'Archivado'}
          </span>
          <div style={{ fontSize: '11px', color: 'var(--cafe-suave)', marginTop: '4px' }}>
            {producto._count.ventaItems} ventas registradas
          </div>
        </td>

        <td>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setEditando(!editando)}
              disabled={cargando}
              className="btn-accion-sm"
            >
              {editando ? 'Cerrar' : 'Editar'}
            </button>

            {producto.activo ? (
              <button
                type="button"
                onClick={handleArchivar}
                disabled={cargando}
                className="btn-accion-sm btn-peligro"
                title="Archiva el producto sin borrar el historial"
              >
                Archivar
              </button>
            ) : (
              <button
                type="button"
                onClick={handleReactivar}
                disabled={cargando}
                className="btn-accion-sm btn-exito"
              >
                Reactivar
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Formulario Desplegable de Edición */}
      {editando && (
        <tr>
          <td colSpan={5} style={{ background: '#fdf8f6', padding: '16px 20px', borderLeft: '4px solid var(--fucsia-accion)' }}>
            <form onSubmit={handleGuardarEdicion}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--cafe)', marginBottom: '4px' }}>
                    Nombre del Producto:
                  </label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="field-input"
                    style={{ width: '100%', fontSize: '13px', padding: '6px 10px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--cafe)', marginBottom: '4px' }}>
                    Categoría:
                  </label>
                  <select
                    value={categoriaId}
                    onChange={(e) => setCategoriaId(e.target.value)}
                    className="field-input"
                    style={{ width: '100%', fontSize: '13px', padding: '6px 10px' }}
                  >
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--cafe)', marginBottom: '4px' }}>
                    Precio en Bs (dejar vacío = consultar):
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={precioBs}
                    onChange={(e) => setPrecioBs(e.target.value)}
                    placeholder="Ej. 35.00"
                    className="field-input"
                    style={{ width: '100%', fontSize: '13px', padding: '6px 10px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--cafe)', marginBottom: '4px' }}>
                    Ruta / URL de Imagen (opcional):
                  </label>
                  <input
                    type="text"
                    value={imagenUrl}
                    onChange={(e) => setImagenUrl(e.target.value)}
                    placeholder="Ej. /productos/red-velvet.jpg o URL externa"
                    className="field-input"
                    style={{ width: '100%', fontSize: '13px', padding: '6px 10px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--cafe)', marginBottom: '4px' }}>
                    Modelo 3D AR (.glb) (opcional):
                  </label>
                  <input
                    type="text"
                    value={modeloArUrl}
                    onChange={(e) => setModeloArUrl(e.target.value)}
                    placeholder="Ej. /models/red-velvet.glb"
                    className="field-input"
                    style={{ width: '100%', fontSize: '13px', padding: '6px 10px' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', paddingTop: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={aptoMascotas}
                      onChange={(e) => setAptoMascotas(e.target.checked)}
                    />
                    Apto para mascotas 🐾
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--cafe)', marginBottom: '4px' }}>
                  Descripción:
                </label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={2}
                  className="field-input"
                  style={{ width: '100%', fontSize: '13px', padding: '6px 10px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" disabled={cargando} className="btn-accion-sm btn-exito">
                  {cargando ? 'Guardando...' : 'Guardar Cambios'}
                </button>
                <button type="button" onClick={() => setEditando(false)} className="btn-accion-sm">
                  Cancelar
                </button>
              </div>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}

'use client';

import { useState } from 'react';
import { crearProductoAction } from '@/app/(panel)/panel/productos/acciones';

interface Categoria {
  id: string;
  nombre: string;
}

interface Props {
  categorias: Categoria[];
}

export default function FormularioProducto({ categorias }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  const [nombre, setNombre] = useState('');
  const [categoriaId, setCategoriaId] = useState(categorias[0]?.id || '');
  const [precioBs, setPrecioBs] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [modeloArUrl, setModeloArUrl] = useState('');
  const [modeloArIosUrl, setModeloArIosUrl] = useState('');
  const [aptoMascotas, setAptoMascotas] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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
      const res = await crearProductoAction({
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
        setExito(true);
        setNombre('');
        setPrecioBs('');
        setDescripcion('');
        setImagenUrl('');
        setModeloArUrl('');
        setModeloArIosUrl('');
        setAptoMascotas(false);
        setTimeout(() => {
          setExito(false);
          setAbierto(false);
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear producto');
    } finally {
      setCargando(false);
    }
  };

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="btn btn-primario"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
      >
        <span>+</span> Nuevo Producto
      </button>
    );
  }

  return (
    <div className="panel-card-form" style={{ marginBottom: '28px', maxWidth: '820px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--cafe-deep)' }}>
          Crear Nuevo Producto en Catálogo
        </h2>
        <button type="button" onClick={() => setAbierto(false)} className="btn-accion-sm">
          Cerrar
        </button>
      </div>

      {error && <div className="alerta-panel alerta-error">{error}</div>}
      {exito && <div className="alerta-panel alerta-exito">¡Producto creado exitosamente!</div>}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--cafe)', marginBottom: '4px' }}>
              Nombre del Producto *
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Tarta de Frutilla con Crema"
              className="field-input"
              style={{ width: '100%', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--cafe)', marginBottom: '4px' }}>
              Categoría *
            </label>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              required
              className="field-input"
              style={{ width: '100%', fontSize: '13px' }}
            >
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--cafe)', marginBottom: '4px' }}>
              Precio en Bs (opcional, vacío = a consultar)
            </label>
            <input
              type="number"
              step="0.50"
              min="0"
              value={precioBs}
              onChange={(e) => setPrecioBs(e.target.value)}
              placeholder="Ej. 28.00"
              className="field-input"
              style={{ width: '100%', fontSize: '13px' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--cafe)', marginBottom: '4px' }}>
              Ruta / URL de Imagen (opcional)
            </label>
            <input
              type="text"
              value={imagenUrl}
              onChange={(e) => setImagenUrl(e.target.value)}
              placeholder="Ej. /productos/frutilla.jpg"
              className="field-input"
              style={{ width: '100%', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--cafe)', marginBottom: '4px' }}>
              Modelo AR 3D (.glb) (opcional)
            </label>
            <input
              type="text"
              value={modeloArUrl}
              onChange={(e) => setModeloArUrl(e.target.value)}
              placeholder="Ej. /models/tarta.glb"
              className="field-input"
              style={{ width: '100%', fontSize: '13px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', paddingTop: '18px' }}>
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

        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--cafe)', marginBottom: '4px' }}>
            Descripción del Producto
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={2}
            placeholder="Detalles sobre porciones, ingredientes especiales o alérgenos..."
            className="field-input"
            style={{ width: '100%', fontSize: '13px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="submit" disabled={cargando} className="btn btn-primario">
            {cargando ? 'Guardando...' : 'Crear Producto'}
          </button>
          <button type="button" onClick={() => setAbierto(false)} className="btn btn-secundario">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

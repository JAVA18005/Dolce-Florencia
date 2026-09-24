'use client';

import { useState } from 'react';
import { crearCategoriaAction } from '@/app/(panel)/panel/productos/acciones';

export default function FormularioCategoria() {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    setCargando(true);
    setError(null);
    try {
      const res = await crearCategoriaAction({ nombre });
      if (res.error) {
        setError(res.error);
      } else {
        setNombre('');
        setAbierto(false);
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear categoría');
    } finally {
      setCargando(false);
    }
  };

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="btn btn-secundario"
      >
        + Nueva Categoría
      </button>
    );
  }

  return (
    <div className="panel-card-form" style={{ marginBottom: '20px', maxWidth: '480px' }}>
      <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 12px 0', color: 'var(--cafe-deep)' }}>
        Añadir Nueva Categoría
      </h3>

      {error && <div className="alerta-panel alerta-error">{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <input
          type="text"
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej. Postres Sin Azúcar"
          className="field-input"
          style={{ flex: 1, fontSize: '13px', padding: '6px 10px' }}
        />
        <button type="submit" disabled={cargando} className="btn-accion-sm btn-exito">
          {cargando ? 'Creando...' : 'Crear'}
        </button>
        <button type="button" onClick={() => setAbierto(false)} className="btn-accion-sm">
          Cancelar
        </button>
      </form>
    </div>
  );
}

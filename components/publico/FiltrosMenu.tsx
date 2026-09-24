'use client';

import { useState, useMemo } from 'react';
import TarjetaProducto, { ProductoDTO } from './TarjetaProducto';

interface FiltrosMenuProps {
  categorias: { id: string; nombre: string; orden: number }[];
  productos: ProductoDTO[];
}

export default function FiltrosMenu({ categorias, productos }: FiltrosMenuProps) {
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('Todos');

  const nombresFiltro = useMemo(() => {
    return ['Todos', ...categorias.map((c) => c.nombre)];
  }, [categorias]);

  const productosFiltrados = useMemo(() => {
    if (categoriaSeleccionada === 'Todos') {
      return productos;
    }
    return productos.filter(
      (p) => p.categoria?.nombre === categoriaSeleccionada
    );
  }, [categoriaSeleccionada, productos]);

  return (
    <>
      <div className="filters" role="group" aria-label="Filtrar catálogo por categoría">
        {nombresFiltro.map((catNombre) => (
          <button
            key={catNombre}
            type="button"
            data-filter={catNombre}
            aria-pressed={categoriaSeleccionada === catNombre}
            onClick={() => setCategoriaSeleccionada(catNombre)}
          >
            {catNombre}
          </button>
        ))}
      </div>

      <p id="filter-status" className="sr-only" role="status">
        Mostrando {productosFiltrados.length} productos de {categoriaSeleccionada}
      </p>

      <div className="product-grid">
        {productosFiltrados.map((producto) => (
          <TarjetaProducto key={producto.id} producto={producto} />
        ))}
      </div>
    </>
  );
}

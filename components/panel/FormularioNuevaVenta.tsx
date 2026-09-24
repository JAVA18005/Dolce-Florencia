'use client';

import { useState } from 'react';
import { registrarVentaAction } from '@/app/(panel)/panel/ventas/acciones';
import { formatearCentavosABs } from '@/lib/dinero';

interface ProductoItem {
  id: string;
  nombre: string;
  precioCentavos: number | null;
  categoria?: { nombre: string } | null;
}

interface MesaItem {
  id: string;
  nombre: string;
  habilitada: boolean;
  permiteVariasCuentas: boolean;
  estadoDerivado: string;
  cuentasAbiertas: number;
}

interface Props {
  mesas: MesaItem[];
  productos: ProductoItem[];
}

export default function FormularioNuevaVenta({ mesas, productos }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [mesaId, setMesaId] = useState<string>('');
  const [itemsSeleccionados, setItemsSeleccionados] = useState<Record<string, number>>({});
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const mesasHabilitadas = mesas.filter((m) => m.habilitada);
  const mesaSeleccionada = mesas.find((m) => m.id === mesaId);

  const agregarProducto = (productoId: string) => {
    setItemsSeleccionados((prev) => ({
      ...prev,
      [productoId]: (prev[productoId] || 0) + 1,
    }));
  };

  const quitarProducto = (productoId: string) => {
    setItemsSeleccionados((prev) => {
      const actual = prev[productoId] || 0;
      if (actual <= 1) {
        const copia = { ...prev };
        delete copia[productoId];
        return copia;
      }
      return { ...prev, [productoId]: actual - 1 };
    });
  };

  const totalCalculadoCentavos = Object.entries(itemsSeleccionados).reduce(
    (acc, [pId, cant]) => {
      const prod = productos.find((p) => p.id === pId);
      return acc + (prod?.precioCentavos ?? 0) * cant;
    },
    0
  );

  const totalItemsCount = Object.values(itemsSeleccionados).reduce((a, b) => a + b, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalItemsCount === 0) {
      alert('Debes agregar al menos un producto a la comanda.');
      return;
    }

    setCargando(true);
    setError(null);
    setMensajeExito(null);

    const itemsPayload = Object.entries(itemsSeleccionados).map(([productoId, cantidad]) => ({
      productoId,
      cantidad,
    }));

    try {
      const res = await registrarVentaAction({
        mesaId: mesaId || null,
        items: itemsPayload,
      });

      if (res.error) {
        setError(res.error);
      } else {
        setMensajeExito(
          res.esAgregadoAExistente
            ? '¡Ítems agregados exitosamente a la comanda existente de la mesa!'
            : '¡Comanda / Venta registrada exitosamente!'
        );
        setItemsSeleccionados({});
        setMesaId('');
        setTimeout(() => {
          setMensajeExito(null);
          setAbierto(false);
        }, 1800);
      }
    } catch (err: any) {
      setError(err.message || 'Error al registrar venta');
    } finally {
      setCargando(false);
    }
  };

  if (!abierto) {
    return (
      <div style={{ marginBottom: '24px' }}>
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="btn btn-primario"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <span>+</span> Nueva Comanda / Venta
        </button>
      </div>
    );
  }

  return (
    <div className="panel-card-form" style={{ marginBottom: '28px', maxWidth: '820px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--cafe-deep)' }}>
          Registrar Nueva Venta / Comanda
        </h2>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="btn-accion-sm"
        >
          Cerrar
        </button>
      </div>

      {error && <div className="alerta-panel alerta-error">{error}</div>}
      {mensajeExito && <div className="alerta-panel alerta-exito">{mensajeExito}</div>}

      <form onSubmit={handleSubmit}>
        {/* Selector de Mesa */}
        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--cafe)', marginBottom: '6px' }}>
            Ubicación / Mesa:
          </label>
          <select
            value={mesaId}
            onChange={(e) => setMesaId(e.target.value)}
            className="field-input"
            style={{ width: '100%', maxWidth: '380px' }}
          >
            <option value="">Mostrador (Para Llevar / Sin Mesa)</option>
            {mesasHabilitadas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre} {m.permiteVariasCuentas ? `(Barra - ${m.cuentasAbiertas} cuentas)` : m.cuentasAbiertas > 0 ? '(Ocupada - Agregará ítems)' : `(${m.estadoDerivado})`}
              </option>
            ))}
          </select>

          {mesaSeleccionada && !mesaSeleccionada.permiteVariasCuentas && mesaSeleccionada.cuentasAbiertas > 0 && (
            <p style={{ fontSize: '12px', color: '#d9480f', marginTop: '6px', fontWeight: 500 }}>
              * Esta mesa ya tiene una comanda abierta. Los productos que agregues se sumarán a su cuenta actual.
            </p>
          )}
        </div>

        {/* Catálogo de Productos para Selección Rápida */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--cafe)', marginBottom: '8px' }}>
            Seleccionar Productos:
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '10px',
              maxHeight: '260px',
              overflowY: 'auto',
              border: '1px solid var(--linea)',
              borderRadius: '10px',
              padding: '12px',
              background: '#fff',
            }}
          >
            {productos.map((prod) => {
              const cant = itemsSeleccionados[prod.id] || 0;
              return (
                <div
                  key={prod.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: cant > 0 ? '1.5px solid var(--fucsia-accion)' : '1px solid var(--linea)',
                    background: cant > 0 ? '#fdf4f7' : '#fafafa',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cafe)' }}>
                    {prod.nombre}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--cafe-suave)' }}>
                      {prod.precioCentavos ? formatearCentavosABs(prod.precioCentavos) : 'Consultar'}
                    </span>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {cant > 0 && (
                        <button
                          type="button"
                          onClick={() => quitarProducto(prod.id)}
                          className="btn-accion-sm"
                          style={{ padding: '2px 8px' }}
                        >
                          -
                        </button>
                      )}
                      {cant > 0 && (
                        <span style={{ fontSize: '12px', fontWeight: 700, minWidth: '16px', textAlign: 'center' }}>
                          {cant}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => agregarProducto(prod.id)}
                        className="btn-accion-sm btn-exito"
                        style={{ padding: '2px 8px' }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resumen de la Comanda */}
        <div style={{ background: '#f7ede8', padding: '14px 18px', borderRadius: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--cafe-suave)' }}>Ítems a comandar: </span>
            <strong style={{ color: 'var(--cafe-deep)' }}>{totalItemsCount} unidades</strong>
          </div>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--cafe-suave)' }}>Total a sumar: </span>
            <strong style={{ fontSize: '18px', color: 'var(--fucsia-accion)', fontWeight: 700 }}>
              {formatearCentavosABs(totalCalculadoCentavos)}
            </strong>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="submit"
            disabled={cargando || totalItemsCount === 0}
            className="btn btn-primario"
          >
            {cargando ? 'Registrando...' : 'Registrar Comanda'}
          </button>
          <button
            type="button"
            onClick={() => setAbierto(false)}
            className="btn btn-secundario"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

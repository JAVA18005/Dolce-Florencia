'use client';

import { useState } from 'react';
import { MetodoPago, Rol } from '@prisma/client';
import { cobrarVentaAction, anularVentaAction } from '@/app/(panel)/panel/ventas/acciones';
import { formatearCentavosABs } from '@/lib/dinero';

interface Props {
  venta: any;
  rolUsuario: Rol;
}

export default function FilaVenta({ venta, rolUsuario }: Props) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrandoCobro, setMostrandoCobro] = useState(false);
  const [mostrandoAnular, setMostrandoAnular] = useState(false);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(MetodoPago.EFECTIVO);
  const [referenciaPago, setReferenciaPago] = useState('');
  const [motivoAnulacion, setMotivoAnulacion] = useState('');

  const esAdmin = rolUsuario === Rol.ADMIN;

  const handleCobrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError(null);
    try {
      const res = await cobrarVentaAction(venta.id, {
        metodoPago,
        referenciaPago: referenciaPago || null,
      });
      if (res.error) setError(res.error);
      if (res.exito) setMostrandoCobro(false);
    } catch (e: any) {
      setError(e.message || 'Error al cobrar');
    } finally {
      setCargando(false);
    }
  };

  const handleAnular = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivoAnulacion.trim()) {
      alert('Ingresa el motivo de la anulación');
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const res = await anularVentaAction(venta.id, motivoAnulacion);
      if (res.error) setError(res.error);
      if (res.exito) setMostrandoAnular(false);
    } catch (e: any) {
      setError(e.message || 'Error al anular');
    } finally {
      setCargando(false);
    }
  };

  const badgeEstadoClase = {
    PENDIENTE_COBRO: 'pendiente',
    REALIZADA: 'confirmada',
    ANULADA: 'cancelada',
  }[venta.estado as 'PENDIENTE_COBRO' | 'REALIZADA' | 'ANULADA'] || 'inactivo';

  return (
    <>
      <tr>
        <td>
          <div style={{ fontWeight: 600, color: 'var(--cafe-deep)' }}>
            Ticket #{venta.numero}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--cafe-suave)' }}>
            {new Date(venta.creadaEn).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
          </div>
          {error && (
            <div style={{ color: '#c92a2a', fontSize: '11px', marginTop: '4px' }}>
              {error}
            </div>
          )}
        </td>

        <td>
          <div style={{ fontWeight: 600 }}>
            {venta.mesa ? venta.mesa.nombre : venta.origen === 'PEDIDO_WEB' ? 'Pedido Web' : 'Mostrador'}
          </div>
          {venta.pedido && (
            <div style={{ fontSize: '11px', color: 'var(--cafe-suave)' }}>
              Web #{venta.pedido.codigo} ({venta.pedido.clienteNombre})
            </div>
          )}
          {venta.reserva && (
            <div style={{ fontSize: '11px', color: 'var(--cafe-suave)' }}>
              Reserva #{venta.reserva.codigo}
            </div>
          )}
        </td>

        <td>
          <div style={{ fontSize: '13px' }}>
            {venta.items.map((it: any) => (
              <div key={it.id}>
                {it.cantidad}x {it.nombre} <span style={{ color: 'var(--cafe-suave)' }}>({formatearCentavosABs(it.precioUnitarioCentavos)})</span>
              </div>
            ))}
          </div>
        </td>

        <td>
          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--fucsia-accion)' }}>
            {formatearCentavosABs(venta.totalCentavos)}
          </div>
          {venta.metodoPago && (
            <div style={{ fontSize: '11px', color: 'var(--cafe-suave)' }}>
              {venta.metodoPago} {venta.referenciaPago ? `(${venta.referenciaPago})` : ''}
            </div>
          )}
        </td>

        <td>
          <span className={`badge-estado ${badgeEstadoClase}`}>
            {venta.estado.replace('_', ' ')}
          </span>
          {venta.anuladaMotivo && (
            <div style={{ fontSize: '11px', color: '#c92a2a', marginTop: '4px' }}>
              Motivo: {venta.anuladaMotivo}
            </div>
          )}
        </td>

        <td>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {venta.estado === 'PENDIENTE_COBRO' && (
              <button
                type="button"
                onClick={() => setMostrandoCobro(!mostrandoCobro)}
                disabled={cargando}
                className="btn-accion-sm btn-exito"
              >
                Cobrar
              </button>
            )}

            {esAdmin && venta.estado !== 'ANULADA' && (
              <button
                type="button"
                onClick={() => setMostrandoAnular(!mostrandoAnular)}
                disabled={cargando}
                className="btn-accion-sm btn-peligro"
              >
                Anular
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Formulario desplegable para cobrar */}
      {mostrandoCobro && (
        <tr>
          <td colSpan={6} style={{ background: '#f4fbf5', padding: '14px 18px', borderLeft: '4px solid #2b8a3e' }}>
            <form onSubmit={handleCobrar} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#2b8a3e' }}>
                Cobrar {formatearCentavosABs(venta.totalCentavos)}:
              </span>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
                className="field-input"
                style={{ width: '150px', padding: '6px 10px', fontSize: '13px' }}
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="QR">Pago QR</option>
                <option value="TRANSFERENCIA">Transferencia</option>
              </select>
              <input
                type="text"
                value={referenciaPago}
                onChange={(e) => setReferenciaPago(e.target.value)}
                placeholder="Nº comprobante / ref. (opcional)"
                className="field-input"
                style={{ flex: 1, minWidth: '180px', padding: '6px 10px', fontSize: '13px' }}
              />
              <button type="submit" disabled={cargando} className="btn-accion-sm btn-exito">
                {cargando ? 'Procesando...' : 'Confirmar Cobro'}
              </button>
              <button type="button" onClick={() => setMostrandoCobro(false)} className="btn-accion-sm">
                Cancelar
              </button>
            </form>
          </td>
        </tr>
      )}

      {/* Formulario desplegable para anular */}
      {mostrandoAnular && (
        <tr>
          <td colSpan={6} style={{ background: '#fff5f5', padding: '14px 18px', borderLeft: '4px solid #c92a2a' }}>
            <form onSubmit={handleAnular} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#c92a2a' }}>
                Motivo de anulación (obligatorio):
              </span>
              <input
                type="text"
                value={motivoAnulacion}
                onChange={(e) => setMotivoAnulacion(e.target.value)}
                placeholder="Ej. Error en digitación de pedido o devolución"
                required
                className="field-input"
                style={{ flex: 1, minWidth: '220px', padding: '6px 10px', fontSize: '13px' }}
              />
              <button type="submit" disabled={cargando} className="btn-accion-sm btn-peligro">
                {cargando ? 'Anulando...' : 'Confirmar Anulación'}
              </button>
              <button type="button" onClick={() => setMostrandoAnular(false)} className="btn-accion-sm">
                Cancelar
              </button>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}

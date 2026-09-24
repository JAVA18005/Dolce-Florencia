'use client';

import { useState } from 'react';
import {
  confirmarPedidoAction,
  rechazarPedidoAction,
  cancelarPedidoAction,
} from '@/app/(panel)/panel/pedidos/acciones';
import { generarEnlaceWhatsApp } from '@/lib/whatsapp';

interface Props {
  pedido: any;
}

export default function FilaPedido({ pedido }: Props) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advertencia, setAdvertencia] = useState<string | null>(null);
  const [mostrandoConfirmar, setMostrandoConfirmar] = useState(false);
  const [mostrandoRechazar, setMostrandoRechazar] = useState(false);
  const [precioBs, setPrecioBs] = useState('');
  const [motivoRechazo, setMotivoRechazo] = useState('');

  const fechaStr = new Date(pedido.fechaDeseada).toISOString().split('T')[0];

  const mensajeWhatsApp = `Hola ${pedido.clienteNombre}, te saludamos de Dolce Florencia respecto a tu solicitud de pedido #${pedido.codigo} para el día ${fechaStr}.`;
  const linkWhatsApp = generarEnlaceWhatsApp(mensajeWhatsApp, pedido.clienteTelefono);

  const handleConfirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    const centavos = Math.round(parseFloat(precioBs) * 100);
    if (isNaN(centavos) || centavos <= 0) {
      alert('Ingresa un monto válido en Bs.');
      return;
    }

    setCargando(true);
    setError(null);
    setAdvertencia(null);
    try {
      const res = await confirmarPedidoAction(pedido.id, centavos);
      if (res.error) setError(res.error);
      if (res.advertencia) setAdvertencia(res.advertencia);
      if (res.exito) setMostrandoConfirmar(false);
    } catch (e: any) {
      setError(e.message || 'Error inesperado');
    } finally {
      setCargando(false);
    }
  };

  const handleRechazar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError(null);
    try {
      const res = await rechazarPedidoAction(pedido.id, motivoRechazo);
      if (res.error) setError(res.error);
      if (res.exito) setMostrandoRechazar(false);
    } catch (e: any) {
      setError(e.message || 'Error al rechazar');
    } finally {
      setCargando(false);
    }
  };

  const handleCancelar = async () => {
    if (!confirm(`¿Estás seguro de cancelar el pedido #${pedido.codigo}?`)) return;
    setCargando(true);
    setError(null);
    try {
      const res = await cancelarPedidoAction(pedido.id);
      if (res.error) setError(res.error);
    } catch (e: any) {
      setError(e.message || 'Error al cancelar');
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      <tr>
        <td>
          <span style={{ fontWeight: 700, color: 'var(--cafe-deep)', display: 'block' }}>
            {pedido.codigo}
          </span>
          <span style={{ fontSize: '13px', color: 'var(--cafe)' }}>{pedido.clienteNombre}</span>
          <span style={{ fontSize: '12px', color: 'var(--cafe-suave)', display: 'block' }}>
            📞 {pedido.clienteTelefono}
          </span>
          {error && <span style={{ color: '#c92a2a', fontSize: '11px', display: 'block' }}>⚠️ {error}</span>}
          {advertencia && <span style={{ color: '#d9480f', fontSize: '11px', display: 'block' }}>ℹ️ {advertencia}</span>}
        </td>

        <td>
          <span style={{ fontWeight: 600, display: 'block' }}>{fechaStr}</span>
          <span style={{ fontSize: '12px', color: 'var(--cafe-suave)' }}>
            {pedido.horaDeseada ? `Hora: ${pedido.horaDeseada}` : 'Horario flexible'}
          </span>
          <span
            style={{
              display: 'inline-block',
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: '6px',
              background: '#eee',
              marginTop: '4px',
            }}
          >
            {pedido.entrega === 'RETIRO' ? '🏪 Retiro en local' : '🛵 Entrega a domicilio'}
          </span>
        </td>

        <td>
          <div style={{ fontSize: '13px', maxHeight: '80px', overflowY: 'auto' }}>
            {pedido.items && pedido.items.length > 0 ? (
              pedido.items.map((it: any) => (
                <div key={it.id}>
                  {it.cantidad}x {it.nombre}
                </div>
              ))
            ) : (
              <span style={{ color: 'var(--cafe-suave)' }}>{pedido.detalles || 'Sin detalle'}</span>
            )}
          </div>
          {pedido.totalAcordadoCentavos && (
            <div style={{ marginTop: '4px', fontWeight: 700, color: 'var(--fucsia-accion)' }}>
              Bs {(pedido.totalAcordadoCentavos / 100).toFixed(2)}
            </div>
          )}
        </td>

        <td>
          <span className={`badge-estado ${pedido.estado.toLowerCase()}`}>
            {pedido.estado}
          </span>
        </td>

        <td>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <a
              href={linkWhatsApp}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp-sm"
              title="Abrir chat en WhatsApp"
            >
              💬 WhatsApp
            </a>

            {pedido.estado === 'PENDIENTE' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMostrandoConfirmar(true);
                    setMostrandoRechazar(false);
                  }}
                  disabled={cargando}
                  className="btn-accion-sm btn-exito"
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMostrandoRechazar(true);
                    setMostrandoConfirmar(false);
                  }}
                  disabled={cargando}
                  className="btn-accion-sm btn-peligro"
                >
                  Rechazar
                </button>
              </>
            )}

            {pedido.estado === 'CONFIRMADO' && (
              <button
                type="button"
                onClick={handleCancelar}
                disabled={cargando}
                className="btn-accion-sm btn-peligro"
              >
                Cancelar
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Formulario desplegable para fijar monto acordado y confirmar */}
      {mostrandoConfirmar && (
        <tr>
          <td colSpan={5} style={{ background: '#f4fbf5', padding: '14px 18px', borderLeft: '4px solid #2b8a3e' }}>
            <form onSubmit={handleConfirmar} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#2b8a3e' }}>
                Total acordado con el cliente (Bs):
              </span>
              <input
                type="number"
                step="0.50"
                min="1"
                required
                value={precioBs}
                onChange={(e) => setPrecioBs(e.target.value)}
                placeholder="Ej. 180.00"
                className="field-input"
                style={{ width: '130px', padding: '6px 10px', fontSize: '13px' }}
              />
              <button type="submit" disabled={cargando} className="btn-accion-sm btn-exito">
                {cargando ? 'Guardando...' : 'Guardar y Confirmar'}
              </button>
              <button type="button" onClick={() => setMostrandoConfirmar(false)} className="btn-accion-sm">
                Cancelar
              </button>
            </form>
          </td>
        </tr>
      )}

      {/* Formulario desplegable para rechazar */}
      {mostrandoRechazar && (
        <tr>
          <td colSpan={5} style={{ background: '#fff5f5', padding: '14px 18px', borderLeft: '4px solid #c92a2a' }}>
            <form onSubmit={handleRechazar} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#c92a2a' }}>
                Motivo del rechazo (opcional):
              </span>
              <input
                type="text"
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                placeholder="Ej. Sin disponibilidad de insumos para la fecha"
                className="field-input"
                style={{ flex: 1, minWidth: '220px', padding: '6px 10px', fontSize: '13px' }}
              />
              <button type="submit" disabled={cargando} className="btn-accion-sm btn-peligro">
                {cargando ? 'Rechazando...' : 'Rechazar Solicitud'}
              </button>
              <button type="button" onClick={() => setMostrandoRechazar(false)} className="btn-accion-sm">
                Cancelar
              </button>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}

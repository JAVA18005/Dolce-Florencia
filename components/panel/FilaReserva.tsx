'use client';

import { useState } from 'react';
import {
  confirmarReservaMesaAction,
  marcarCumplidaAction,
  marcarNoLlegoAction,
  rechazarReservaAction,
  cancelarReservaAction,
} from '@/app/(panel)/panel/reservas/acciones';
import { generarEnlaceWhatsApp } from '@/lib/whatsapp';

interface Props {
  reserva: any;
  mesasDisponibles: any[];
}

export default function FilaReserva({ reserva, mesasDisponibles }: Props) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advertencias, setAdvertencias] = useState<string[]>([]);
  const [mostrandoConfirmar, setMostrandoConfirmar] = useState(false);
  const [mesaSeleccionada, setMesaSeleccionada] = useState(reserva.mesaId || '');
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [mostrandoRechazar, setMostrandoRechazar] = useState(false);

  const fechaStr = new Date(reserva.fecha).toISOString().split('T')[0];

  const mensajeWhatsApp = `Hola ${reserva.clienteNombre}, te contactamos de Dolce Florencia respecto a tu reserva #${reserva.codigo} para el día ${fechaStr} a las ${reserva.hora || ''}.`;
  const linkWhatsApp = generarEnlaceWhatsApp(mensajeWhatsApp, reserva.clienteTelefono);

  const handleConfirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError(null);
    setAdvertencias([]);
    try {
      const res = await confirmarReservaMesaAction(reserva.id, mesaSeleccionada || null);
      if (res.error) setError(res.error);
      if (res.advertencias) setAdvertencias(res.advertencias);
      if (res.exito) setMostrandoConfirmar(false);
    } catch (e: any) {
      setError(e.message || 'Error inesperado');
    } finally {
      setCargando(false);
    }
  };

  const handleCumplida = async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await marcarCumplidaAction(reserva.id);
      if (res.error) setError(res.error);
    } finally {
      setCargando(false);
    }
  };

  const handleNoLlego = async () => {
    if (!confirm(`¿Marcar la reserva #${reserva.codigo} como No Llegó?`)) return;
    setCargando(true);
    setError(null);
    try {
      const res = await marcarNoLlegoAction(reserva.id);
      if (res.error) setError(res.error);
    } finally {
      setCargando(false);
    }
  };

  const handleRechazar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError(null);
    try {
      const res = await rechazarReservaAction(reserva.id, motivoRechazo);
      if (res.error) setError(res.error);
      if (res.exito) setMostrandoRechazar(false);
    } finally {
      setCargando(false);
    }
  };

  const handleCancelar = async () => {
    if (!confirm(`¿Estás seguro de cancelar la reserva #${reserva.codigo}?`)) return;
    setCargando(true);
    setError(null);
    try {
      const res = await cancelarReservaAction(reserva.id);
      if (res.error) setError(res.error);
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      <tr style={{ background: reserva.esPosibleNoShow ? 'var(--color-advertencia-bg)' : undefined }}>
        <td>
          <span style={{ fontWeight: 700, color: 'var(--cafe-deep)', display: 'block' }}>
            {reserva.codigo}
          </span>
          <span style={{ fontSize: 'var(--fs-small)', color: 'var(--cafe)' }}>{reserva.clienteNombre}</span>
          <span style={{ fontSize: 'var(--fs-small)', color: 'var(--cafe-suave)', display: 'block' }}>
            📞 {reserva.clienteTelefono}
          </span>
          {reserva.conMascota && (
            <span
              style={{
                display: 'inline-block',
                marginTop: '4px',
                fontSize: 'var(--fs-small)',
                padding: '2px 6px',
                borderRadius: '8px',
                background: 'var(--color-exito-bg)',
                color: 'var(--color-exito)',
                fontWeight: 600,
              }}
            >
              🐾 Con Mascota
            </span>
          )}
          {reserva.esPosibleNoShow && (
            <span
              style={{
                display: 'block',
                marginTop: '4px',
                fontSize: 'var(--fs-small)',
                padding: '2px 6px',
                borderRadius: '6px',
                background: 'var(--color-error-bg)',
                color: 'var(--color-error)',
                fontWeight: 700,
              }}
            >
              ⚠️ Posible No-Show (&gt; 30m)
            </span>
          )}
          {error && <span style={{ color: 'var(--color-error)', fontSize: 'var(--fs-small)', display: 'block' }}>⚠️ {error}</span>}
          {advertencias.map((adv, idx) => (
            <span key={idx} style={{ color: 'var(--color-advertencia)', fontSize: 'var(--fs-small)', display: 'block' }}>
              ℹ️ {adv}
            </span>
          ))}
        </td>

        <td>
          <span style={{ fontWeight: 600, display: 'block' }}>{fechaStr}</span>
          <span style={{ fontSize: 'var(--fs-small)', color: 'var(--cafe-deep)' }}>
            Hora: <strong>{reserva.hora || 'Sin hora'}</strong>
          </span>
          <span style={{ display: 'block', fontSize: 'var(--fs-small)', color: 'var(--cafe-suave)' }}>
            {reserva.personas || 2} personas
          </span>
        </td>

        <td>
          {reserva.mesa ? (
            <div>
              <strong style={{ color: 'var(--cafe-deep)', display: 'block' }}>{reserva.mesa.nombre}</strong>
              <span style={{ fontSize: 'var(--fs-small)', color: 'var(--cafe-suave)' }}>
                Zona {reserva.mesa.zona} · Cap: {reserva.mesa.capacidad}
              </span>
            </div>
          ) : (
            <span style={{ color: 'var(--cafe-suave)', fontSize: 'var(--fs-small)', fontStyle: 'italic' }}>
              Sin mesa asignada
            </span>
          )}
        </td>

        <td>
          <span className={`badge-estado ${reserva.estado.toLowerCase()}`}>
            {reserva.estado}
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

            {reserva.estado === 'PENDIENTE' && (
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
                  Asignar / Confirmar
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

            {reserva.estado === 'CONFIRMADA' && (
              <>
                <button
                  type="button"
                  onClick={handleCumplida}
                  disabled={cargando}
                  className="btn-accion-sm btn-exito"
                  title="Marcar que el cliente ocupó la mesa"
                >
                  ✓ Cumplida
                </button>
                <button
                  type="button"
                  onClick={handleNoLlego}
                  disabled={cargando}
                  className="btn-accion-sm btn-peligro"
                  title="Marcar que el cliente no se presentó"
                >
                  No Llegó
                </button>
                <button
                  type="button"
                  onClick={handleCancelar}
                  disabled={cargando}
                  className="btn-accion-sm"
                >
                  Cancelar
                </button>
              </>
            )}
          </div>
        </td>
      </tr>

      {/* Modal / formulario desplegable para asignar mesa y confirmar */}
      {mostrandoConfirmar && (
        <tr>
          <td colSpan={5} style={{ background: 'var(--color-exito-bg)', padding: '14px 18px', borderLeft: '4px solid var(--color-exito)' }}>
            <form onSubmit={handleConfirmar} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 'var(--fs-small)', fontWeight: 600, color: 'var(--color-exito)' }}>
                Asignar Mesa (opcional pero recomendado):
              </span>
              <select
                value={mesaSeleccionada}
                onChange={(e) => setMesaSeleccionada(e.target.value)}
                className="field-input"
                style={{ maxWidth: '280px', padding: '6px 10px', fontSize: 'var(--fs-small)' }}
              >
                <option value="">-- Sin mesa específica (confirmar igual) --</option>
                {mesasDisponibles.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre} (Zona {m.zona}, Cap: {m.capacidad} {m.aceptaMascotas ? '🐾' : ''})
                  </option>
                ))}
              </select>
              <button type="submit" disabled={cargando} className="btn-accion-sm btn-exito">
                {cargando ? 'Confirmando...' : 'Confirmar Reserva'}
              </button>
              <button type="button" onClick={() => setMostrandoConfirmar(false)} className="btn-accion-sm">
                Cancelar
              </button>
            </form>
          </td>
        </tr>
      )}

      {/* Formulario para rechazar */}
      {mostrandoRechazar && (
        <tr>
          <td colSpan={5} style={{ background: 'var(--color-error-bg)', padding: '14px 18px', borderLeft: '4px solid var(--color-error)' }}>
            <form onSubmit={handleRechazar} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 'var(--fs-small)', fontWeight: 600, color: 'var(--color-error)' }}>
                Motivo del rechazo (opcional):
              </span>
              <input
                type="text"
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                placeholder="Ej. Salón completo para la hora solicitada"
                className="field-input"
                style={{ flex: 1, minWidth: '220px', padding: '6px 10px', fontSize: 'var(--fs-small)' }}
              />
              <button type="submit" disabled={cargando} className="btn-accion-sm btn-peligro">
                Rechazar
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

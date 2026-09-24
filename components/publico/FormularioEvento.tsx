'use client';

import { useState } from 'react';
import { crearEventoAction } from '@/lib/servicios/eventos';
import SelectorFecha from './SelectorFecha';
import Turnstile from './Turnstile';
import ModalSolicitudExitosa from './ModalSolicitudExitosa';

interface FormularioEventoProps {
  fechasBloqueadas: string[];
}

export default function FormularioEvento({ fechasBloqueadas }: FormularioEventoProps) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fecha, setFecha] = useState('');
  const [modalidad, setModalidad] = useState<'EN_LOCAL' | 'ENTREGA'>('EN_LOCAL');
  const [personas, setPersonas] = useState<number>(20);
  const [ocasion, setOcasion] = useState('');
  const [detalles, setDetalles] = useState('');
  const [campoTrampa, setCampoTrampa] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);
  const [erroresCampos, setErroresCampos] = useState<Record<string, string[]>>({});

  const [modalAbierto, setModalAbierto] = useState(false);
  const [codigoExitoso, setCodigoExitoso] = useState('');
  const [enlaceWhatsApp, setEnlaceWhatsApp] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorGlobal(null);
    setErroresCampos({});
    setEnviando(true);

    try {
      const payload = {
        nombre,
        telefono,
        fecha,
        modalidad,
        personas: Number(personas),
        ocasion,
        detalles,
        campoTrampa: campoTrampa || undefined,
        turnstileToken: turnstileToken || undefined,
      };

      const respuesta = await crearEventoAction(payload);

      if (!respuesta.exito) {
        setErrorGlobal(respuesta.mensaje || 'Ocurrió un error al registrar la solicitud de evento.');
        if (respuesta.errores) {
          setErroresCampos(respuesta.errores);
        }
      } else {
        setCodigoExitoso(respuesta.codigo || '');
        setEnlaceWhatsApp(respuesta.enlaceWhatsApp || '');
        setModalAbierto(true);
      }
    } catch {
      setErrorGlobal('Hubo un problema de conexión con el servidor. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="formulario-solicitud" noValidate>
        {errorGlobal && (
          <div className="alerta-error" role="alert" tabIndex={-1}>
            <p className="alerta-error-texto">{errorGlobal}</p>
          </div>
        )}

        {/* Sección: Datos de contacto */}
        <fieldset className="form-seccion">
          <legend className="form-seccion-titulo">1. Datos del organizador</legend>

          <div className="grid-2-col">
            <div className="field-group">
              <label htmlFor="nombre-evento" className="field-label">
                Nombre y apellido <span className="requerido">*</span>
              </label>
              <input
                id="nombre-evento"
                type="text"
                className={`field-input ${erroresCampos.nombre ? 'field-error' : ''}`}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Carolina Mendizábal"
                required
              />
              {erroresCampos.nombre && (
                <span className="field-error-mensaje">{erroresCampos.nombre[0]}</span>
              )}
            </div>

            <div className="field-group">
              <label htmlFor="telefono-evento" className="field-label">
                Teléfono de contacto (Bolivia) <span className="requerido">*</span>
              </label>
              <input
                id="telefono-evento"
                type="tel"
                className={`field-input ${erroresCampos.telefono ? 'field-error' : ''}`}
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej. 78198181"
                required
              />
              <span className="field-ayuda">
                Te escribiremos a este WhatsApp con la propuesta personalizada.
              </span>
              {erroresCampos.telefono && (
                <span className="field-error-mensaje">{erroresCampos.telefono[0]}</span>
              )}
            </div>
          </div>
        </fieldset>

        {/* Sección: Modalidad y Fecha */}
        <fieldset className="form-seccion">
          <legend className="form-seccion-titulo">2. Modalidad y Fecha</legend>

          <div className="field-group">
            <label className="field-label">Modalidad de la celebración</label>
            <div className="opciones-selector-horizontal" role="radiogroup">
              <label className={`opcion-radio ${modalidad === 'EN_LOCAL' ? 'activa' : ''}`}>
                <input
                  type="radio"
                  name="modalidad"
                  value="EN_LOCAL"
                  checked={modalidad === 'EN_LOCAL'}
                  onChange={() => setModalidad('EN_LOCAL')}
                />
                <span className="opcion-radio-titulo">Celebración en el local</span>
                <span className="opcion-radio-desc">
                  Reserva de salón / espacio exclusivo con servicio de mesa
                </span>
              </label>

              <label className={`opcion-radio ${modalidad === 'ENTREGA' ? 'activa' : ''}`}>
                <input
                  type="radio"
                  name="modalidad"
                  value="ENTREGA"
                  checked={modalidad === 'ENTREGA'}
                  onChange={() => setModalidad('ENTREGA')}
                />
                <span className="opcion-radio-titulo">Entrega o catering dulce</span>
                <span className="opcion-radio-desc">
                  Mesa de postres, tartas personalizadas y bocaditos para tu evento externo
                </span>
              </label>
            </div>
            {erroresCampos.modalidad && (
              <span className="field-error-mensaje">{erroresCampos.modalidad[0]}</span>
            )}
          </div>

          <div className="grid-2-col">
            <SelectorFecha
              id="fecha-evento"
              label="Fecha estimada del evento"
              valor={fecha}
              onChange={setFecha}
              fechasBloqueadas={fechasBloqueadas}
              diasHorizonte={180}
              requerido
              error={erroresCampos.fecha?.[0]}
            />

            <div className="field-group">
              <label htmlFor="personas-evento" className="field-label">
                Cantidad estimada de invitados <span className="requerido">*</span>
              </label>
              <input
                id="personas-evento"
                type="number"
                min={1}
                max={500}
                className={`field-input ${erroresCampos.personas ? 'field-error' : ''}`}
                value={personas}
                onChange={(e) => setPersonas(parseInt(e.target.value, 10) || 1)}
                required
              />
              <span className="field-ayuda">Capacidad para eventos en el local: hasta 30 personas. Catering: hasta 500.</span>
              {erroresCampos.personas && (
                <span className="field-error-mensaje">{erroresCampos.personas[0]}</span>
              )}
            </div>
          </div>
        </fieldset>

        {/* Sección: Detalles de la Celebración */}
        <fieldset className="form-seccion">
          <legend className="form-seccion-titulo">3. Motivo y Visión del Evento</legend>

          <div className="field-group">
            <label htmlFor="ocasion-evento" className="field-label">
              Ocasión o Tipo de Celebración <span className="requerido">*</span>
            </label>
            <input
              id="ocasion-evento"
              type="text"
              className={`field-input ${erroresCampos.ocasion ? 'field-error' : ''}`}
              value={ocasion}
              onChange={(e) => setOcasion(e.target.value)}
              placeholder="Ej. Cumpleaños, Baby Shower, Aniversario, Té corporativo"
              required
            />
            {erroresCampos.ocasion && (
              <span className="field-error-mensaje">{erroresCampos.ocasion[0]}</span>
            )}
          </div>

          <div className="field-group">
            <label htmlFor="detalles-evento" className="field-label">
              Cuéntanos tu idea <span className="requerido">*</span>
            </label>
            <textarea
              id="detalles-evento"
              className={`field-textarea ${erroresCampos.detalles ? 'field-error' : ''}`}
              rows={4}
              value={detalles}
              onChange={(e) => setDetalles(e.target.value)}
              placeholder="Dinos qué tipo de postres imaginas, si requieres café de especialidad, temática de decoración o requerimientos especiales..."
              maxLength={1500}
              required
            />
            <span className="field-ayuda">Al menos 5 caracteres descriptivos.</span>
            {erroresCampos.detalles && (
              <span className="field-error-mensaje">{erroresCampos.detalles[0]}</span>
            )}
          </div>
        </fieldset>

        {/* Honeypot anti-spam */}
        <div style={{ display: 'none' }} aria-hidden="true">
          <label htmlFor="campo-trampa-evento">No completar este campo:</label>
          <input
            id="campo-trampa-evento"
            type="text"
            tabIndex={-1}
            value={campoTrampa}
            onChange={(e) => setCampoTrampa(e.target.value)}
            autoComplete="off"
          />
        </div>

        {/* Cloudflare Turnstile */}
        <div className="form-turnstile-container">
          <Turnstile onVerify={(token) => setTurnstileToken(token)} />
        </div>

        {/* Botón de envío */}
        <div className="form-acciones">
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={enviando}
          >
            {enviando ? 'Enviando propuesta...' : 'Cotizar mi evento o celebración'}
          </button>
        </div>
      </form>

      <ModalSolicitudExitosa
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        codigo={codigoExitoso}
        tipo="evento"
        enlaceWhatsApp={enlaceWhatsApp}
      />
    </>
  );
}

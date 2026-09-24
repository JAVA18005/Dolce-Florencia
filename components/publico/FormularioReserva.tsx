'use client';

import { useState } from 'react';
import { crearReservaAction } from '@/lib/servicios/reservas';
import SelectorFecha from './SelectorFecha';
import SelectorHora from './SelectorHora';
import Turnstile from './Turnstile';
import ModalSolicitudExitosa from './ModalSolicitudExitosa';

interface FormularioReservaProps {
  fechasBloqueadas: string[];
}

export default function FormularioReserva({ fechasBloqueadas }: FormularioReservaProps) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [personas, setPersonas] = useState<number>(2);
  const [zonaPreferencia, setZonaPreferencia] = useState<'INTERIOR' | 'EXTERIOR'>('INTERIOR');
  const [conMascota, setConMascota] = useState(false);
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
        hora,
        personas: Number(personas),
        zonaPreferencia,
        conMascota,
        detalles: detalles || undefined,
        campoTrampa: campoTrampa || undefined,
        turnstileToken: turnstileToken || undefined,
      };

      const respuesta = await crearReservaAction(payload);

      if (!respuesta.exito) {
        setErrorGlobal(respuesta.mensaje || 'Ocurrió un error al registrar tu reserva.');
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
          <legend className="form-seccion-titulo">1. Tus datos de contacto</legend>
          
          <div className="grid-2-col">
            <div className="field-group">
              <label htmlFor="nombre" className="field-label">
                Nombre completo <span className="requerido">*</span>
              </label>
              <input
                id="nombre"
                type="text"
                className={`field-input ${erroresCampos.nombre ? 'field-error' : ''}`}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Valeria Quiroga"
                required
              />
              {erroresCampos.nombre && (
                <span className="field-error-mensaje">{erroresCampos.nombre[0]}</span>
              )}
            </div>

            <div className="field-group">
              <label htmlFor="telefono" className="field-label">
                Teléfono de contacto (Bolivia) <span className="requerido">*</span>
              </label>
              <input
                id="telefono"
                type="tel"
                className={`field-input ${erroresCampos.telefono ? 'field-error' : ''}`}
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej. 78198181"
                required
              />
              <span className="field-ayuda">
                Número celular de 8 dígitos para enviarte la confirmación por WhatsApp.
              </span>
              {erroresCampos.telefono && (
                <span className="field-error-mensaje">{erroresCampos.telefono[0]}</span>
              )}
            </div>
          </div>
        </fieldset>

        {/* Sección: Fecha, Hora y Personas */}
        <fieldset className="form-seccion">
          <legend className="form-seccion-titulo">2. Fecha y hora de visita</legend>

          <div className="grid-3-col">
            <SelectorFecha
              id="fecha"
              label="Fecha de la reserva"
              valor={fecha}
              onChange={setFecha}
              fechasBloqueadas={fechasBloqueadas}
              diasHorizonte={60}
              requerido
              error={erroresCampos.fecha?.[0]}
            />

            <SelectorHora
              id="hora"
              label="Hora de llegada"
              valor={hora}
              onChange={setHora}
              requerido
              error={erroresCampos.hora?.[0]}
            />

            <div className="field-group">
              <label htmlFor="personas" className="field-label">
                Personas <span className="requerido">*</span>
              </label>
              <input
                id="personas"
                type="number"
                min={1}
                max={18}
                className={`field-input ${erroresCampos.personas ? 'field-error' : ''}`}
                value={personas}
                onChange={(e) => setPersonas(parseInt(e.target.value, 10) || 1)}
                required
              />
              <span className="field-ayuda">
                Hasta 18 personas. Para grupos mayores, solicita un Evento.
              </span>
              {erroresCampos.personas && (
                <span className="field-error-mensaje">{erroresCampos.personas[0]}</span>
              )}
            </div>
          </div>
        </fieldset>

        {/* Sección: Preferencia de ambiente */}
        <fieldset className="form-seccion">
          <legend className="form-seccion-titulo">3. Preferencia de espacio</legend>

          <div className="field-group">
            <label className="field-label">Zona preferida</label>
            <div className="opciones-selector-horizontal" role="radiogroup">
              <label className={`opcion-radio ${zonaPreferencia === 'INTERIOR' ? 'activa' : ''}`}>
                <input
                  type="radio"
                  name="zonaPreferencia"
                  value="INTERIOR"
                  checked={zonaPreferencia === 'INTERIOR'}
                  onChange={() => setZonaPreferencia('INTERIOR')}
                />
                <span className="opcion-radio-titulo">Interior</span>
                <span className="opcion-radio-desc">Mesas artesanales y rincón salón</span>
              </label>

              <label className={`opcion-radio ${zonaPreferencia === 'EXTERIOR' ? 'activa' : ''}`}>
                <input
                  type="radio"
                  name="zonaPreferencia"
                  value="EXTERIOR"
                  checked={zonaPreferencia === 'EXTERIOR'}
                  onChange={() => setZonaPreferencia('EXTERIOR')}
                />
                <span className="opcion-radio-titulo">Exterior / Terraza</span>
                <span className="opcion-radio-desc">Aire fresco al aire libre</span>
              </label>
            </div>
            {erroresCampos.zonaPreferencia && (
              <span className="field-error-mensaje">{erroresCampos.zonaPreferencia[0]}</span>
            )}
          </div>

          <div className="field-group">
            <label className="label-checkbox">
              <input
                type="checkbox"
                checked={conMascota}
                onChange={(e) => setConMascota(e.target.checked)}
              />
              <span>Voy con mi mascota (Somos Pet Friendly)</span>
            </label>
          </div>

          <div className="field-group">
            <label htmlFor="detalles" className="field-label">
              Notas especiales o motivo (opcional)
            </label>
            <textarea
              id="detalles"
              className="field-textarea"
              rows={3}
              value={detalles}
              onChange={(e) => setDetalles(e.target.value)}
              placeholder="Ej. Es el cumpleaños de mi mamá, ¿pueden preparar una velita en la porción de tarta?"
              maxLength={1500}
            />
          </div>
        </fieldset>

        {/* Honeypot anti-spam (oculto para humanos) */}
        <div style={{ display: 'none' }} aria-hidden="true">
          <label htmlFor="campo-trampa-reserva">No completar este campo:</label>
          <input
            id="campo-trampa-reserva"
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
            {enviando ? 'Verificando y registrando...' : 'Solicitar reserva de mesa'}
          </button>
        </div>
      </form>

      <ModalSolicitudExitosa
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        codigo={codigoExitoso}
        tipo="reserva"
        enlaceWhatsApp={enlaceWhatsApp}
      />
    </>
  );
}

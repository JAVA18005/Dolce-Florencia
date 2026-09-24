'use client';

import { useState } from 'react';
import {
  consultarSeguimientoAction,
  DetalleSeguimientoPublico,
} from '@/lib/servicios/seguimiento';
import { generarEnlaceWhatsApp } from '@/lib/whatsapp';

export default function FormularioSeguimiento() {
  const [codigo, setCodigo] = useState('');
  const [ultimos4Digitos, setUltimos4Digitos] = useState('');
  const [consultando, setConsultando] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);
  const [erroresCampos, setErroresCampos] = useState<Record<string, string[]>>({});
  const [resultado, setResultado] = useState<DetalleSeguimientoPublico | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorGlobal(null);
    setErroresCampos({});
    setResultado(null);
    setConsultando(true);

    try {
      const resp = await consultarSeguimientoAction({
        codigo: codigo.trim().toUpperCase(),
        ultimos4Digitos: ultimos4Digitos.trim(),
      });

      if (!resp.exito) {
        setErrorGlobal(resp.mensaje || 'No fue posible realizar la consulta.');
        if (resp.errores) {
          setErroresCampos(resp.errores);
        }
      } else if (resp.resultado) {
        setResultado(resp.resultado);
      }
    } catch {
      setErrorGlobal('Hubo un error de conexión con el servidor. Por favor intenta más tarde.');
    } finally {
      setConsultando(false);
    }
  };

  const formatearEstado = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE':
        return { texto: 'Pendiente de confirmación', clase: 'badge-pendiente' };
      case 'CONFIRMADO':
        return { texto: 'Confirmado por el equipo', clase: 'badge-confirmado' };
      case 'EN_PREPARACION':
        return { texto: 'En preparación artesanal', clase: 'badge-proceso' };
      case 'LISTO':
        return { texto: 'Listo para entrega / retiro', clase: 'badge-listo' };
      case 'ENTREGADO':
        return { texto: 'Completado y entregado', clase: 'badge-entregado' };
      case 'CANCELADO':
        return { texto: 'Cancelado', clase: 'badge-cancelado' };
      default:
        return { texto: estado, clase: 'badge-neutro' };
    }
  };

  return (
    <div className="seguimiento-contenedor">
      <form onSubmit={handleSubmit} className="formulario-solicitud" noValidate>
        {errorGlobal && (
          <div className="alerta-error" role="alert" tabIndex={-1}>
            <p className="alerta-error-texto">{errorGlobal}</p>
          </div>
        )}

        <fieldset className="form-seccion">
          <legend className="form-seccion-titulo">Consulta de estado</legend>
          <p className="form-seccion-desc">
            Ingresa el código único que recibiste (formato DF-XXXXXX) y los últimos 4 dígitos del número telefónico registrado.
          </p>

          <div className="grid-2-col">
            <div className="field-group">
              <label htmlFor="codigo-seguimiento" className="field-label">
                Código de solicitud <span className="requerido">*</span>
              </label>
              <input
                id="codigo-seguimiento"
                type="text"
                className={`field-input codigo-input ${erroresCampos.codigo ? 'field-error' : ''}`}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="Ej. DF-A38K9P"
                maxLength={9}
                required
              />
              <span className="field-ayuda">Prefijo DF- seguido de 6 caracteres.</span>
              {erroresCampos.codigo && (
                <span className="field-error-mensaje">{erroresCampos.codigo[0]}</span>
              )}
            </div>

            <div className="field-group">
              <label htmlFor="telefono-ultimos" className="field-label">
                Últimos 4 dígitos del teléfono <span className="requerido">*</span>
              </label>
              <input
                id="telefono-ultimos"
                type="text"
                className={`field-input ${erroresCampos.ultimos4Digitos ? 'field-error' : ''}`}
                value={ultimos4Digitos}
                onChange={(e) => setUltimos4Digitos(e.target.value.replace(/\D/g, ''))}
                placeholder="Ej. 8181"
                maxLength={4}
                required
              />
              <span className="field-ayuda">Verificación de seguridad de privacidad.</span>
              {erroresCampos.ultimos4Digitos && (
                <span className="field-error-mensaje">{erroresCampos.ultimos4Digitos[0]}</span>
              )}
            </div>
          </div>
        </fieldset>

        <div className="form-acciones">
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={consultando}
          >
            {consultando ? 'Consultando...' : 'Buscar solicitud'}
          </button>
        </div>
      </form>

      {/* Tarjeta de resultado */}
      {resultado && (
        <article className="seguimiento-resultado-tarjeta" aria-live="polite">
          <header className="seguimiento-resultado-cabecera">
            <div>
              <span className="seguimiento-resultado-tipo">{resultado.tipo}</span>
              <h2 className="seguimiento-resultado-codigo">{resultado.codigo}</h2>
            </div>
            <div>
              {(() => {
                const infoEstado = formatearEstado(resultado.estado);
                return <span className={`badge-estado ${infoEstado.clase}`}>{infoEstado.texto}</span>;
              })()}
            </div>
          </header>

          <div className="seguimiento-resultado-cuerpo">
            <div className="seguimiento-dato">
              <span className="seguimiento-dato-etiqueta">Fecha programada:</span>
              <span className="seguimiento-dato-valor">{resultado.fecha}</span>
            </div>

            {resultado.hora && (
              <div className="seguimiento-dato">
                <span className="seguimiento-dato-etiqueta">Hora de llegada:</span>
                <span className="seguimiento-dato-valor">{resultado.hora}</span>
              </div>
            )}

            {resultado.entrega && (
              <div className="seguimiento-dato">
                <span className="seguimiento-dato-etiqueta">Modalidad / Entrega:</span>
                <span className="seguimiento-dato-valor">{resultado.entrega}</span>
              </div>
            )}

            <div className="seguimiento-dato">
              <span className="seguimiento-dato-etiqueta">Detalle / Resumen:</span>
              <span className="seguimiento-dato-valor">{resultado.resumen}</span>
            </div>
          </div>

          <footer className="seguimiento-resultado-pie">
            <p className="seguimiento-aviso-contacto">
              ¿Deseas consultar o coordinar un detalle sobre esta solicitud?
            </p>
            <a
              href={generarEnlaceWhatsApp(
                `¡Hola Dolce Florencia! Quisiera consultar acerca de mi solicitud con código ${resultado.codigo}.`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp"
            >
              Consultar por WhatsApp
            </a>
          </footer>
        </article>
      )}
    </div>
  );
}

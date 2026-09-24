'use client';

import { useState } from 'react';
import { crearPedidoAction } from '@/lib/servicios/pedidos';
import SelectorFecha from './SelectorFecha';
import Turnstile from './Turnstile';
import ModalSolicitudExitosa from './ModalSolicitudExitosa';
import { formatearCentavosABs } from '@/lib/dinero';

interface ProductoCatalogo {
  id: string;
  nombre: string;
  precioCentavos: number | null;
  categoria: {
    nombre: string;
  };
}

interface FormularioPedidoProps {
  productos: ProductoCatalogo[];
  fechasBloqueadas: string[];
  productoInicial?: string;
}

export default function FormularioPedido({
  productos,
  fechasBloqueadas,
  productoInicial,
}: FormularioPedidoProps) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [entrega, setEntrega] = useState<'RETIRO' | 'DOMICILIO'>('RETIRO');
  const [direccionEntrega, setDireccionEntrega] = useState('');
  const [fechaDeseada, setFechaDeseada] = useState('');
  const [horaDeseada, setHoraDeseada] = useState('');
  const [detalles, setDetalles] = useState('');
  const [campoTrampa, setCampoTrampa] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');

  // Ítems seleccionados
  const prodDefault = productoInicial
    ? productos.find((p) => p.nombre.toLowerCase() === productoInicial.toLowerCase())
    : productos[0];

  const [items, setItems] = useState<
    Array<{ productoId?: string; nombre: string; cantidad: number; nota?: string }>
  >([
    {
      productoId: prodDefault?.id,
      nombre: prodDefault?.nombre || 'Torta clásica artesanal',
      cantidad: 1,
    },
  ]);

  const [enviando, setEnviando] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);
  const [erroresCampos, setErroresCampos] = useState<Record<string, string[]>>({});

  const [modalAbierto, setModalAbierto] = useState(false);
  const [codigoExitoso, setCodigoExitoso] = useState('');
  const [enlaceWhatsApp, setEnlaceWhatsApp] = useState('');

  const agregarItem = () => {
    setItems((prev) => [
      ...prev,
      {
        productoId: productos[0]?.id,
        nombre: productos[0]?.nombre || 'Producto del catálogo',
        cantidad: 1,
      },
    ]);
  };

  const eliminarItem = (indice: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== indice));
  };

  const actualizarItem = (
    indice: number,
    campo: 'productoId' | 'nombre' | 'cantidad' | 'nota',
    valor: any
  ) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== indice) return it;
        if (campo === 'productoId') {
          const prod = productos.find((p) => p.id === valor);
          return {
            ...it,
            productoId: valor,
            nombre: prod?.nombre || it.nombre,
          };
        }
        return { ...it, [campo]: valor };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorGlobal(null);
    setErroresCampos({});
    setEnviando(true);

    try {
      const payload = {
        nombre,
        telefono,
        entrega,
        direccionEntrega: entrega === 'DOMICILIO' ? direccionEntrega : undefined,
        fechaDeseada,
        horaDeseada: horaDeseada || undefined,
        items,
        detalles: detalles || undefined,
        campoTrampa: campoTrampa || undefined,
        turnstileToken: turnstileToken || undefined,
      };

      const respuesta = await crearPedidoAction(payload);

      if (!respuesta.exito) {
        setErrorGlobal(respuesta.mensaje || 'Ocurrió un error al registrar el pedido.');
        if (respuesta.errores) {
          setErroresCampos(respuesta.errores);
        }
        setEnviando(false);
        return;
      }

      setCodigoExitoso(respuesta.codigo || '');
      setEnlaceWhatsApp(respuesta.enlaceWhatsApp || '');
      setModalAbierto(true);
      setEnviando(false);
    } catch {
      setErrorGlobal('Error de conexión al enviar el formulario. Por favor intenta de nuevo.');
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

        {/* Honeypot invisible para bots */}
        <div style={{ display: 'none' }} aria-hidden="true">
          <label htmlFor="website_check">No llenar este campo</label>
          <input
            id="website_check"
            name="website_check"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={campoTrampa}
            onChange={(e) => setCampoTrampa(e.target.value)}
          />
        </div>

        {/* Sección: Datos de contacto */}
        <fieldset className="form-seccion">
          <legend className="form-seccion-titulo">1. Tus datos de contacto</legend>

          <div className="grid-2-col">
            <div className="field-group">
              <label htmlFor="nombre-pedido" className="field-label">
                Tu nombre completo <span className="requerido">*</span>
              </label>
              <input
                id="nombre-pedido"
                type="text"
                className={`field-input ${erroresCampos.nombre ? 'field-error' : ''}`}
                required
                maxLength={100}
                placeholder="¿Cómo te llamas?"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                aria-invalid={!!erroresCampos.nombre}
              />
              {erroresCampos.nombre && (
                <span className="field-error-mensaje">{erroresCampos.nombre[0]}</span>
              )}
            </div>

            <div className="field-group">
              <label htmlFor="telefono-pedido" className="field-label">
                Tu teléfono / WhatsApp <span className="requerido">*</span>
              </label>
              <input
                id="telefono-pedido"
                type="tel"
                className={`field-input ${erroresCampos.telefono ? 'field-error' : ''}`}
                required
                placeholder="Ej: 78198181"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                aria-invalid={!!erroresCampos.telefono}
              />
              <span className="field-ayuda">
                Número de Bolivia (8 dígitos). Lo usaremos para coordinar y consultar tu pedido.
              </span>
              {erroresCampos.telefono && (
                <span className="field-error-mensaje">{erroresCampos.telefono[0]}</span>
              )}
            </div>
          </div>
        </fieldset>

        {/* Sección: Entrega y Fecha */}
        <fieldset className="form-seccion">
          <legend className="form-seccion-titulo">2. Entrega y fecha deseada</legend>

          <div className="field-group">
            <label className="field-label">Forma de entrega</label>
            <div className="opciones-selector-horizontal" role="radiogroup">
              <label className={`opcion-radio ${entrega === 'RETIRO' ? 'activa' : ''}`}>
                <input
                  type="radio"
                  name="entrega"
                  value="RETIRO"
                  checked={entrega === 'RETIRO'}
                  onChange={() => setEntrega('RETIRO')}
                />
                <span className="opcion-radio-titulo">Retiro en pastelería</span>
                <span className="opcion-radio-desc">Sin costo adicional en nuestro salón</span>
              </label>

              <label className={`opcion-radio ${entrega === 'DOMICILIO' ? 'activa' : ''}`}>
                <input
                  type="radio"
                  name="entrega"
                  value="DOMICILIO"
                  checked={entrega === 'DOMICILIO'}
                  onChange={() => setEntrega('DOMICILIO')}
                />
                <span className="opcion-radio-titulo">Entrega a domicilio</span>
                <span className="opcion-radio-desc">Coordinamos dirección y costo por WhatsApp</span>
              </label>
            </div>
          </div>

          {entrega === 'DOMICILIO' && (
            <div className="field-group">
              <label htmlFor="direccionEntrega" className="field-label">
                Dirección de entrega <span className="requerido">*</span>
              </label>
              <input
                id="direccionEntrega"
                type="text"
                className={`field-input ${erroresCampos.direccionEntrega ? 'field-error' : ''}`}
                required
                maxLength={300}
                placeholder="Calle, número, barrio o punto de referencia"
                value={direccionEntrega}
                onChange={(e) => setDireccionEntrega(e.target.value)}
                aria-invalid={!!erroresCampos.direccionEntrega}
              />
              {erroresCampos.direccionEntrega && (
                <span className="field-error-mensaje">{erroresCampos.direccionEntrega[0]}</span>
              )}
            </div>
          )}

          <div className="grid-2-col">
            <SelectorFecha
              id="fechaDeseada"
              label="Fecha deseada"
              valor={fechaDeseada}
              onChange={setFechaDeseada}
              fechasBloqueadas={fechasBloqueadas}
              maxDias={60}
              requerido
              error={erroresCampos.fechaDeseada?.[0]}
            />

            <div className="field-group">
              <label htmlFor="horaDeseada" className="field-label">
                Hora aproximada (opcional)
              </label>
              <input
                id="horaDeseada"
                type="time"
                className="field-input"
                value={horaDeseada}
                onChange={(e) => setHoraDeseada(e.target.value)}
              />
              <span className="field-ayuda">Horario de atención: 15:00 a 22:00.</span>
            </div>
          </div>
        </fieldset>

        {/* Sección: Productos del pedido */}
        <fieldset className="form-seccion">
          <legend className="form-seccion-titulo">3. Productos y detalles</legend>

          <div className="field-group">
            <label className="field-label">
              Productos a encargar <span className="requerido">*</span>
            </label>

            <div className="items-pedido-lista">
              {items.map((it, idx) => (
                <div key={idx} className="item-pedido-fila">
                  <div className="field-group campo-producto">
                    <label htmlFor={`producto-${idx}`} className="field-label">
                      Producto <span className="requerido">*</span>
                    </label>
                    <select
                      id={`producto-${idx}`}
                      className="field-input field-select"
                      value={it.productoId || ''}
                      onChange={(e) => actualizarItem(idx, 'productoId', e.target.value)}
                    >
                      {productos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} ({formatearCentavosABs(p.precioCentavos)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field-group campo-cantidad">
                    <label htmlFor={`cantidad-${idx}`} className="field-label">
                      Cantidad <span className="requerido">*</span>
                    </label>
                    <input
                      id={`cantidad-${idx}`}
                      type="number"
                      min={1}
                      max={50}
                      className="field-input input-cantidad"
                      value={it.cantidad}
                      onChange={(e) =>
                        actualizarItem(idx, 'cantidad', Math.max(1, parseInt(e.target.value) || 1))
                      }
                      required
                    />
                  </div>

                  {items.length > 1 && (
                    <div className="campo-quitar">
                      <button
                        type="button"
                        onClick={() => eliminarItem(idx)}
                        className="btn-quitar-item"
                        aria-label="Quitar este producto"
                        title="Quitar este producto"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div>
              <button
                type="button"
                onClick={agregarItem}
                className="btn-secundario"
              >
                + Agregar otro producto
              </button>
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="detalles" className="field-label">
              Ese detalle que lo hace tuyo (opcional)
            </label>
            <textarea
              id="detalles"
              className="field-input field-textarea"
              rows={3}
              maxLength={1500}
              placeholder="Dedicatoria, mensaje especial, alergias o preferencias..."
              value={detalles}
              onChange={(e) => setDetalles(e.target.value)}
            />
          </div>
        </fieldset>

        {/* Turnstile */}
        <div className="form-turnstile-container">
          <Turnstile onVerify={(token) => setTurnstileToken(token)} />
        </div>

        {/* Acciones de envío */}
        <div className="form-acciones">
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={enviando}
          >
            {enviando ? 'Guardando solicitud...' : 'Enviar solicitud de pedido'}
          </button>
        </div>

        <p className="form-seccion-desc" style={{ textAlign: 'center', marginTop: '16px' }}>
          Tu solicitud se guarda en nuestro sistema y la confirmaremos contigo por WhatsApp.
          No se realiza ningún cobro en la web.
        </p>
      </form>

      <ModalSolicitudExitosa
        abierto={modalAbierto}
        codigo={codigoExitoso}
        enlaceWhatsApp={enlaceWhatsApp}
        tipo="pedido"
        onCerrar={() => setModalAbierto(false)}
      />
    </>
  );
}

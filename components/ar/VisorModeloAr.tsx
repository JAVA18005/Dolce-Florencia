'use client';

import { useEffect, useRef, useState } from 'react';
import { useModoCamara } from './ModoCamaraContext';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        src?: string;
        'ios-src'?: string;
        poster?: string;
        alt?: string;
        ar?: boolean;
        'ar-modes'?: string;
        'camera-controls'?: boolean;
        'interaction-prompt'?: 'auto' | 'none';
        loading?: 'auto' | 'lazy' | 'eager';
        children?: React.ReactNode;
      };
    }
  }
}

interface ModelViewerElement extends HTMLElement {
  activateAR?: () => Promise<boolean>;
}

interface VisorModeloArProps {
  nombre: string;
  modeloArUrl: string;
  modeloArIosUrl?: string | null;
  poster?: string | null;
  imagenUrl?: string | null;
}

/**
 * Visor AR del menú público (§3.4). No valida peso del .glb en servidor:
 * la carga, el poster y el fallback se resuelven íntegramente en el frontend.
 * El botón nativo de AR de <model-viewer> queda oculto. El acceso al modo
 * cámara es global (ModoCamaraContext): una sola decisión del usuario en el
 * footer público que muestra u oculta el botón "Ver en tu mesa" (activateAR)
 * en todos los visores a la vez. Sin detección automática de soporte; si el
 * dispositivo no soporta AR, activateAR() no hace nada visible y todo fallo
 * es silencioso.
 */
export default function VisorModeloAr({
  nombre,
  modeloArUrl,
  modeloArIosUrl,
  poster,
  imagenUrl,
}: VisorModeloArProps) {
  const { modoCamara } = useModoCamara();
  const [definido, setDefinido] = useState(false);
  const [fallo, setFallo] = useState(false);
  const [activando, setActivando] = useState(false);
  const visorRef = useRef<ModelViewerElement | null>(null);

  useEffect(() => {
    let activo = true;
    import('@google/model-viewer')
      .then(() => {
        if (activo) setDefinido(true);
      })
      .catch(() => {
        if (activo) setFallo(true);
      });
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    const visor = visorRef.current;
    if (!definido || !visor) return;
    const onError = () => setFallo(true);
    visor.addEventListener('error', onError);
    return () => {
      visor.removeEventListener('error', onError);
    };
  }, [definido]);

  const activarCamara = async () => {
    const visor = visorRef.current;
    if (!visor || activando || !visor.activateAR) return;
    setActivando(true);
    try {
      await visor.activateAR();
    } catch {
      // Sin mensajes de error visibles para el cliente en ningún caso.
    } finally {
      setActivando(false);
    }
  };

  if (fallo) {
    if (imagenUrl) {
      return <img className="visor-ar-media" src={imagenUrl} alt={nombre} loading="lazy" />;
    }
    return (
      <div className="dessert-shape" aria-hidden="true">
        <i />
        <b />
        <em />
      </div>
    );
  }

  return (
    <div className="visor-ar">
      {!definido && poster ? (
        <img className="visor-ar-media" src={poster} alt={nombre} loading="lazy" />
      ) : null}

      {definido ? (
        <model-viewer
          ref={visorRef}
          src={modeloArUrl}
          ios-src={modeloArIosUrl || undefined}
          poster={poster || undefined}
          alt={nombre}
          className="visor-ar-model"
          ar
          ar-modes="webxr scene-viewer quick-look"
          camera-controls
          interaction-prompt="none"
          loading="eager"
        />
      ) : null}

      {definido ? (
        <div className="visor-ar-controls">
          {modoCamara ? (
            <button
              className="visor-ar-boton-camara"
              type="button"
              onClick={activarCamara}
              disabled={activando}
            >
              Ver en tu mesa
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
'use client';

import { useEffect, useRef, useState } from 'react';

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
  canActivateAR?: boolean;
  activateAR?: () => Promise<boolean>;
}

interface VisorModeloArProps {
  nombre: string;
  modeloArUrl: string;
  modeloArIosUrl?: string | null;
  poster?: string | null;
  imagenUrl?: string | null;
}

type EstadoAr = 'not-presenting' | 'session-starting' | 'object-placed' | 'failed';

/**
 * Visor AR del menú público (§3.4). No valida peso del .glb en servidor:
 * la carga, el poster y el fallback se resuelven íntegramente en el frontend.
 * El botón nativo de AR de <model-viewer> queda oculto; el acceso al modo
 * cámara es un control discreto que solo aparece si el dispositivo confirma
 * soporte real (canActivateAR). Cualquier falla es silenciosa.
 */
export default function VisorModeloAr({
  nombre,
  modeloArUrl,
  modeloArIosUrl,
  poster,
  imagenUrl,
}: VisorModeloArProps) {
  const [definido, setDefinido] = useState(false);
  const [fallo, setFallo] = useState(false);
  const [arDisponible, setArDisponible] = useState(false);
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
    const onLoad = () => {
      if (typeof visor.canActivateAR === 'boolean') {
        setArDisponible(visor.canActivateAR);
      }
    };
    const onArStatus = (evento: Event) => {
      const detalle = (evento as CustomEvent<{ status: EstadoAr }>).detail;
      if (detalle?.status === 'failed') {
        // Dispositivo que anunció soporte pero falló al arrancar: ocultar en silencio.
        setActivando(false);
        setArDisponible(false);
      }
    };

    visor.addEventListener('error', onError);
    visor.addEventListener('load', onLoad);
    visor.addEventListener('ar-status', onArStatus);
    return () => {
      visor.removeEventListener('error', onError);
      visor.removeEventListener('load', onLoad);
      visor.removeEventListener('ar-status', onArStatus);
    };
  }, [definido]);

  const activarCamara = async () => {
    const visor = visorRef.current;
    if (!visor || activando) return;
    if (!visor.canActivateAR || !visor.activateAR) return;
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

      {arDisponible ? (
        <button
          className="visor-ar-cta"
          type="button"
          aria-label={`Activar modo cámara para ver ${nombre} en tu espacio`}
          onClick={activarCamara}
          disabled={activando}
        >
          Modo cámara
        </button>
      ) : null}
    </div>
  );
}
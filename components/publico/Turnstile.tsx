'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

export interface TurnstileRef {
  reiniciar: () => void;
}

interface TurnstileProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

const siteKey =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'; // Clave de prueba oficial Cloudflare

const Turnstile = forwardRef<TurnstileRef, TurnstileProps>(function Turnstile(
  { onVerify, onError, onExpire },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const callbacksRef = useRef({ onVerify, onError, onExpire });
  callbacksRef.current = { onVerify, onError, onExpire };

  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando');

  const renderWidget = () => {
    if (!window.turnstile || !containerRef.current || widgetIdRef.current) return;
    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => {
          callbacksRef.current.onVerify(token);
          setEstado('listo');
        },
        'error-callback': () => {
          setEstado('error');
          callbacksRef.current.onVerify('');
          callbacksRef.current.onError?.();
        },
        'expired-callback': () => {
          setEstado('error');
          callbacksRef.current.onVerify('');
          callbacksRef.current.onExpire?.();
        },
        theme: 'light',
      });
    } catch {
      setEstado('error');
    }
  };

  const recargar = () => {
    if (window.turnstile && widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        // Ignorar
      }
      widgetIdRef.current = null;
    }
    setEstado('cargando');
    window.setTimeout(renderWidget, 50);
  };

  useImperativeHandle(
    ref,
    () => ({
      reiniciar: () => {
        if (window.turnstile && widgetIdRef.current) {
          try {
            window.turnstile.reset(widgetIdRef.current);
          } catch {
            // Ignorar
          }
        }
        setEstado('cargando');
        window.setTimeout(renderWidget, 50);
      },
      recargar,
    }),
    []
  );

  useEffect(() => {
    let scriptEl: HTMLScriptElement | null = null;
    let intervalo: number | undefined;

    if (window.turnstile) {
      renderWidget();
    } else {
      const existente = document.querySelector('script[src*="turnstile/v0/api.js"]');
      if (!existente) {
        scriptEl = document.createElement('script');
        scriptEl.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        scriptEl.async = true;
        scriptEl.defer = true;
        scriptEl.onload = () => {
          renderWidget();
        };
        document.head.appendChild(scriptEl);
      } else {
        intervalo = window.setInterval(() => {
          if (window.turnstile) {
            window.clearInterval(intervalo);
            renderWidget();
          }
        }, 100);
      }
    }

    return () => {
      if (intervalo) {
        window.clearInterval(intervalo);
      }
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignorar
        }
        widgetIdRef.current = null;
      }
      scriptEl?.remove();
    };
  }, []);

  return (
    <div
      className="turnstile-wrap"
      style={{ marginBlock: '14px', minHeight: '65px', maxWidth: '100%', overflow: 'hidden' }}
    >
      <div ref={containerRef} />

      <p className="turnstile-mensaje" role="status">
        {estado === 'cargando' && 'Cargando verificación de seguridad…'}
        {estado === 'error' && 'No pudimos cargar la verificación de seguridad o expiró.'}
      </p>

      {estado === 'error' && (
        <button type="button" className="turnstile-reintentar" onClick={() => recargar()}>
          Reintentar verificación
        </button>
      )}
    </div>
  );
});

export default Turnstile;
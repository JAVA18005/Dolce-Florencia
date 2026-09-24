'use client';

import { useEffect, useRef } from 'react';

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

export default function Turnstile({ onVerify, onError, onExpire }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const siteKey =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'; // Clave de prueba oficial Cloudflare

  useEffect(() => {
    let scriptEl: HTMLScriptElement | null = null;

    const renderWidget = () => {
      if (window.turnstile && containerRef.current && !widgetIdRef.current) {
        try {
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token: string) => onVerify(token),
            'error-callback': () => onError?.(),
            'expired-callback': () => onExpire?.(),
            theme: 'light',
          });
        } catch {
          // Ignorar error si ya estaba renderizado
        }
      }
    };

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
        const interval = setInterval(() => {
          if (window.turnstile) {
            clearInterval(interval);
            renderWidget();
          }
        }, 100);
        return () => clearInterval(interval);
      }
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignorar
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onVerify, onError, onExpire]);

  return (
    <div style={{ marginBlock: '14px', minHeight: '65px' }}>
      <div ref={containerRef} />
    </div>
  );
}

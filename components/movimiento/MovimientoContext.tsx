'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface MovimientoContextTipo {
  pausado: boolean;
  sistemaReducido: boolean;
  efectivoPausado: boolean;
  alternarPausa: () => void;
}

const MovimientoContext = createContext<MovimientoContextTipo>({
  pausado: false,
  sistemaReducido: false,
  efectivoPausado: false,
  alternarPausa: () => {},
});

export function MovimientoProvider({ children }: { children: React.ReactNode }) {
  const [pausado, setPausado] = useState(false);
  const [sistemaReducido, setSistemaReducido] = useState(false);

  useEffect(() => {
    // 1. Preferencia de usuario guardada
    let guardado = false;
    try {
      guardado = localStorage.getItem('dolce-motion') === 'paused';
    } catch {
      // Ignorar errores de localStorage (ej. navegación privada)
    }
    setPausado(guardado);

    // 2. Consulta de prefers-reduced-motion del sistema
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setSistemaReducido(mediaQuery.matches);

    const onMediaChange = (e: MediaQueryListEvent) => {
      setSistemaReducido(e.matches);
    };

    mediaQuery.addEventListener('change', onMediaChange);

    return () => {
      mediaQuery.removeEventListener('change', onMediaChange);
    };
  }, []);

  const efectivoPausado = pausado || sistemaReducido;

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('motion-paused', efectivoPausado);
    }
  }, [efectivoPausado]);

  const alternarPausa = () => {
    if (sistemaReducido) return; // Si el sistema lo reduce, el botón permanece deshabilitado

    setPausado((prev) => {
      const nuevo = !prev;
      try {
        localStorage.setItem('dolce-motion', nuevo ? 'paused' : 'active');
      } catch {
        // Ignorar
      }
      return nuevo;
    });
  };

  return (
    <MovimientoContext.Provider
      value={{
        pausado,
        sistemaReducido,
        efectivoPausado,
        alternarPausa,
      }}
    >
      {children}
    </MovimientoContext.Provider>
  );
}

export function useMovimiento() {
  return useContext(MovimientoContext);
}

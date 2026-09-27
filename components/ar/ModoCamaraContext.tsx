'use client';

import { createContext, useContext, useState } from 'react';

interface ModoCamaraContextTipo {
  modoCamara: boolean;
  alternarModoCamara: () => void;
}

const ModoCamaraContext = createContext<ModoCamaraContextTipo>({
  modoCamara: false,
  alternarModoCamara: () => {},
});

/**
 * Estado global del modo cámara (Fase 6, §3.4): el toggle vive en el footer
 * público y las tarjetas de producto con modelo 3D comparten el mismo estado,
 * sin prop drilling. Solo controla la visibilidad del botón "Ver en tu mesa";
 * el visor 3D (rotar/zoom) siempre se muestra.
 */
export function ModoCamaraProvider({ children }: { children: React.ReactNode }) {
  const [modoCamara, setModoCamara] = useState(false);

  const alternarModoCamara = () => setModoCamara((prev) => !prev);

  return (
    <ModoCamaraContext.Provider value={{ modoCamara, alternarModoCamara }}>
      {children}
    </ModoCamaraContext.Provider>
  );
}

export function useModoCamara() {
  return useContext(ModoCamaraContext);
}
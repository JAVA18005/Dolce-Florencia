'use client';

import { useRef, useState } from 'react';
import { obtenerUrlSubidaAction } from '@/app/(panel)/panel/productos/acciones';
import { subirConUrlFirmada } from '@/lib/cliente/storage';

interface Props {
  tipo: 'imagen' | 'modelo';
  etiqueta: string;
  valorActual: string | null;
  onChange: (url: string | null) => void;
  acepta?: string;
}

export default function CampoSubidaArchivo({
  tipo,
  etiqueta,
  valorActual,
  onChange,
  acepta,
}: Props) {
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const manejarArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setSubiendo(true);
    setProgreso(0);
    setError(null);
    try {
      const res = await obtenerUrlSubidaAction({
        tipo,
        nombre: archivo.name,
        tamanoBytes: archivo.size,
      });
      if (res.error || !res.signedUrl) {
        throw new Error(res.error || 'No se pudo iniciar la subida.');
      }

      await subirConUrlFirmada(res.signedUrl, archivo, setProgreso);

      // La URL pública queda válida. El borrado del archivo anterior NO ocurre
      // en el cliente: lo deduce la acción de guardar comparando la BD anterior
      // con los valores nuevos, y recién tras persistir con éxito.
      onChange(res.publicUrl ?? null);

      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al subir el archivo.');
      onChange(null);
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const quitarArchivo = () => {
    onChange(null);
  };

  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--cafe)', marginBottom: '4px' }}>
        {etiqueta}
      </label>

      <input
        ref={inputRef}
        type="file"
        accept={acepta}
        onChange={manejarArchivo}
        disabled={subiendo}
        className="field-input"
        style={{ width: '100%', fontSize: '12px', padding: '6px 10px' }}
      />

      {subiendo && (
        <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--cafe-suave)' }}>
          Subiendo… {progreso}%
          <div
            style={{
              height: '4px',
              background: '#f0e6df',
              borderRadius: '4px',
              marginTop: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progreso}%`,
                height: '100%',
                background: 'var(--fucsia-accion)',
                transition: 'width .2s',
              }}
            />
          </div>
        </div>
      )}

      {error && (
        <div style={{ marginTop: '4px', fontSize: '11px', color: '#c92a2a' }}>{error}</div>
      )}

      {valorActual ? (
        <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '11px',
              color: 'var(--cafe-suave)',
              maxWidth: '280px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={valorActual}
          >
            Actual: {valorActual}
          </span>
          <button
            type="button"
            onClick={quitarArchivo}
            disabled={subiendo}
            style={{
              fontSize: '11px',
              background: 'none',
              border: 'none',
              color: '#c92a2a',
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'underline',
            }}
          >
            Quitar
          </button>
        </div>
      ) : null}
    </div>
  );
}
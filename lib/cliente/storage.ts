// lib/cliente/storage.ts — Subida directa del navegador a una URL firmada de
// Supabase Storage. Solo se ejecuta en el cliente (nunca importar en servidor):
// el archivo NO pasa por nuestro servidor para respetar el límite de 4.5 MB de
// Vercel. Se usa XMLHttpRequest para poder reportar progreso de subida.

/**
 * Sube {@link archivo} con PUT a una URL firmada emitida por
 * crearUrlSubidaFirmada, reportando progreso (0-100) vía callback.
 */
export function subirConUrlFirmada(
  signedUrl: string,
  archivo: File,
  onProgreso?: (porcentaje: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl);

    const esModelo = /\.glb$/i.test(archivo.name);
    xhr.setRequestHeader(
      'Content-Type',
      esModelo ? 'model/gltf-binary' : archivo.type || 'application/octet-stream'
    );

    xhr.upload.onprogress = (evento) => {
      if (evento.lengthComputable && onProgreso) {
        onProgreso(Math.round((evento.loaded / evento.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Error al subir el archivo (HTTP ${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error('Error de red al subir el archivo.'));
    xhr.onabort = () => reject(new Error('La subida fue cancelada.'));

    xhr.send(archivo);
  });
}
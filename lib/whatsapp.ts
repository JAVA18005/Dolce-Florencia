// lib/whatsapp.ts — Generación de enlaces wa.me leyendo estrictamente WHATSAPP_NUMERO.
// ARQUITECTURA.md §3 y §10: El número de WhatsApp nunca se escribe en el código.

/**
 * Obtiene el número de WhatsApp configurado en el entorno.
 */
export function obtenerNumeroWhatsApp(): string {
  const numero = process.env.WHATSAPP_NUMERO || process.env.NEXT_PUBLIC_WHATSAPP_NUMERO || '';
  return numero.replace(/\D/g, '');
}

/**
 * Genera un enlace a wa.me con texto codificado opcional.
 */
export function generarEnlaceWhatsApp(mensaje?: string, numeroPersonalizado?: string): string {
  const tel = (numeroPersonalizado || obtenerNumeroWhatsApp()).replace(/\D/g, '');
  if (!mensaje) {
    return `https://wa.me/${tel}`;
  }
  return `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`;
}

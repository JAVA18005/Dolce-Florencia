// lib/ip.ts — Extracción segura de la IP del cliente según el proxy confiable configurado.
// PROXY_CONFIABLE = "cloudflare" | "railway" | "ninguno"

export type TipoProxyConfiable = 'cloudflare' | 'railway' | 'ninguno';

/**
 * Valida si un string tiene formato válido de IPv4 o IPv6.
 */
function esIpValida(ip: string): boolean {
  if (!ip) return false;
  const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6 = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^[0-9a-fA-F:]+$/;
  return ipv4.test(ip) || ipv6.test(ip);
}

/**
 * Extrae la IP del cliente de forma segura dependiendo del proxy configurado en PROXY_CONFIABLE.
 * 
 * Modos:
 * 1. "cloudflare":
 *    Confía exclusivamente en `cf-connecting-ip` (inyectado y garantizado por Cloudflare Edge).
 * 
 * 2. "railway":
 *    El Edge Proxy de Railway (basado en Envoy) añade la IP del cliente externo como el ÚLTIMO
 *    elemento (extremo derecho) en `x-forwarded-for` al recibir la petición en su red perimetral
 *    (o en `x-envoy-external-address`). Nunca se toma el primer valor de `x-forwarded-for` porque
 *    puede ser falsificado por el cliente HTTP.
 *    Fuente: Documentación y arquitectura de Edge Proxy / Envoy en Railway (docs.railway.app / help.railway.com).
 * 
 * 3. "ninguno" (default):
 *    No confía en ningún encabezado de proxy (evita spoofing en conexiones directas o desarrollo local).
 *    Retorna "127.0.0.1".
 */
export function obtenerIpCliente(headersList: Headers): string {
  const proxyConfiable = (process.env.PROXY_CONFIABLE || 'ninguno').toLowerCase().trim() as TipoProxyConfiable;

  if (proxyConfiable === 'cloudflare') {
    const cfIp = headersList.get('cf-connecting-ip');
    if (cfIp) {
      const limpia = cfIp.trim();
      if (esIpValida(limpia)) return limpia;
    }
    return '127.0.0.1';
  }

  if (proxyConfiable === 'railway') {
    // 1. Intentar con x-envoy-external-address si está disponible
    const envoyIp = headersList.get('x-envoy-external-address');
    if (envoyIp) {
      const limpia = envoyIp.trim();
      if (esIpValida(limpia)) return limpia;
    }

    // 2. Si no, tomar el último valor de x-forwarded-for (el agregado por el proxy de Railway)
    const forwardedFor = headersList.get('x-forwarded-for');
    if (forwardedFor) {
      const ips = forwardedFor.split(',').map((ip) => ip.trim()).filter(Boolean);
      if (ips.length > 0) {
        const ultimaIp = ips[ips.length - 1]; // Posición final: agregada por el último proxy (Railway)
        if (esIpValida(ultimaIp)) return ultimaIp;
      }
    }

    return '127.0.0.1';
  }

  // Modo "ninguno" u otro no reconocido: ignorar headers de proxy
  return '127.0.0.1';
}

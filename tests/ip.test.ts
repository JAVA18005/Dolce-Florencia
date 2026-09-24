import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { obtenerIpCliente } from '../lib/ip';

describe('lib/ip — Extracción de IP con PROXY_CONFIABLE', () => {
  const envOriginal = process.env.PROXY_CONFIABLE;

  afterEach(() => {
    process.env.PROXY_CONFIABLE = envOriginal;
  });

  it('con "cloudflare": confía exclusivamente en cf-connecting-ip', () => {
    process.env.PROXY_CONFIABLE = 'cloudflare';

    const headers = new Headers();
    headers.set('cf-connecting-ip', '190.181.45.10');
    headers.set('x-forwarded-for', '1.1.1.1, 2.2.2.2');
    headers.set('x-real-ip', '3.3.3.3');

    expect(obtenerIpCliente(headers)).toBe('190.181.45.10');
  });

  it('con "railway": toma el último valor de x-forwarded-for (agregado por el Edge Proxy de Railway)', () => {
    process.env.PROXY_CONFIABLE = 'railway';

    const headers = new Headers();
    // Cliente envía spoofed IP '1.2.3.4', Railway añade '181.115.10.20' al final
    headers.set('x-forwarded-for', '1.2.3.4, 181.115.10.20');

    expect(obtenerIpCliente(headers)).toBe('181.115.10.20');
  });

  it('con "railway": prioriza x-envoy-external-address si está presente', () => {
    process.env.PROXY_CONFIABLE = 'railway';

    const headers = new Headers();
    headers.set('x-envoy-external-address', '181.115.10.25');
    headers.set('x-forwarded-for', '1.2.3.4, 181.115.10.20');

    expect(obtenerIpCliente(headers)).toBe('181.115.10.25');
  });

  it('con "ninguno": ignora todos los headers de proxy y retorna 127.0.0.1', () => {
    process.env.PROXY_CONFIABLE = 'ninguno';

    const headers = new Headers();
    headers.set('cf-connecting-ip', '190.181.45.10');
    headers.set('x-forwarded-for', '1.2.3.4, 181.115.10.20');
    headers.set('x-real-ip', '181.115.10.20');

    expect(obtenerIpCliente(headers)).toBe('127.0.0.1');
  });

  it('retorna 127.0.0.1 si el header contiene una IP inválida', () => {
    process.env.PROXY_CONFIABLE = 'cloudflare';

    const headers = new Headers();
    headers.set('cf-connecting-ip', 'malicious-string');

    expect(obtenerIpCliente(headers)).toBe('127.0.0.1');
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import prisma from '../lib/db';
import { verificarTurnstile } from '../lib/servicios/turnstile';
import { crearPedidoAction } from '../lib/servicios/pedidos';
import { consultarSeguimientoAction } from '../lib/servicios/seguimiento';
import { obtenerHoyBolivia, fechaAYMD } from '../lib/fechas';

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({ 'cf-connecting-ip': '203.0.113.7' })),
  cookies: vi.fn(async () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

const SECRET_NORMAL = 'secreto-servidor-normal-test';
const SECRET_TEST_KEY = '1x0000000000000000000000000000000AA';
const IP_PRUEBA = '203.0.113.7';

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubEnv('TURNSTILE_SECRET_KEY', SECRET_NORMAL);
  vi.stubEnv('PROXY_CONFIABLE', 'cloudflare');
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();

  await prisma.pedido.deleteMany({ where: { clienteNombre: { startsWith: 'Test Turnstile' } } });
  await prisma.peticionRateLimit.deleteMany({
    where: {
      clave: { in: [`ip:${IP_PRUEBA}:pedido`, 'tel:59178198181:pedido'] },
    },
  });
});

describe('lib/servicios/turnstile — verificarTurnstile falla cerrado', () => {
  it('rechaza si TURNSTILE_SECRET_KEY no está configurada, sin llamar a Cloudflare', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', '');
    const res = await verificarTurnstile('token-cualquiera', IP_PRUEBA);
    expect(res.valido).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rechaza token ausente o vacío', async () => {
    expect((await verificarTurnstile(undefined, IP_PRUEBA)).valido).toBe(false);
    expect((await verificarTurnstile(null, IP_PRUEBA)).valido).toBe(false);
    expect((await verificarTurnstile('', IP_PRUEBA)).valido).toBe(false);
    expect((await verificarTurnstile('   ', IP_PRUEBA)).valido).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rechaza cuando Cloudflare responde success:false', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }),
    });
    const res = await verificarTurnstile('token-invalido', IP_PRUEBA);
    expect(res.valido).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rechaza ante error de red', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    const res = await verificarTurnstile('token-x', IP_PRUEBA);
    expect(res.valido).toBe(false);
  });

  it('rechaza ante timeout', async () => {
    const err = new Error('The operation was aborted');
    err.name = 'TimeoutError';
    fetchMock.mockRejectedValueOnce(err);
    const res = await verificarTurnstile('token-x', IP_PRUEBA);
    expect(res.valido).toBe(false);
  });

  it('rechaza ante respuesta que no es JSON', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error('Unexpected token < in JSON');
      },
    });
    const res = await verificarTurnstile('token-x', IP_PRUEBA);
    expect(res.valido).toBe(false);
  });

  it('rechaza cuando la respuesta HTTP no es ok', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    const res = await verificarTurnstile('token-x', IP_PRUEBA);
    expect(res.valido).toBe(false);
  });

  it('aprueba token válido y envía secret, response y remoteip', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });
    const res = await verificarTurnstile('token-valido', IP_PRUEBA);
    expect(res.valido).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect(init.method).toBe('POST');
    const body = new URLSearchParams(init.body);
    expect(body.get('secret')).toBe(SECRET_NORMAL);
    expect(body.get('response')).toBe('token-valido');
    expect(body.get('remoteip')).toBe(IP_PRUEBA);
  });

  it('rechaza claves de prueba oficiales en producción', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('TURNSTILE_SECRET_KEY', SECRET_TEST_KEY);
    const res = await verificarTurnstile('token-x', IP_PRUEBA);
    expect(res.valido).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('crearPedidoAction — orden anti-spam', () => {
  const fechaValida = (() => {
    const base = obtenerHoyBolivia();
    return fechaAYMD(new Date(base.getTime() + 5 * 24 * 60 * 60 * 1000));
  })();

  it('honeypot lleno: devuelve éxito simulado sin llamar a Cloudflare ni guardar', async () => {
    const resp = await crearPedidoAction({ campoTrampa: 'bot-relleno' });
    expect(resp.exito).toBe(true);
    expect(resp.codigo).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();

    const guardados = await prisma.pedido.count({
      where: { clienteNombre: { startsWith: 'Test Turnstile' } },
    });
    expect(guardados).toBe(0);
  });

  it('caso feliz: verifica Turnstile con remoteip y guarda exactamente un pedido', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });
    const resp = await crearPedidoAction({
      nombre: 'Test Turnstile Feliz',
      telefono: '78198181',
      entrega: 'RETIRO',
      fechaDeseada: fechaValida,
      items: [{ nombre: 'Torta de prueba', cantidad: 1 }],
      turnstileToken: 'token-valido-de-prueba',
    });
    expect(resp.exito).toBe(true);
    expect(resp.codigo).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('siteverify');
    const body = new URLSearchParams(init.body);
    expect(body.get('secret')).toBe(SECRET_NORMAL);
    expect(body.get('remoteip')).toBe(IP_PRUEBA);

    const guardados = await prisma.pedido.count({
      where: { clienteNombre: 'Test Turnstile Feliz' },
    });
    expect(guardados).toBe(1);
  });
});

describe('consultarSeguimientoAction — honeypot', () => {
  it('honeypot lleno: responde "no encontrado" sin llamar a Cloudflare ni consultar BD', async () => {
    const resp = await consultarSeguimientoAction({
      codigo: 'DF-A38K9P',
      ultimos4Digitos: '8181',
      campoTrampa: 'bot-relleno',
    });
    expect(resp.exito).toBe(false);
    expect(resp.resultado).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
// tests/almacenamiento.test.ts — Subida directa a Supabase Storage (Fase 6).
// No sube archivos reales: mockea el cliente de Supabase y prueba la lógica de
// servidor (validación Zod, nombres únicos, rechazo a no-admin y borrado
// best-effort solo de archivos de nuestro bucket).

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import prisma from '../lib/db';
import { Rol } from '@prisma/client';
import { hashearPassword } from '../lib/auth/password';
import { crearSesionEnBd } from '../lib/auth/sesion';
import {
  crearUrlSubidaFirmada,
  borrarArchivosProducto,
  generarRutaUnica,
  urlPublicaDeRuta,
  esUrlDelBucket,
  extraerRutaDeUrl,
} from '../lib/servicios/almacenamiento';
import {
  ArchivoSubidaSchema,
  extensionDeArchivo,
  LIMITES_ARCHIVO,
} from '../lib/validaciones/archivo';

let sesionMockActiva: any = null;

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({ 'cf-connecting-ip': '127.0.0.1' })),
  cookies: vi.fn(async () => ({
    get: vi.fn((name: string) => {
      if (name === 'dolce_sesion_panel' && sesionMockActiva) {
        return { value: sesionMockActiva.token };
      }
      return undefined;
    }),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

const mocks = vi.hoisted(() => ({
  crearFirma: vi.fn(),
  eliminar: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabaseAdmin: () => ({
    storage: {
      from: () => ({
        createSignedUploadUrl: mocks.crearFirma,
        remove: mocks.eliminar,
      }),
    },
  }),
}));

describe('Fase 6: Almacenamiento Supabase — subida directa con URL firmada', () => {
  const adminEmail = 'admin-storage-test@dolceflorencia.com';
  const meseroEmail = 'mesero-storage-test@dolceflorencia.com';

  let adminToken: string;
  let meseroToken: string;

  beforeEach(async () => {
    for (const email of [adminEmail, meseroEmail]) {
      await prisma.auditoria.deleteMany({ where: { usuario: { email } } });
      await prisma.sesion.deleteMany({ where: { usuario: { email } } });
      await prisma.usuario.deleteMany({ where: { email } });
    }

    const hash = await hashearPassword('PasswordStorage123!');
    const admin = await prisma.usuario.create({
      data: { nombre: 'Admin Storage', email: adminEmail, passwordHash: hash, rol: Rol.ADMIN, activo: true },
    });
    const mesero = await prisma.usuario.create({
      data: { nombre: 'Mesero Storage', email: meseroEmail, passwordHash: hash, rol: Rol.MESERO, activo: true },
    });

    const sAdmin = await crearSesionEnBd(admin.id);
    adminToken = sAdmin.token;
    const sMesero = await crearSesionEnBd(mesero.id);
    meseroToken = sMesero.token;

    // Entorno de Supabase para el test (nunca se hace red: cliente mockeado).
    process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://stub.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-stub';

    mocks.crearFirma.mockReset();
    mocks.eliminar.mockReset();
    mocks.crearFirma.mockResolvedValue({
      data: { signedUrl: 'https://stub.supabase.co/upload?token=abc', path: 'carpeta/archivo.glb' },
      error: null,
    });
    mocks.eliminar.mockResolvedValue({ data: [], error: null });

    sesionMockActiva = { token: adminToken, usuarioId: '' };
  });

  afterAll(async () => {
    for (const email of [adminEmail, meseroEmail]) {
      await prisma.auditoria.deleteMany({ where: { usuario: { email } } });
      await prisma.sesion.deleteMany({ where: { usuario: { email } } });
      await prisma.usuario.deleteMany({ where: { email } });
    }
  });

  it('rechaza a un mesero (no-admin) al pedir URL firmada o borrar archivos', async () => {
    sesionMockActiva = { token: meseroToken, usuarioId: '' };

    await expect(
      crearUrlSubidaFirmada({ tipo: 'imagen', nombre: 'foto.jpg', tamanoBytes: 1024 })
    ).rejects.toThrow(/Acceso denegado/);

    await expect(borrarArchivosProducto(['https://stub.supabase.co/x.jpg'])).rejects.toThrow(
      /Acceso denegado/
    );
  });

  it('admin obtiene URL firmada con ruta ÚNICA (nunca reutiliza el nombre original)', async () => {
    sesionMockActiva = { token: adminToken, usuarioId: '' };

    // El mock refleja la ruta pedida por el servicio (como haría Supabase).
    mocks.crearFirma.mockImplementation(async (ruta: string) => ({
      data: { signedUrl: `https://stub.supabase.co/upload/${ruta}?token=abc`, path: ruta },
      error: null,
    }));

    const res1 = await crearUrlSubidaFirmada({
      tipo: 'imagen',
      nombre: 'torta-de-frutilla.jpg',
      tamanoBytes: 2048,
    });
    const res2 = await crearUrlSubidaFirmada({
      tipo: 'modelo',
      nombre: 'red-velvet.glb',
      tamanoBytes: 3 * 1024 * 1024,
    });

    // El nombre original NUNCA aparece como clave; ruta única con UUID.
    expect(res1.ruta).toMatch(/^imagenes\/[0-9a-f-]{36}\.jpg$/);
    expect(res1.ruta).not.toContain('torta-de-frutilla');
    expect(res2.ruta).toMatch(/^modelos\/[0-9a-f-]{36}\.glb$/);
    expect(res2.ruta).not.toContain('red-velvet');

    // Diferentes llamadas → rutas distintas (cada subida es única).
    const res3 = await crearUrlSubidaFirmada({
      tipo: 'imagen',
      nombre: 'otra.jpg',
      tamanoBytes: 1024,
    });
    expect(res3.ruta).not.toBe(res1.ruta);

    // La URL pública apunta al objeto público del bucket con la ruta generada.
    expect(res1.publicUrl).toBe(
      `${process.env.SUPABASE_URL}/storage/v1/object/public/productos/${res1.ruta}`
    );
  });

  it('valida extensiones por tipo (modelo solo .glb; imagen jpg/png/webp)', async () => {
    sesionMockActiva = { token: adminToken, usuarioId: '' };

    await expect(
      crearUrlSubidaFirmada({ tipo: 'modelo', nombre: 'modelo.jpg', tamanoBytes: 1024 })
    ).rejects.toThrow(/no admitida para modelo/);

    await expect(
      crearUrlSubidaFirmada({ tipo: 'imagen', nombre: 'animacion.gif', tamanoBytes: 1024 })
    ).rejects.toThrow(/no admitida para imagen/);

    await expect(
      ArchivoSubidaSchema.safeParse({ tipo: 'modelo', nombre: 'x.glb', tamanoBytes: 10 })
    ).toMatchObject({ success: true });
  });

  it('valida el tamaño declarado según tipo (imagen máx 5 MB, modelo máx 10 MB)', async () => {
    sesionMockActiva = { token: adminToken, usuarioId: '' };

    expect(LIMITES_ARCHIVO.imagen).toBe(5 * 1024 * 1024);
    expect(LIMITES_ARCHIVO.modelo).toBe(10 * 1024 * 1024);

    await expect(
      crearUrlSubidaFirmada({ tipo: 'imagen', nombre: 'grande.jpg', tamanoBytes: 6 * 1024 * 1024 })
    ).rejects.toThrow(/máximo de 5 MB/);

    await expect(
      crearUrlSubidaFirmada({ tipo: 'modelo', nombre: 'grande.glb', tamanoBytes: 11 * 1024 * 1024 })
    ).rejects.toThrow(/máximo de 10 MB/);

    const nulo = ArchivoSubidaSchema.safeParse({
      tipo: 'imagen',
      nombre: 'a.jpg',
      tamanoBytes: 0,
    });
    expect(nulo.success).toBe(false);
  });

  it('borra SOLO archivos de nuestro bucket y no falla si el borrado da error', async () => {
    sesionMockActiva = { token: adminToken, usuarioId: '' };

    mocks.eliminar.mockResolvedValue({ data: ['imagenes/vieja.jpg'], error: null });

    const res = await borrarArchivosProducto([
      '/models/torta-crepe-de-frutos-rojos.glb', // ruta relativa local: NO se borra
      'https://imagenes-externas.com/cake.jpg', // URL externa: NO se borra
      urlPublicaDeRuta('imagenes/vieja.jpg'), // de nuestro bucket: SÍ
    ]);

    expect(mocks.eliminar).toHaveBeenCalledTimes(1);
    expect(mocks.eliminar).toHaveBeenCalledWith(['imagenes/vieja.jpg']);
    expect(res.borrados).toBe(1);

    // Best-effort: si Supabase falla, la acción no lanza.
    mocks.eliminar.mockRejectedValue(new Error('Storage caído'));
    await expect(
      borrarArchivosProducto([urlPublicaDeRuta('modelos/a.glb')])
    ).resolves.toEqual({ borrados: 0 });
  });

  it('helpers: esUrlDelBucket y extraerRutaDeUrl distinguen nuestras rutas', () => {
    const base = process.env.SUPABASE_URL!;

    expect(esUrlDelBucket('/models/x.glb', base)).toBe(false);
    expect(esUrlDelBucket('https://otro-host.com/storage/v1/object/public/productos/x.jpg', base)).toBe(false);
    expect(esUrlDelBucket('https://imagenes-externas.com/a.jpg', base)).toBe(false);

    const propia = `${base}/storage/v1/object/public/productos/imagenes/foto%20final.jpg`;
    expect(esUrlDelBucket(propia, base)).toBe(true);
    expect(extraerRutaDeUrl(propia, base)).toBe('imagenes/foto final.jpg');
    expect(extraerRutaDeUrl('/models/x.glb', base)).toBeNull();
  });

  it('generarRutaUnica produce claves archivadas y únicas', () => {
    const a = generarRutaUnica('imagen', 'webp');
    const b = generarRutaUnica('imagen', 'webp');
    const m = generarRutaUnica('modelo', 'anything');
    expect(a).toMatch(/^imagenes\/.+\.webp$/);
    expect(b).not.toBe(a);
    expect(m).toMatch(/^modelos\/.+\.glb$/); // el modelo siempre queda .glb
  });

  it('extensionDeArchivo normaliza nombres en minúsculas sin query', () => {
    expect(extensionDeArchivo('FOTO.JPG')).toBe('jpg');
    expect(extensionDeArchivo('model.glb?token=abc')).toBe('glb');
    expect(extensionDeArchivo('sin-extension')).toBe('sin-extension');
  });
});
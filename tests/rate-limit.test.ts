import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import prisma from '../lib/db';
import { verificarYRegistrarRateLimit } from '../lib/rate-limit';

describe('lib/rate-limit — Control de flujo atómico con SQL crudo', () => {
  const claveTest1 = 'test:rate:ip-127-0-0-1';
  const claveCodigo = 'test:rate:codigo:DF-ABC123:seguimiento';
  const claveConcurrencia = 'test:rate:concurrencia:DF-PARALLEL';

  beforeEach(async () => {
    // Limpiar claves de prueba
    await prisma.peticionRateLimit.deleteMany({
      where: {
        clave: { in: [claveTest1, claveCodigo, claveConcurrencia] },
      },
    });
  });

  afterAll(async () => {
    await prisma.peticionRateLimit.deleteMany({
      where: {
        clave: { in: [claveTest1, claveCodigo, claveConcurrencia] },
      },
    });
  });

  it('permite primer intento y crea el registro con intentos = 1', async () => {
    const res = await verificarYRegistrarRateLimit(claveTest1, 3, 60);
    expect(res.permitido).toBe(true);
    expect(res.intentosRestantes).toBe(2);

    const enDb = await prisma.peticionRateLimit.findUnique({
      where: { clave: claveTest1 },
    });
    expect(enDb).not.toBeNull();
    expect(enDb?.intentos).toBe(1);
  });

  it('bloquea cuando se alcanza el límite máximo dentro de la ventana', async () => {
    // Límite: 2 intentos
    const intento1 = await verificarYRegistrarRateLimit(claveTest1, 2, 60);
    expect(intento1.permitido).toBe(true);
    expect(intento1.intentosRestantes).toBe(1);

    const intento2 = await verificarYRegistrarRateLimit(claveTest1, 2, 60);
    expect(intento2.permitido).toBe(true);
    expect(intento2.intentosRestantes).toBe(0);

    const intento3 = await verificarYRegistrarRateLimit(claveTest1, 2, 60);
    expect(intento3.permitido).toBe(false);
    expect(intento3.intentosRestantes).toBe(0);
    expect(intento3.segundosParaReintentar).toBeGreaterThan(0);
  });

  it('reinicia el contador a 1 y asigna nueva fecha cuando el registro está expirado', async () => {
    // Insertamos un registro con expiraEn en el pasado relativo al reloj de PostgreSQL
    await prisma.$executeRaw`
      INSERT INTO "PeticionRateLimit" (clave, intentos, "expiraEn")
      VALUES (${claveTest1}, 5, NOW() - INTERVAL '10 seconds')
      ON CONFLICT (clave) DO UPDATE
      SET intentos = 5, "expiraEn" = NOW() - INTERVAL '10 seconds';
    `;

    // Nueva petición con límite de 5
    const res = await verificarYRegistrarRateLimit(claveTest1, 5, 3600);
    expect(res.permitido).toBe(true);
    expect(res.intentosRestantes).toBe(4);

    const enDb = await prisma.peticionRateLimit.findUnique({
      where: { clave: claveTest1 },
    });
    expect(enDb?.intentos).toBe(1); // Reinició a 1 en vez de incrementar a 6
    expect(new Date(enDb!.expiraEn).getTime()).toBeGreaterThan(Date.now() - 5000);
  });

  it('aplica rate limit independiente por código de seguimiento', async () => {
    // 5 intentos por código
    for (let i = 1; i <= 5; i++) {
      const res = await verificarYRegistrarRateLimit(claveCodigo, 5, 3600);
      expect(res.permitido).toBe(true);
      expect(res.intentosRestantes).toBe(5 - i);
    }

    // El 6to intento para el mismo código es bloqueado
    const sextoIntento = await verificarYRegistrarRateLimit(claveCodigo, 5, 3600);
    expect(sextoIntento.permitido).toBe(false);
  });

  it('soporta concurrencia estricta con llamadas paralelas (INSERT ON CONFLICT)', async () => {
    const limite = 4;
    const totalPeticiones = 10;

    // Lanzar 10 peticiones simultáneas con Promise.all
    const promesas = Array.from({ length: totalPeticiones }, () =>
      verificarYRegistrarRateLimit(claveConcurrencia, limite, 60)
    );

    const resultados = await Promise.all(promesas);

    const permitidos = resultados.filter((r) => r.permitido).length;
    const bloqueados = resultados.filter((r) => !r.permitido).length;

    // Con límite = 4, exactamente 4 peticiones deben ser permitidas y 6 bloqueadas
    expect(permitidos).toBe(limite);
    expect(bloqueados).toBe(totalPeticiones - limite);

    // El registro final en base de datos debe reflejar exactamente 10 intentos
    const enDb = await prisma.peticionRateLimit.findUnique({
      where: { clave: claveConcurrencia },
    });
    expect(enDb?.intentos).toBe(totalPeticiones);
  });
});

// lib/rate-limit.ts — Rate limiting persistente con sentencia atómica raw SQL y limpieza probabilística.

import prisma from './db';

interface ResultadoRateLimit {
  permitido: boolean;
  intentosRestantes: number;
  segundosParaReintentar?: number;
}

/**
 * Limpieza probabilística no bloqueante de registros expirados (aprox. 1 de cada 20 peticiones).
 */
function limpiezaProbabilisticaExpirados() {
  if (Math.random() < 0.05) {
    prisma.peticionRateLimit
      .deleteMany({
        where: {
          expiraEn: { lt: new Date() },
        },
      })
      .catch(() => {
        // Ignorar fallos de limpieza en segundo plano
      });
  }
}

/**
 * Verifica y registra un intento bajo una clave mediante una sola sentencia atómica de SQL crudo:
 * INSERT ... ON CONFLICT (clave) DO UPDATE
 * 
 * - Si no existe: inserta intentos=1 y expiraEn = timezone('UTC', NOW()) + ventana.
 * - Si existe y expiraEn < timezone('UTC', NOW()): reinicia intentos=1 y nuevo expiraEn.
 * - Si existe y está vigente: incrementa intentos = intentos + 1 y conserva expiraEn.
 * 
 * Todo se ejecuta de forma 100% atómica en el motor PostgreSQL usando marcas de tiempo UTC.
 */
export async function verificarYRegistrarRateLimit(
  clave: string,
  limiteMaximo: number,
  ventanaSegundos: number
): Promise<ResultadoRateLimit> {
  limpiezaProbabilisticaExpirados();

  const ahora = new Date();

  // Sentencia atómica única en PostgreSQL
  const filas = await prisma.$queryRaw<Array<{ intentos: number; expiraEn: Date }>>`
    INSERT INTO "PeticionRateLimit" (clave, intentos, "expiraEn")
    VALUES (${clave}, 1, timezone('UTC', NOW()) + make_interval(secs => ${ventanaSegundos}))
    ON CONFLICT (clave) DO UPDATE
    SET
      intentos = CASE
        WHEN "PeticionRateLimit"."expiraEn" < timezone('UTC', NOW()) THEN 1
        ELSE "PeticionRateLimit".intentos + 1
      END,
      "expiraEn" = CASE
        WHEN "PeticionRateLimit"."expiraEn" < timezone('UTC', NOW()) THEN timezone('UTC', NOW()) + make_interval(secs => ${ventanaSegundos})
        ELSE "PeticionRateLimit"."expiraEn"
      END
    RETURNING intentos, "expiraEn";
  `;

  const fila = filas[0];

  if (!fila) {
    return {
      permitido: false,
      intentosRestantes: 0,
      segundosParaReintentar: ventanaSegundos,
    };
  }

  if (fila.intentos > limiteMaximo) {
    const segundosParaReintentar = Math.max(
      1,
      Math.ceil((new Date(fila.expiraEn).getTime() - ahora.getTime()) / 1000)
    );

    return {
      permitido: false,
      intentosRestantes: 0,
      segundosParaReintentar,
    };
  }

  return {
    permitido: true,
    intentosRestantes: Math.max(0, limiteMaximo - fila.intentos),
  };
}

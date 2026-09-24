// lib/turnstile.ts — Verificación en servidor de Cloudflare Turnstile con fail-closed en producción.

interface RespuestaTurnstile {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
}

/**
 * Verifica el token de Turnstile enviado por el cliente.
 * En producción falla cerrado si falta TURNSTILE_SECRET_KEY o si es una clave de prueba.
 */
export async function verificarTurnstile(
  token: string | null | undefined,
  ipCliente?: string
): Promise<{ valido: boolean; motivo?: string }> {
  const esProduccion = process.env.NODE_ENV === 'production';
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // En producción: Falla cerrado si falta o es una clave de prueba
  if (esProduccion) {
    if (!secretKey) {
      return { valido: false, motivo: 'Clave secreta de Turnstile no configurada en producción.' };
    }
    // Claves de prueba oficiales de Cloudflare comienzan con 1x000, 2x000, 3x000
    if (/^[123]x000/.test(secretKey)) {
      return { valido: false, motivo: 'Clave de prueba de Turnstile no permitida en producción.' };
    }
  }

  // En desarrollo / pruebas: si no hay clave o es clave de prueba
  if (!secretKey) {
    return { valido: true };
  }

  if (!token) {
    return { valido: false, motivo: 'Token de Turnstile no proporcionado.' };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (ipCliente) {
      formData.append('remoteip', ipCliente);
    }

    const respuesta = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!respuesta.ok) {
      return { valido: false, motivo: `Error de verificación HTTP: ${respuesta.status}` };
    }

    const datos: RespuestaTurnstile = await respuesta.json();
    if (!datos.success) {
      return {
        valido: false,
        motivo: `Verificación fallida: ${datos['error-codes']?.join(', ') || 'código inválido'}`,
      };
    }

    return { valido: true };
  } catch (error) {
    if (esProduccion) {
      return { valido: false, motivo: 'Error al conectar con el servicio de verificación.' };
    }
    // En desarrollo, permitir continuar si no hay conexión externa
    return { valido: true };
  }
}

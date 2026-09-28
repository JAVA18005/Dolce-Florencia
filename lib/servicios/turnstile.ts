interface RespuestaTurnstile {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
}

const URL_SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TIMEOUT_MS = 5000;

export async function verificarTurnstile(
  token: string | null | undefined,
  ipCliente?: string
): Promise<{ valido: boolean; motivo?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    return { valido: false, motivo: 'Clave secreta de Turnstile no configurada.' };
  }

  if (process.env.NODE_ENV === 'production' && /^[123]x000/.test(secretKey)) {
    return { valido: false, motivo: 'Clave de prueba de Turnstile no permitida en producción.' };
  }

  if (!token || token.trim().length === 0) {
    return { valido: false, motivo: 'Token de Turnstile no proporcionado.' };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (ipCliente) {
      formData.append('remoteip', ipCliente);
    }

    const respuesta = await fetch(URL_SITEVERIFY, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!respuesta.ok) {
      return { valido: false, motivo: 'Respuesta de verificación con código de error.' };
    }

    let datos: RespuestaTurnstile;
    try {
      datos = (await respuesta.json()) as RespuestaTurnstile;
    } catch {
      return { valido: false, motivo: 'Respuesta de verificación inválida.' };
    }

    if (!datos || datos.success !== true) {
      return { valido: false, motivo: 'Verificación fallida.' };
    }

    return { valido: true };
  } catch {
    return { valido: false, motivo: 'Error al conectar con el servicio de verificación.' };
  }
}
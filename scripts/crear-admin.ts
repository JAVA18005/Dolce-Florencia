// scripts/crear-admin.ts — Script interactivo y seguro para inicializar administradores.
// No escribe ni expone contraseñas en archivos versionados ni registros de consola.

import readline from 'readline';
import prisma from '../lib/db';
import { hashearPassword } from '../lib/auth/password';
import { Rol } from '@prisma/client';

function leerTexto(pregunta: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(pregunta, (respuesta) => {
      rl.close();
      resolve(respuesta.trim());
    });
  });
}

function leerPasswordOculta(pregunta: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(pregunta);
    const stdin = process.stdin;
    stdin.resume();
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');

    let password = '';

    const onData = (ch: string) => {
      if (ch === '\n' || ch === '\r' || ch === '\u0004') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(password);
      } else if (ch === '\u0003') {
        process.exit(1);
      } else if (ch === '\u0008' || ch === '\x7f') {
        if (password.length > 0) {
          password = password.slice(0, -1);
        }
      } else {
        password += ch;
      }
    };

    stdin.on('data', onData);
  });
}

/**
 * Valida que la contraseña cumpla los requisitos de seguridad:
 * - Mínimo 12 caracteres.
 * - Máximo 72 bytes en codificación UTF-8 (bcrypt trunca en silencio a partir de 72 bytes; no se aceptan contraseñas que se truncarían).
 */
export function validarPasswordAdmin(password: string): { valida: boolean; error?: string } {
  if (password.length < 12) {
    return {
      valida: false,
      error: 'La contraseña debe tener al menos 12 caracteres.',
    };
  }
  const bytesUtf8 = Buffer.byteLength(password, 'utf8');
  if (bytesUtf8 > 72) {
    return {
      valida: false,
      error: `La contraseña no puede exceder 72 bytes en UTF-8 (actual: ${bytesUtf8} bytes; bcrypt trunca en silencio a 72 bytes).`,
    };
  }
  return { valida: true };
}

async function main() {
  console.log('\n======================================================');
  console.log(' Dolce Florencia — Creación de Usuario Administrador');
  console.log('======================================================\n');

  const nombre = await leerTexto('Nombre completo del administrador: ');
  if (!nombre) {
    console.error('❌ Error: El nombre no puede estar vacío.');
    process.exit(1);
  }

  const emailRaw = await leerTexto('Correo electrónico (email): ');
  const email = emailRaw.toLowerCase();
  if (!email || !email.includes('@')) {
    console.error('❌ Error: Ingrese un correo electrónico válido.');
    process.exit(1);
  }

  const password = await leerPasswordOculta('Contraseña (mínimo 12 caracteres, máx 72 bytes UTF-8, entrada oculta): ');
  const validacion = validarPasswordAdmin(password);
  if (!validacion.valida) {
    console.error(`❌ Error de seguridad: ${validacion.error}`);
    process.exit(1);
  }

  const confirmacion = await leerPasswordOculta('Confirma la contraseña (entrada oculta): ');
  if (password !== confirmacion) {
    console.error('❌ Error: Las contraseñas ingresadas no coinciden.');
    process.exit(1);
  }

  console.log('\n⏳ Generando hash seguro con bcrypt y guardando en base de datos...');
  const passwordHash = await hashearPassword(password);

  const usuario = await prisma.usuario.upsert({
    where: { email },
    update: {
      nombre,
      passwordHash,
      rol: Rol.ADMIN,
      activo: true,
    },
    create: {
      nombre,
      email,
      passwordHash,
      rol: Rol.ADMIN,
      activo: true,
    },
  });

  console.log(`✅ Administrador configurado exitosamente: ${usuario.email} (${usuario.nombre})`);
  console.log('La contraseña ha sido asegurada. Ya puedes iniciar sesión en /panel/login.\n');
}

const esEjecutadoDirectamente =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('crear-admin.ts') || process.argv[1].endsWith('crear-admin'));

if (esEjecutadoDirectamente) {
  main()
    .catch((e) => {
      console.error('❌ Error inesperado al crear administrador:', e.message);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

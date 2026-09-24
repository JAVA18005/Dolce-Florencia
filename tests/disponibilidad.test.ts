import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import prisma from '../lib/db';
import { ZonaMesa } from '@prisma/client';
import {
  obtenerCapacidadZona,
  verificarDisponibilidadReserva,
  obtenerFechasBloqueadas,
} from '../lib/servicios/disponibilidad';

describe('lib/servicios/disponibilidad — Capacidad de mesas y prevención de sobre-reserva', () => {
  const fechaTest = new Date(Date.UTC(2026, 11, 25)); // 25 de diciembre de 2026
  const horaTest = '18:00';

  beforeEach(async () => {
    // Limpiar reservas y bloqueos creados para la fecha de prueba
    await prisma.reserva.deleteMany({
      where: { fecha: fechaTest },
    });
    await prisma.diaBloqueado.deleteMany({
      where: { fecha: fechaTest },
    });
  });

  afterAll(async () => {
    await prisma.reserva.deleteMany({
      where: { fecha: fechaTest },
    });
    await prisma.diaBloqueado.deleteMany({
      where: { fecha: fechaTest },
    });
  });

  it('calcula la capacidad correcta por zona según ARQUITECTURA.md §10', async () => {
    // Interior: Mesas 1, 2, 3 (3 c/u = 9) + Mesa 4 (4) + Sofá (5) = 18 personas
    const interior = await obtenerCapacidadZona(ZonaMesa.INTERIOR);
    expect(interior.capacidadTotal).toBe(18);
    expect(interior.mesasReservables).toBe(5);

    // Exterior: Mesas Terraza 1, 2 (2 c/u = 4)
    const exterior = await obtenerCapacidadZona(ZonaMesa.EXTERIOR);
    expect(exterior.capacidadTotal).toBe(4);
    expect(exterior.mesasReservables).toBe(2);

    // Barra: NO es reservable
    const barra = await obtenerCapacidadZona(ZonaMesa.BARRA);
    expect(barra.capacidadTotal).toBe(0);
    expect(barra.mesasReservables).toBe(0);
  });

  it('bloquea reservas si la fecha está en DiaBloqueado', async () => {
    await prisma.diaBloqueado.create({
      data: {
        fecha: fechaTest,
        motivo: 'Navidad - Cerrado por festivo',
        creadoPor: {
          connectOrCreate: {
            where: { email: 'admin-test@dolceflorencia.com' },
            create: {
              email: 'admin-test@dolceflorencia.com',
              nombre: 'Admin Test',
              passwordHash: 'test-hash',
              rol: 'ADMIN',
            },
          },
        },
      },
    });

    const fechasBloqueadas = await obtenerFechasBloqueadas();
    expect(fechasBloqueadas).toContain('2026-12-25');

    const res = await verificarDisponibilidadReserva(fechaTest, horaTest, 2, 'INTERIOR');
    expect(res.disponible).toBe(false);
    expect(res.motivo).toMatch(/Navidad - Cerrado/);
  });

  it('rechaza una reserva si las personas exceden la capacidad total de la zona', async () => {
    // En exterior solo entran 4 personas
    const res = await verificarDisponibilidadReserva(fechaTest, horaTest, 5, 'EXTERIOR');
    expect(res.disponible).toBe(false);
    expect(res.motivo).toMatch(/excede la capacidad máxima/);
  });

  it('permite reservas cuando hay suficiente cupo disponible en la zona', async () => {
    const res = await verificarDisponibilidadReserva(fechaTest, horaTest, 4, 'INTERIOR');
    expect(res.disponible).toBe(true);
  });

  it('detecta colisión y saturación cuando reservas concurrentes copan la zona', async () => {
    // Creamos reservas existentes en la misma fecha y hora sumando 16 personas en Interior (capacidad 18)
    await prisma.reserva.create({
      data: {
        codigo: 'DF-TEST01',
        tipo: 'MESA',
        estado: 'CONFIRMADA',
        clienteNombre: 'Familia Lopez',
        clienteTelefono: '59178198181',
        fecha: fechaTest,
        hora: horaTest,
        personas: 16,
      },
    });

    // 2 personas más deberían caber (16 + 2 = 18)
    const caben = await verificarDisponibilidadReserva(fechaTest, horaTest, 2, 'INTERIOR');
    expect(caben.disponible).toBe(true);

    // 3 personas excederían la capacidad (16 + 3 = 19 > 18)
    const noCaben = await verificarDisponibilidadReserva(fechaTest, horaTest, 3, 'INTERIOR');
    expect(noCaben.disponible).toBe(false);
    expect(noCaben.motivo).toMatch(/No hay suficiente cupo/);
  });

  it('considera el traslape de turnos de 90 minutos entre horarios distintos', async () => {
    // Si hay una reserva de 16 personas a las 18:00 (termina a las 19:30):
    await prisma.reserva.create({
      data: {
        codigo: 'DF-TEST02',
        tipo: 'MESA',
        estado: 'CONFIRMADA',
        clienteNombre: 'Grupo Empresa',
        clienteTelefono: '59178198181',
        fecha: fechaTest,
        hora: '18:00',
        personas: 16,
        detalles: '[Zona preferida: INTERIOR]',
      },
    });

    // A las 18:45 (45 min después -> se traslapa con el turno de 18:00 a 19:30):
    // 3 personas no caben (16 + 3 = 19 > 18)
    const traslapadaNoCabe = await verificarDisponibilidadReserva(fechaTest, '18:45', 3, 'INTERIOR');
    expect(traslapadaNoCabe.disponible).toBe(false);
    expect(traslapadaNoCabe.motivo).toMatch(/turnos de 90 min/);

    // A las 19:30 (90 min después -> ya concluyó el turno anterior):
    // 4 personas sí caben
    const turnoPosteriorCabe = await verificarDisponibilidadReserva(fechaTest, '19:30', 4, 'INTERIOR');
    expect(turnoPosteriorCabe.disponible).toBe(true);
  });
});


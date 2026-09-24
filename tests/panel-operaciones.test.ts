import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import prisma from '../lib/db';
import { Rol, EstadoReserva, ModalidadEvento, TipoReserva, ZonaMesa } from '@prisma/client';
import { hashearPassword } from '../lib/auth/password';
import { crearSesionEnBd } from '../lib/auth/sesion';
import { confirmarPedido, rechazarPedido, cancelarPedido } from '../lib/servicios/pedidos-panel';
import { confirmarEvento, cancelarEvento } from '../lib/servicios/eventos-panel';
import { bloquearDiaManual, desbloquearDiaManual } from '../lib/servicios/calendario';
import { confirmarReservaMesa, cancelarReserva, marcarReservaCumplida } from '../lib/servicios/reservas-panel';

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

describe('Hito 2 - Parte B: Operaciones, Eventos, Cierres, Calendario y Mesas', () => {
  const adminEmail = 'admin-b-test@dolceflorencia.com';
  const meseroEmail = 'mesero-b-test@dolceflorencia.com';

  let adminId: string;
  let meseroId: string;
  let adminToken: string;
  let meseroToken: string;
  let mesaTestId: string;

  beforeEach(async () => {
    // Limpieza de datos de prueba
    await prisma.diaBloqueado.deleteMany();
    await prisma.reservaMesa.deleteMany();
    await prisma.auditoria.deleteMany({
      where: { usuario: { email: { in: [adminEmail, meseroEmail] } } },
    });
    await prisma.pedidoItem.deleteMany();
    await prisma.pedido.deleteMany({
      where: { clienteNombre: { startsWith: 'Test B' } },
    });
    await prisma.reserva.deleteMany({
      where: { clienteNombre: { startsWith: 'Test B' } },
    });
    await prisma.sesion.deleteMany({
      where: { usuario: { email: { in: [adminEmail, meseroEmail] } } },
    });
    await prisma.usuario.deleteMany({
      where: { email: { in: [adminEmail, meseroEmail] } },
    });

    const hash = await hashearPassword('PasswordAdmin123!');

    const admin = await prisma.usuario.create({
      data: {
        nombre: 'Admin Operaciones',
        email: adminEmail,
        passwordHash: hash,
        rol: Rol.ADMIN,
        activo: true,
      },
    });
    adminId = admin.id;

    const mesero = await prisma.usuario.create({
      data: {
        nombre: 'Mesero Operaciones',
        email: meseroEmail,
        passwordHash: hash,
        rol: Rol.MESERO,
        activo: true,
      },
    });
    meseroId = mesero.id;

    const sesionAdmin = await crearSesionEnBd(adminId);
    adminToken = sesionAdmin.token;

    const sesionMesero = await crearSesionEnBd(meseroId);
    meseroToken = sesionMesero.token;

    // Obtener o crear una mesa habilitada y reservable
    let mesa = await prisma.mesa.findFirst({
      where: { reservable: true, habilitada: true },
    });
    if (!mesa) {
      mesa = await prisma.mesa.create({
        data: {
          nombre: 'Mesa Test B1',
          zona: ZonaMesa.INTERIOR,
          capacidad: 4,
          reservable: true,
          habilitada: true,
        },
      });
    }
    mesaTestId = mesa.id;

    sesionMockActiva = { token: adminToken, usuarioId: adminId };
  });

  afterAll(async () => {
    await prisma.diaBloqueado.deleteMany();
    await prisma.reservaMesa.deleteMany();
    await prisma.pedidoItem.deleteMany();
    await prisma.pedido.deleteMany({
      where: { clienteNombre: { startsWith: 'Test B' } },
    });
    await prisma.reserva.deleteMany({
      where: { clienteNombre: { startsWith: 'Test B' } },
    });
    await prisma.sesion.deleteMany({
      where: { usuario: { email: { in: [adminEmail, meseroEmail] } } },
    });
    await prisma.usuario.deleteMany({
      where: { email: { in: [adminEmail, meseroEmail] } },
    });
  });

  describe('Pedidos: Gestión, Total Acordado e Idempotencia', () => {
    it('mesero y admin pueden confirmar pedidos fijando totalAcordadoCentavos con auditoría', async () => {
      sesionMockActiva = { token: meseroToken, usuarioId: meseroId };

      const pedido = await prisma.pedido.create({
        data: {
          codigo: 'DF-TEST01',
          clienteNombre: 'Test B Cliente',
          clienteTelefono: '59178198181',
          fechaDeseada: new Date('2026-10-15T00:00:00.000Z'),
          estado: 'PENDIENTE',
        },
      });

      const res = await confirmarPedido(pedido.id, 15000); // Bs 150.00
      expect(res.id).toBe(pedido.id);

      const pedidoPost = await prisma.pedido.findUnique({ where: { id: pedido.id } });
      expect(pedidoPost?.estado).toBe('CONFIRMADO');
      expect(pedidoPost?.totalAcordadoCentavos).toBe(15000);
      expect(pedidoPost?.gestionadoPorId).toBe(meseroId);

      // Auditoría atómica registrada
      const auditoria = await prisma.auditoria.findFirst({
        where: { entidadId: pedido.id, accion: 'pedido.confirmar' },
      });
      expect(auditoria).not.toBeNull();
      expect(auditoria?.usuarioId).toBe(meseroId);
    });

    it('rechaza montos inválidos (no enteros o <= 0)', async () => {
      sesionMockActiva = { token: adminToken, usuarioId: adminId };

      const pedido = await prisma.pedido.create({
        data: {
          codigo: 'DF-TEST02',
          clienteNombre: 'Test B Inválido',
          clienteTelefono: '59178198181',
          fechaDeseada: new Date('2026-10-15T00:00:00.000Z'),
          estado: 'PENDIENTE',
        },
      });

      await expect(confirmarPedido(pedido.id, 0)).rejects.toThrow('monto entero positivo');
      await expect(confirmarPedido(pedido.id, -500)).rejects.toThrow('monto entero positivo');
      await expect(confirmarPedido(pedido.id, 12.5 as any)).rejects.toThrow('monto entero positivo');
    });

    it('confirmar dos veces es idempotente y no duplica auditoría', async () => {
      sesionMockActiva = { token: adminToken, usuarioId: adminId };

      const pedido = await prisma.pedido.create({
        data: {
          codigo: 'DF-TEST03',
          clienteNombre: 'Test B Idempotencia',
          clienteTelefono: '59178198181',
          fechaDeseada: new Date('2026-10-15T00:00:00.000Z'),
          estado: 'PENDIENTE',
        },
      });

      await confirmarPedido(pedido.id, 8000);
      const res2 = await confirmarPedido(pedido.id, 8000);
      expect(res2.id).toBe(pedido.id);

      const auditorias = await prisma.auditoria.count({
        where: { entidadId: pedido.id, accion: 'pedido.confirmar' },
      });
      expect(auditorias).toBe(1);
    });
  });

  describe('Eventos y Días Bloqueados (§5.4)', () => {
    const fechaEvento = new Date('2026-11-20T00:00:00.000Z');

    it('mesero NO puede confirmar ni cancelar eventos (recibe rechazo en servidor)', async () => {
      sesionMockActiva = { token: meseroToken, usuarioId: meseroId };

      const evento = await prisma.reserva.create({
        data: {
          codigo: 'DF-EVT01',
          tipo: TipoReserva.EVENTO,
          modalidad: ModalidadEvento.EN_LOCAL,
          clienteNombre: 'Test B Evento Ilegal',
          clienteTelefono: '59178198181',
          fecha: fechaEvento,
          personas: 10,
          estado: EstadoReserva.PENDIENTE,
        },
      });

      await expect(confirmarEvento(evento.id)).rejects.toThrow(/Acceso denegado/);
      await expect(cancelarEvento(evento.id)).rejects.toThrow(/Acceso denegado/);
    });

    it('EN_LOCAL con personas >= capacidad crea el DiaBloqueado vinculado; cancelarlo lo borra', async () => {
      sesionMockActiva = { token: adminToken, usuarioId: adminId };

      // Calcular capacidad actual
      const mesas = await prisma.mesa.findMany({ where: { reservable: true, habilitada: true } });
      const capacidadTotal = mesas.reduce((acc, m) => acc + m.capacidad, 0);

      const evento = await prisma.reserva.create({
        data: {
          codigo: 'DF-EVT02',
          tipo: TipoReserva.EVENTO,
          modalidad: ModalidadEvento.EN_LOCAL,
          clienteNombre: 'Test B Boda Grande',
          clienteTelefono: '59178198181',
          fecha: fechaEvento,
          personas: capacidadTotal, // >= capacidad
          estado: EstadoReserva.PENDIENTE,
        },
      });

      const res = await confirmarEvento(evento.id);
      expect(res.cerroLocal).toBe(true);

      // Debe existir DiaBloqueado con reservaId = evento.id
      const bloqueo = await prisma.diaBloqueado.findUnique({
        where: { fecha: fechaEvento },
      });
      expect(bloqueo).not.toBeNull();
      expect(bloqueo?.reservaId).toBe(evento.id);

      // Cancelar el evento debe borrar ÚNICAMENTE su bloqueo
      await cancelarEvento(evento.id);
      const bloqueoPost = await prisma.diaBloqueado.findUnique({
        where: { fecha: fechaEvento },
      });
      expect(bloqueoPost).toBeNull();
    });

    it('EN_LOCAL con personas < capacidad no crea bloqueo; asigna mesas y cancelarlo no borra bloqueo manual', async () => {
      sesionMockActiva = { token: adminToken, usuarioId: adminId };

      const fechaPequeno = new Date('2026-11-21T00:00:00.000Z');

      // Crear bloqueo manual previo del admin
      await bloquearDiaManual(fechaPequeno, 'Mantenimiento del local');

      const evento = await prisma.reserva.create({
        data: {
          codigo: 'DF-EVT03',
          tipo: TipoReserva.EVENTO,
          modalidad: ModalidadEvento.EN_LOCAL,
          clienteNombre: 'Test B Cumpleaños Pequeño',
          clienteTelefono: '59178198181',
          fecha: fechaPequeno,
          personas: 5, // < capacidad
          estado: EstadoReserva.PENDIENTE,
        },
      });

      const res = await confirmarEvento(evento.id, [mesaTestId]);
      expect(res.cerroLocal).toBe(false);

      // Verificar que se asignó la mesa
      const mesaAsignada = await prisma.reservaMesa.findUnique({
        where: { reservaId_mesaId: { reservaId: evento.id, mesaId: mesaTestId } },
      });
      expect(mesaAsignada).not.toBeNull();

      // Cancelar evento NO borra el bloqueo manual del admin
      await cancelarEvento(evento.id);

      const bloqueoSigue = await prisma.diaBloqueado.findUnique({
        where: { fecha: fechaPequeno },
      });
      expect(bloqueoSigue).not.toBeNull();
      expect(bloqueoSigue?.motivo).toBe('Mantenimiento del local');
    });

    it('ENTREGA no bloquea nada en el calendario', async () => {
      sesionMockActiva = { token: adminToken, usuarioId: adminId };

      const fechaEntrega = new Date('2026-11-22T00:00:00.000Z');

      const evento = await prisma.reserva.create({
        data: {
          codigo: 'DF-EVT04',
          tipo: TipoReserva.EVENTO,
          modalidad: ModalidadEvento.ENTREGA,
          clienteNombre: 'Test B Catering Externo',
          clienteTelefono: '59178198181',
          fecha: fechaEntrega,
          personas: 50,
          estado: EstadoReserva.PENDIENTE,
        },
      });

      const res = await confirmarEvento(evento.id);
      expect(res.cerroLocal).toBe(false);

      const bloqueo = await prisma.diaBloqueado.findUnique({
        where: { fecha: fechaEntrega },
      });
      expect(bloqueo).toBeNull();
    });

    it('dos eventos >= capacidad para la misma fecha: el segundo falla con mensaje claro y revierte transacción', async () => {
      sesionMockActiva = { token: adminToken, usuarioId: adminId };

      const fechaConflicto = new Date('2026-11-23T00:00:00.000Z');

      const evento1 = await prisma.reserva.create({
        data: {
          codigo: 'DF-EVT05A',
          tipo: TipoReserva.EVENTO,
          modalidad: ModalidadEvento.EN_LOCAL,
          clienteNombre: 'Test B Evento A',
          clienteTelefono: '59178198181',
          fecha: fechaConflicto,
          personas: 30,
          estado: EstadoReserva.PENDIENTE,
        },
      });

      const evento2 = await prisma.reserva.create({
        data: {
          codigo: 'DF-EVT05B',
          tipo: TipoReserva.EVENTO,
          modalidad: ModalidadEvento.EN_LOCAL,
          clienteNombre: 'Test B Evento B',
          clienteTelefono: '59178198181',
          fecha: fechaConflicto,
          personas: 30,
          estado: EstadoReserva.PENDIENTE,
        },
      });

      await confirmarEvento(evento1.id);

      // El segundo debe fallar de forma clara
      await expect(confirmarEvento(evento2.id)).rejects.toThrow(
        /ya se encuentra reservado y cerrado por otro evento/
      );

      // Verificar que el segundo no quedó a medias (sigue PENDIENTE)
      const ev2Post = await prisma.reserva.findUnique({ where: { id: evento2.id } });
      expect(ev2Post?.estado).toBe(EstadoReserva.PENDIENTE);
    });
  });

  describe('Reservas de Mesa: Asignación Anti Doble Reserva y Ciclo de Vida', () => {
    const fechaReserva = new Date('2026-10-30T00:00:00.000Z');

    it('impide doble reserva de la misma mesa en la misma fecha', async () => {
      sesionMockActiva = { token: meseroToken, usuarioId: meseroId };

      const r1 = await prisma.reserva.create({
        data: {
          codigo: 'DF-RES01A',
          tipo: TipoReserva.MESA,
          clienteNombre: 'Test B Reserva 1',
          clienteTelefono: '59178198181',
          fecha: fechaReserva,
          hora: '19:00',
          personas: 2,
          estado: EstadoReserva.PENDIENTE,
        },
      });

      const r2 = await prisma.reserva.create({
        data: {
          codigo: 'DF-RES01B',
          tipo: TipoReserva.MESA,
          clienteNombre: 'Test B Reserva 2',
          clienteTelefono: '59178198181',
          fecha: fechaReserva,
          hora: '19:30',
          personas: 2,
          estado: EstadoReserva.PENDIENTE,
        },
      });

      // Confirmar r1 asignándole mesaTestId
      await confirmarReservaMesa(r1.id, mesaTestId);

      // Intentar confirmar r2 con la MISMA mesaTestId debe fallar por colisión
      await expect(confirmarReservaMesa(r2.id, mesaTestId)).rejects.toThrow(
        /ya está asignada a otra reserva confirmada/
      );
    });

    it('transición válida de CONFIRMADA a CUMPLIDA con auditoría', async () => {
      sesionMockActiva = { token: meseroToken, usuarioId: meseroId };

      const r = await prisma.reserva.create({
        data: {
          codigo: 'DF-RES02',
          tipo: TipoReserva.MESA,
          clienteNombre: 'Test B Cumplir',
          clienteTelefono: '59178198181',
          fecha: fechaReserva,
          hora: '20:00',
          personas: 4,
          estado: EstadoReserva.CONFIRMADA,
          mesaId: mesaTestId,
        },
      });

      await marcarReservaCumplida(r.id);

      const rPost = await prisma.reserva.findUnique({ where: { id: r.id } });
      expect(rPost?.estado).toBe('CUMPLIDA');

      const audit = await prisma.auditoria.findFirst({
        where: { entidadId: r.id, accion: 'reserva.marcar_cumplida' },
      });
      expect(audit).not.toBeNull();
    });
  });
});

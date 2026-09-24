import { describe, it, expect } from 'vitest';
import { FormularioPedidoSchema } from '../lib/validaciones/pedido';
import { FormularioReservaSchema } from '../lib/validaciones/reserva';
import { FormularioEventoSchema } from '../lib/validaciones/evento';
import { FormularioSeguimientoSchema } from '../lib/validaciones/seguimiento';
import { obtenerHoyBolivia, fechaAYMD } from '../lib/fechas';

describe('lib/validaciones — Esquemas Zod de Formularios Públicos', () => {
  const hoy = obtenerHoyBolivia();
  const fechaHoyStr = fechaAYMD(hoy);
  const fechaFutura5Dias = fechaAYMD(new Date(hoy.getTime() + 5 * 24 * 60 * 60 * 1000));
  const fechaPasada = '2020-01-01';
  const fechaMuyLejana = '2030-01-01';

  describe('FormularioReservaSchema', () => {
    it('acepta una reserva válida', () => {
      const entrada = {
        nombre: 'Valeria Quiroga',
        telefono: '78198181',
        fecha: fechaFutura5Dias,
        hora: '17:30',
        personas: 4,
        zonaPreferencia: 'INTERIOR',
        conMascota: true,
        detalles: 'Mesa cerca a la ventana si es posible',
      };

      const res = FormularioReservaSchema.safeParse(entrada);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.telefono).toBe('59178198181');
        expect(res.data.personas).toBe(4);
      }
    });

    it('rechaza fecha en el pasado o más allá del horizonte de 60 días', () => {
      const resPasada = FormularioReservaSchema.safeParse({
        nombre: 'Valeria',
        telefono: '78198181',
        fecha: fechaPasada,
        hora: '17:30',
        personas: 2,
        zonaPreferencia: 'EXTERIOR',
      });
      expect(resPasada.success).toBe(false);

      const resLejana = FormularioReservaSchema.safeParse({
        nombre: 'Valeria',
        telefono: '78198181',
        fecha: fechaMuyLejana,
        hora: '17:30',
        personas: 2,
        zonaPreferencia: 'EXTERIOR',
      });
      expect(resLejana.success).toBe(false);
    });

    it('rechaza hora fuera del rango de atención (15:00 a 21:30)', () => {
      const resTemprano = FormularioReservaSchema.safeParse({
        nombre: 'Valeria',
        telefono: '78198181',
        fecha: fechaFutura5Dias,
        hora: '10:00', // Antes de 15:00
        personas: 2,
        zonaPreferencia: 'INTERIOR',
      });
      expect(resTemprano.success).toBe(false);

      const resTarde = FormularioReservaSchema.safeParse({
        nombre: 'Valeria',
        telefono: '78198181',
        fecha: fechaFutura5Dias,
        hora: '21:45', // Después de 21:30
        personas: 2,
        zonaPreferencia: 'INTERIOR',
      });
      expect(resTarde.success).toBe(false);
    });

    it('rechaza más de 18 personas (debe ir a Eventos)', () => {
      const res = FormularioReservaSchema.safeParse({
        nombre: 'Valeria',
        telefono: '78198181',
        fecha: fechaFutura5Dias,
        hora: '18:00',
        personas: 25,
        zonaPreferencia: 'INTERIOR',
      });
      expect(res.success).toBe(false);
    });
  });

  describe('FormularioEventoSchema', () => {
    it('acepta una solicitud de evento válida dentro de 180 días', () => {
      const fechaFutura60Dias = fechaAYMD(new Date(hoy.getTime() + 60 * 24 * 60 * 60 * 1000));
      const res = FormularioEventoSchema.safeParse({
        nombre: 'Carlos Ramos',
        telefono: '67012345',
        fecha: fechaFutura60Dias,
        modalidad: 'EN_LOCAL',
        personas: 20,
        ocasion: 'Cumpleaños 30',
        detalles: 'Torta artesanal de pistacho y café para 20 personas',
      });
      expect(res.success).toBe(true);
    });

    it('rechaza evento sin ocasión o con descripción menor a 5 caracteres', () => {
      const res = FormularioEventoSchema.safeParse({
        nombre: 'Carlos Ramos',
        telefono: '67012345',
        fecha: fechaFutura5Dias,
        modalidad: 'ENTREGA',
        personas: 10,
        ocasion: '',
        detalles: 'Hola',
      });
      expect(res.success).toBe(false);
    });
  });

  describe('FormularioPedidoSchema', () => {
    it('acepta un pedido con retiro y con ítems válidos', () => {
      const res = FormularioPedidoSchema.safeParse({
        nombre: 'Beatriz Mendez',
        telefono: '78198181',
        entrega: 'RETIRO',
        fechaDeseada: fechaHoyStr,
        items: [{ nombre: 'Torta Selva Negra', cantidad: 1 }],
      });
      expect(res.success).toBe(true);
    });

    it('exige dirección si la entrega es DOMICILIO', () => {
      const res = FormularioPedidoSchema.safeParse({
        nombre: 'Beatriz Mendez',
        telefono: '78198181',
        entrega: 'DOMICILIO',
        // direccionEntrega omitida
        fechaDeseada: fechaHoyStr,
        items: [{ nombre: 'Torta Selva Negra', cantidad: 1 }],
      });
      expect(res.success).toBe(false);
    });

    it('rechaza pedido con lista de ítems vacía', () => {
      const res = FormularioPedidoSchema.safeParse({
        nombre: 'Beatriz',
        telefono: '78198181',
        entrega: 'RETIRO',
        fechaDeseada: fechaHoyStr,
        items: [],
      });
      expect(res.success).toBe(false);
    });
  });

  describe('FormularioSeguimientoSchema', () => {
    it('acepta código DF-XXXXXX y 4 dígitos numéricos', () => {
      const res = FormularioSeguimientoSchema.safeParse({
        codigo: 'DF-A38K9P',
        ultimos4Digitos: '8181',
      });
      expect(res.success).toBe(true);
    });

    it('rechaza código con formato inválido o teléfono con más/menos de 4 dígitos', () => {
      expect(
        FormularioSeguimientoSchema.safeParse({
          codigo: '123456',
          ultimos4Digitos: '8181',
        }).success
      ).toBe(false);

      expect(
        FormularioSeguimientoSchema.safeParse({
          codigo: 'DF-A38K9P',
          ultimos4Digitos: '818', // 3 dígitos
        }).success
      ).toBe(false);

      expect(
        FormularioSeguimientoSchema.safeParse({
          codigo: 'DF-A38K9P',
          ultimos4Digitos: 'abcd', // No numérico
        }).success
      ).toBe(false);
    });
  });
});

import { Metadata } from 'next';
import { obtenerFechasBloqueadas } from '@/lib/servicios/disponibilidad';
import FormularioReserva from '@/components/publico/FormularioReserva';

export const metadata: Metadata = {
  title: 'Reservar Mesa | Dolce Florencia - Cafetería & Pastelería',
  description:
    'Reserva tu mesa en Dolce Florencia. Disfruta de un ambiente cálido en interior o al aire libre en nuestra terraza pet friendly.',
};

export const dynamic = 'force-dynamic';

export default async function ReservasPage() {
  const fechasBloqueadas = await obtenerFechasBloqueadas();

  return (
    <div className="pagina-formulario-wrap">
      <header className="pagina-formulario-hero">
        <div className="wrap">
          <span className="eyebrow">Cafetería & Salón de Té</span>
          <h1 className="pagina-formulario-titulo">Reserva tu Mesa</h1>
          <p className="pagina-formulario-subtitulo">
            Asegura tu lugar para disfrutar de una tarde dulce. Horario de atención: 15:00 a 22:00.
            Turnos de 90 minutos con 15 minutos de tolerancia. ¡Somos Pet Friendly!
          </p>
        </div>
      </header>

      <main className="wrap pagina-formulario-contenido">
        <FormularioReserva fechasBloqueadas={fechasBloqueadas} />
      </main>
    </div>
  );
}

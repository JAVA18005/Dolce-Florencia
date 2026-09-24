import { Metadata } from 'next';
import { obtenerFechasBloqueadas } from '@/lib/servicios/disponibilidad';
import FormularioEvento from '@/components/publico/FormularioEvento';

export const metadata: Metadata = {
  title: 'Eventos y Celebraciones | Dolce Florencia - Cafetería & Pastelería',
  description:
    'Celebra tus momentos especiales con Dolce Florencia. Salón exclusivo para reuniones íntimas o servicio de catering dulce para tus eventos.',
};

export const dynamic = 'force-dynamic';

export default async function EventosPage() {
  const fechasBloqueadas = await obtenerFechasBloqueadas();

  return (
    <div className="pagina-formulario-wrap">
      <header className="pagina-formulario-hero">
        <div className="wrap">
          <span className="eyebrow">Celebraciones Inolvidables</span>
          <h1 className="pagina-formulario-titulo">Eventos & Celebraciones</h1>
          <p className="pagina-formulario-subtitulo">
            Haz de tu cumpleaños, baby shower o festejo una experiencia memorable. Elige entre
            celebrar en nuestro local o coordinar una mesa dulce y torta a medida con entrega.
          </p>
        </div>
      </header>

      <main className="wrap pagina-formulario-contenido">
        <FormularioEvento fechasBloqueadas={fechasBloqueadas} />
      </main>
    </div>
  );
}

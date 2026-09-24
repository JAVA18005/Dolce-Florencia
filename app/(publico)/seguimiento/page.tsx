import { Metadata } from 'next';
import FormularioSeguimiento from '@/components/publico/FormularioSeguimiento';

export const metadata: Metadata = {
  title: 'Consultar Estado de Solicitud | Dolce Florencia',
  description:
    'Consulta el estado de tu pedido, reserva de mesa o evento utilizando tu código DF-XXXXXX y los últimos 4 dígitos de tu teléfono.',
};

export default function SeguimientoPage() {
  return (
    <div className="pagina-formulario-wrap">
      <header className="pagina-formulario-hero">
        <div className="wrap">
          <span className="eyebrow">Atención al Cliente</span>
          <h1 className="pagina-formulario-titulo">Seguimiento de Solicitud</h1>
          <p className="pagina-formulario-subtitulo">
            Verifica en tiempo real el estado de confirmación y preparación de tu pedido,
            reserva o evento registrado.
          </p>
        </div>
      </header>

      <main className="wrap pagina-formulario-contenido">
        <FormularioSeguimiento />
      </main>
    </div>
  );
}

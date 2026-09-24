import { Metadata } from 'next';
import prisma from '@/lib/db';
import { obtenerFechasBloqueadas } from '@/lib/servicios/disponibilidad';
import FormularioPedido from '@/components/publico/FormularioPedido';

export const metadata: Metadata = {
  title: 'Hacer un Pedido | Dolce Florencia - Cafetería & Pastelería Artesanal',
  description:
    'Solicita tus tortas artesanales, postres y pedidos especiales para retiro en pastelería o entrega a domicilio en Bolivia.',
};

export const revalidate = 60; // Revalidar catálogo cada 60s

interface PedidosPageProps {
  searchParams: Promise<{ producto?: string }>;
}

export default async function PedidosPage({ searchParams }: PedidosPageProps) {
  const params = await searchParams;
  const productoInicial = params.producto;

  // Obtener productos activos del menú
  const productos = await prisma.producto.findMany({
    where: { activo: true },
    select: {
      id: true,
      nombre: true,
      precioCentavos: true,
      categoria: {
        select: {
          nombre: true,
        },
      },
    },
    orderBy: [
      { categoria: { orden: 'asc' } },
      { nombre: 'asc' },
    ],
  });

  // Obtener días bloqueados para el calendario
  const fechasBloqueadas = await obtenerFechasBloqueadas();

  return (
    <div className="pagina-formulario-wrap">
      <header className="pagina-formulario-hero">
        <div className="wrap">
          <span className="eyebrow">Pastelería & Cafetería Artesanal</span>
          <h1 className="pagina-formulario-titulo">Haz tu Pedido</h1>
          <p className="pagina-formulario-subtitulo">
            Encarga tus tortas favoritas, bocaditos dulces o cajas de té. Puedes recoger en
            nuestro salón o solicitar entrega a domicilio.
          </p>
        </div>
      </header>

      <main className="wrap pagina-formulario-contenido">
        <FormularioPedido
          productos={productos}
          fechasBloqueadas={fechasBloqueadas}
          productoInicial={productoInicial}
        />
      </main>
    </div>
  );
}

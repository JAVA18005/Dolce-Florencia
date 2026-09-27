import Header from '@/components/publico/Header';
import Footer from '@/components/publico/Footer';
import { MovimientoProvider } from '@/components/movimiento/MovimientoContext';
import { ModoCamaraProvider } from '@/components/ar/ModoCamaraContext';

export default function PublicoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MovimientoProvider>
      <ModoCamaraProvider>
        <Header />
        <main id="contenido">{children}</main>
        <Footer />
      </ModoCamaraProvider>
    </MovimientoProvider>
  );
}

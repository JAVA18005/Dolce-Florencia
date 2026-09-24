import Header from '@/components/publico/Header';
import Footer from '@/components/publico/Footer';
import { MovimientoProvider } from '@/components/movimiento/MovimientoContext';

export default function PublicoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MovimientoProvider>
      <Header />
      <main id="contenido">{children}</main>
      <Footer />
    </MovimientoProvider>
  );
}

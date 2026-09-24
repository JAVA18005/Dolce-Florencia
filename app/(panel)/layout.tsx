import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Panel de Personal | Dolce Florencia',
  description: 'Sistema interno de gestión para personal de Dolce Florencia.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function PanelRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="panel-root-contenedor">{children}</div>;
}

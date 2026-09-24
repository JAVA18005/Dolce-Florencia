import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, DM_Sans } from 'next/font/google';
import '@/styles/dolce.css';
import '@/styles/clay.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Dolce Florencia · Pastelería Artesanal',
  description:
    'Cafetería y pastelería artesanal en Bolivia. El arte de celebrar en dulce con ingredientes seleccionados, ambiente pet-friendly y momentos inolvidables.',
  icons: {
    icon: '/brand/logo-pasteleria.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#2B2320',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}

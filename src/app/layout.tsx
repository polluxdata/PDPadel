import type { Metadata, Viewport } from 'next';
import { SessionProvider } from '@/lib/session';
import './globals.css';

export const metadata: Metadata = {
  title: 'PDPadel',
  description: 'Marcador y ranking de Pádel Americano',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'PDPadel',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#10b981',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased bg-slate-950 text-slate-100 min-h-dvh">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}

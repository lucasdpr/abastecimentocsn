import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { RegistrarServiceWorker } from '@/components/registrar-sw'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Central de Abastecimento', template: '%s · Central de Abastecimento' },
  description: 'Acompanhamento de ordens, follow-up, ativação e ANTECs da Central de Abastecimento de Manutenção.',
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: { capable: true, title: 'Abastecimento', statusBarStyle: 'default' },
  applicationName: 'Central de Abastecimento',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#16191d' },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased">
        {children}
        <RegistrarServiceWorker />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

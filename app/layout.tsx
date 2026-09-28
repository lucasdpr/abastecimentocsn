import { Analytics } from '@vercel/analytics/next'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import type { Metadata, Viewport } from 'next'
import { AtualizacaoApp } from '@/components/atualizacao-app'
import './globals.css'

// Dá mais tempo pro banco (Neon, plano grátis) acordar de uma hibernação antes
// da Vercel matar a função — o padrão (10s) é curto demais para isso.
export const maxDuration = 30

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
    { media: '(prefers-color-scheme: light)', color: '#f3f5f8' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0e13' },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <AtualizacaoApp />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

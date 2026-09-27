import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Central de Abastecimento',
    short_name: 'Abastecimento',
    description: 'Acompanhamento de ordens, follow-up, ativação e ANTECs da Central de Abastecimento de Manutenção.',
    lang: 'pt-BR',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#01265a',
    theme_color: '#01265a',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Consultar ordem', url: '/ordens', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
      { name: 'Cobranças', url: '/alertas', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
      { name: 'Assistente IA', url: '/assistente', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
    ],
  }
}

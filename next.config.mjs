/** @type {import('next').NextConfig} */
const nextConfig = {
  // exceljs roda no servidor (exportação); não precisa ser empacotado.
  serverExternalPackages: ['exceljs'],
  poweredByHeader: false,
  // Temporário: liga o mapa-fonte em produção pra investigar um erro que só
  // acontece lá (o console do navegador aí mostra nomes reais, não minificados).
  // Remover depois de identificar a causa — aumenta um pouco o tamanho do build.
  productionBrowserSourceMaps: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'same-origin' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
    ]
  },
}

export default nextConfig

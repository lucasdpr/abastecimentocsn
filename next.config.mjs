/** @type {import('next').NextConfig} */
const nextConfig = {
  // exceljs roda no servidor (exportação); não precisa ser empacotado.
  serverExternalPackages: ['exceljs'],
  poweredByHeader: false,
  // O script do robô é lido do disco pela rota de download.
  outputFileTracingIncludes: { '/api/robo/script': ['./robo/**'] },
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

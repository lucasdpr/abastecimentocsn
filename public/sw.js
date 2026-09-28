// Service worker do app. Só guarda arquivos estáticos e a página offline:
// dados da carteira NUNCA ficam em cache (são confidenciais e mudam a cada importação).
const VERSAO = 'abast-v2'
const ESTATICOS = ['/offline.html', '/icon-192.png', '/icon-512.png', '/favicon.ico']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSAO).then((cache) => cache.addAll(ESTATICOS)))
  // Ativa na hora: esperar o clique em "Atualizar" deixava apps instalados
  // presos numa versão antiga (e com bugs) do service worker indefinidamente.
  self.skipWaiting()
})

self.addEventListener('message', (event) => {
  if (event.data?.tipo === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('push', (event) => {
  let dados = { titulo: 'Central de Abastecimento', corpo: 'Você tem uma notificação nova.' }
  try {
    if (event.data) dados = { ...dados, ...event.data.json() }
  } catch {
    if (event.data) dados.corpo = event.data.text()
  }
  event.waitUntil(
    self.registration.showNotification(dados.titulo, {
      body: dados.corpo,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: dados.url || '/' },
      tag: dados.tag,
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
      for (const cliente of lista) {
        if (new URL(cliente.url).pathname === url && 'focus' in cliente) return cliente.focus()
      }
      return self.clients.openWindow(url)
    }),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((chaves) => Promise.all(chaves.filter((c) => c !== VERSAO).map((c) => caches.delete(c)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Navegação: sempre rede; sem conexão mostra a página offline.
  // Nunca devolve "nada" pro navegador — isso vira a tela genérica de erro
  // do próprio navegador em vez da nossa página offline estilizada.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(
        async () =>
          (await caches.match('/offline.html')) ||
          new Response('<h1>Sem conexão</h1><p>Tente novamente.</p>', { headers: { 'content-type': 'text/html; charset=utf-8' } }),
      ),
    )
    return
  }

  // Arquivos versionados do Next e ícones: cache primeiro.
  if (url.pathname.startsWith('/_next/static/') || ESTATICOS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (salvo) =>
          salvo ||
          fetch(request).then((resposta) => {
            if (resposta.ok) {
              const copia = resposta.clone()
              caches.open(VERSAO).then((cache) => cache.put(request, copia))
            }
            return resposta
          }),
      ),
    )
  }
})

// Service worker do app. Só guarda arquivos estáticos e a página offline:
// dados da carteira NUNCA ficam em cache (são confidenciais e mudam a cada importação).
const VERSAO = 'abast-v1'
const ESTATICOS = ['/offline.html', '/icon-192.png', '/icon-512.png', '/favicon.ico']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSAO).then((cache) => cache.addAll(ESTATICOS)))
  // Não ativa sozinho: fica "esperando" até o app pedir (botão "Atualizar"),
  // para não trocar a versão em uso sem o usuário saber.
})

self.addEventListener('message', (event) => {
  if (event.data?.tipo === 'SKIP_WAITING') self.skipWaiting()
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
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html')))
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

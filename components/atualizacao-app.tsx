'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

/**
 * Registra o service worker e mostra um botão flutuante "Atualizar" quando
 * existe uma versão nova publicada. A troca só acontece quando o usuário
 * clica — nunca sozinha, para não recarregar a tela no meio de um trabalho.
 */
export function AtualizacaoApp() {
  const [espera, setEspera] = useState<ServiceWorker | null>(null)
  const [atualizando, setAtualizando] = useState(false)

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return

    let cancelado = false

    function observar(registro: ServiceWorkerRegistration) {
      if (registro.waiting && registro.active) setEspera(registro.waiting)
      registro.addEventListener('updatefound', () => {
        const instalando = registro.installing
        if (!instalando) return
        instalando.addEventListener('statechange', () => {
          // Só é "atualização" se já havia um service worker controlando a página antes.
          if (instalando.state === 'installed' && navigator.serviceWorker.controller && !cancelado) {
            setEspera(registro.waiting)
          }
        })
      })
    }

    navigator.serviceWorker
      .register('/sw.js')
      .then((registro) => {
        observar(registro)
        // Confere de tempos em tempos se já saiu versão nova (o navegador já faz isso a cada navegação).
        const intervalo = setInterval(() => registro.update().catch(() => {}), 60 * 60 * 1000)
        return () => clearInterval(intervalo)
      })
      .catch(() => {})

    let recarregando = false
    // Na primeira instalação não há versão antiga a substituir: não recarrega.
    const tinhaControlador = !!navigator.serviceWorker.controller
    const aoTrocarControlador = () => {
      if (recarregando || !tinhaControlador) return
      recarregando = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', aoTrocarControlador)
    return () => {
      cancelado = true
      navigator.serviceWorker.removeEventListener('controllerchange', aoTrocarControlador)
    }
  }, [])

  if (!espera) return null

  return (
    <div className="fixed inset-x-4 bottom-20 z-40 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-lg sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-80">
      <span className="text-sm text-ink">Nova versão disponível</span>
      <button
        className="btn btn-primary btn-sm shrink-0"
        disabled={atualizando}
        onClick={() => {
          setAtualizando(true)
          espera.postMessage({ tipo: 'SKIP_WAITING' })
        }}
      >
        {atualizando ? <RefreshCw className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
        {atualizando ? 'Atualizando…' : 'Atualizar'}
      </button>
    </div>
  )
}

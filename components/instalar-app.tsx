'use client'

import { useEffect, useState } from 'react'
import { Download, Share, SquarePlus, X } from 'lucide-react'

type EventoInstalacao = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function emStandalone() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
}

/** Botão para instalar o app. No Android/Chrome dispara o prompt nativo; no iPhone mostra o passo a passo (a Apple não tem prompt automático). */
export function InstalarApp() {
  const [prompt, setPrompt] = useState<EventoInstalacao | null>(null)
  const [instalado, setInstalado] = useState(true)
  const [ios, setIos] = useState(false)
  const [instrucoesIos, setInstrucoesIos] = useState(false)

  useEffect(() => {
    setInstalado(emStandalone())
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream)

    const aoPropor = (evento: Event) => {
      evento.preventDefault()
      setPrompt(evento as EventoInstalacao)
    }
    const aoInstalar = () => {
      setInstalado(true)
      setPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', aoPropor)
    window.addEventListener('appinstalled', aoInstalar)
    return () => {
      window.removeEventListener('beforeinstallprompt', aoPropor)
      window.removeEventListener('appinstalled', aoInstalar)
    }
  }, [])

  if (instalado || (!prompt && !ios)) return null

  return (
    <>
      <button
        className="btn w-full"
        onClick={async () => {
          if (prompt) {
            await prompt.prompt()
            const { outcome } = await prompt.userChoice
            if (outcome === 'accepted') setPrompt(null)
            return
          }
          setInstrucoesIos(true)
        }}
      >
        <Download className="size-4" /> Instalar aplicativo
      </button>

      {instrucoesIos && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 sm:place-items-center" role="dialog" aria-modal onClick={() => setInstrucoesIos(false)}>
          <div className="w-full max-w-sm rounded-t-2xl bg-surface p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Instalar no iPhone</h2>
              <button className="grid size-8 place-items-center rounded-lg hover:bg-surface-2" onClick={() => setInstrucoesIos(false)} aria-label="Fechar">
                <X className="size-4" />
              </button>
            </div>
            <ol className="space-y-3 text-sm text-ink-2">
              <li className="flex items-center gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand">1</span>
                Toque em <Share className="mx-1 inline size-4 align-text-bottom" /> <b>Compartilhar</b>, na barra do Safari.
              </li>
              <li className="flex items-center gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand">2</span>
                Escolha <SquarePlus className="mx-1 inline size-4 align-text-bottom" /> <b>Adicionar à Tela de Início</b>.
              </li>
              <li className="flex items-center gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand">3</span>
                Toque em <b>Adicionar</b>.
              </li>
            </ol>
          </div>
        </div>
      )}
    </>
  )
}

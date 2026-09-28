'use client'

import { useEffect, useState } from 'react'
import { Download, EllipsisVertical, Share, SquarePlus, X } from 'lucide-react'

type EventoInstalacao = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Instrucao = 'ios' | 'manual' | null

function emStandalone() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
}

/**
 * Botão para instalar o app. No Android/Chrome/Edge, se o navegador dispara o prompt nativo
 * (`beforeinstallprompt`), usa ele; no iPhone (que nunca dispara esse evento) mostra o passo a
 * passo do Safari. Em qualquer outro caso — o evento nativo depende de critérios de engajamento
 * do navegador e pode nunca disparar — mostra o passo a passo manual do menu do navegador, em
 * vez de simplesmente esconder o botão.
 */
export function InstalarApp() {
  const [prompt, setPrompt] = useState<EventoInstalacao | null>(null)
  const [instalado, setInstalado] = useState(true)
  const [ios, setIos] = useState(false)
  const [instrucao, setInstrucao] = useState<Instrucao>(null)

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

  if (instalado) return null

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
          setInstrucao(ios ? 'ios' : 'manual')
        }}
      >
        <Download className="size-4" /> Instalar aplicativo
      </button>

      {instrucao && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 sm:place-items-center" role="dialog" aria-modal onClick={() => setInstrucao(null)}>
          <div className="w-full max-w-sm rounded-t-2xl bg-surface p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Instalar {instrucao === 'ios' ? 'no iPhone' : 'o aplicativo'}</h2>
              <button className="grid size-8 place-items-center rounded-lg hover:bg-surface-2" onClick={() => setInstrucao(null)} aria-label="Fechar">
                <X className="size-4" />
              </button>
            </div>
            {instrucao === 'ios' ? (
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
            ) : (
              <ol className="space-y-3 text-sm text-ink-2">
                <li className="flex items-center gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand">1</span>
                  Abra o menu <EllipsisVertical className="mx-1 inline size-4 align-text-bottom" /> do navegador (canto superior direito).
                </li>
                <li className="flex items-center gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand">2</span>
                  No Edge, escolha <b>Aplicativos → Instalar este site como um aplicativo</b>. No Chrome, <b>Salvar e compartilhar → Instalar página como app</b>.
                </li>
                <li className="flex items-center gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand">3</span>
                  Confirme em <b>Instalar</b>.
                </li>
              </ol>
            )}
          </div>
        </div>
      )}
    </>
  )
}

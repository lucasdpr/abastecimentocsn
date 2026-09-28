'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, BellRing } from 'lucide-react'
import { desinscreverPush, inscreverPush, testarPush } from '@/app/acoes'

function urlBase64ParaUint8Array(base64: string) {
  const preenchimento = '='.repeat((4 - (base64.length % 4)) % 4)
  const base64Normal = (base64 + preenchimento).replace(/-/g, '+').replace(/_/g, '/')
  const bruto = atob(base64Normal)
  return Uint8Array.from([...bruto].map((c) => c.charCodeAt(0)))
}

type Estado = 'indisponivel' | 'negado' | 'inativo' | 'ativo' | 'carregando'

export function NotificacoesPush() {
  const [estado, setEstado] = useState<Estado>('carregando')
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function checar() {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        setEstado('indisponivel')
        return
      }
      if (Notification.permission === 'denied') {
        setEstado('negado')
        return
      }
      try {
        const registro = await navigator.serviceWorker.ready
        const inscricao = await registro.pushManager.getSubscription()
        setEstado(inscricao ? 'ativo' : 'inativo')
      } catch {
        setEstado('inativo')
      }
    }
    checar()
  }, [])

  async function ativar() {
    setErro('')
    const chave = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!chave) {
      setErro('Notificações não configuradas neste ambiente.')
      return
    }
    setEstado('carregando')
    try {
      const permissao = await Notification.requestPermission()
      if (permissao !== 'granted') {
        setEstado(permissao === 'denied' ? 'negado' : 'inativo')
        return
      }
      const registro = await navigator.serviceWorker.ready
      const inscricao = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ParaUint8Array(chave),
      })
      await inscreverPush(inscricao.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } })
      setEstado('ativo')
    } catch (e) {
      setErro('Não foi possível ativar. Tente de novo.')
      setEstado('inativo')
      console.error(e)
    }
  }

  async function desativar() {
    setEstado('carregando')
    try {
      const registro = await navigator.serviceWorker.ready
      const inscricao = await registro.pushManager.getSubscription()
      if (inscricao) {
        await desinscreverPush(inscricao.endpoint)
        await inscricao.unsubscribe()
      }
      setEstado('inativo')
    } catch {
      setEstado('ativo')
    }
  }

  if (estado === 'indisponivel') return <p className="text-sm text-muted">Notificações não são suportadas neste navegador.</p>
  if (estado === 'carregando') return <p className="text-sm text-muted">Verificando…</p>
  if (estado === 'negado') {
    return <p className="text-sm text-muted">Você bloqueou as notificações para este site. Libere nas permissões do navegador para ativar.</p>
  }

  return (
    <div className="space-y-3">
      {estado === 'ativo' ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-sm text-good-ink">
            <BellRing className="size-4" /> Notificações ativadas neste aparelho
          </span>
          <button className="btn btn-sm" onClick={desativar}>
            <BellOff className="size-3.5" /> Desativar
          </button>
          <button className="btn btn-sm" onClick={() => testarPush()}>
            Enviar teste
          </button>
        </div>
      ) : (
        <button className="btn" onClick={ativar}>
          <Bell className="size-4" /> Ativar notificações
        </button>
      )}
      {erro && <p className="text-xs text-crit-ink">{erro}</p>}
    </div>
  )
}

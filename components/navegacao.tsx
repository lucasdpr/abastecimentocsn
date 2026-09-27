'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Bell,
  Bot,
  ClipboardList,
  FileClock,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageCheck,
  Settings,
  Truck,
  Upload,
  X,
  type LucideIcon,
} from 'lucide-react'
import { sair } from '@/app/acoes'
import { cn } from '@/lib/utils'

type Item = { href: string; rotulo: string; icone: LucideIcon; perfis?: string[]; selo?: number }

const GESTAO = ['admin', 'abastecimento', 'gerencia']
const EDICAO = ['admin', 'abastecimento']

export function Navegacao({ nome, perfil, perfilRotulo, alertas }: { nome: string; perfil: string; perfilRotulo: string; alertas: number }) {
  const caminho = usePathname()
  const [aberto, setAberto] = useState(false)
  useEffect(() => setAberto(false), [caminho])

  const itens: Item[] = [
    { href: '/', rotulo: 'Painel', icone: LayoutDashboard, perfis: GESTAO },
    { href: '/ordens', rotulo: 'Ordens', icone: ClipboardList },
    { href: '/alertas', rotulo: 'Cobranças', icone: Bell, perfis: GESTAO, selo: alertas },
    { href: '/fup', rotulo: 'Follow-up', icone: Truck, perfis: GESTAO },
    { href: '/ativacao', rotulo: 'Ativação', icone: PackageCheck, perfis: GESTAO },
    { href: '/antec', rotulo: 'ANTECs', icone: FileClock, perfis: GESTAO },
    { href: '/assistente', rotulo: 'Assistente IA', icone: Bot },
    { href: '/importar', rotulo: 'Importar / Excel', icone: Upload, perfis: EDICAO },
    { href: '/configuracoes', rotulo: 'Configurações', icone: Settings },
  ].filter((i) => !i.perfis || i.perfis.includes(perfil))

  const ativo = (href: string) => (href === '/' ? caminho === '/' : caminho.startsWith(href))
  const inferior = itens.filter((i) => ['/', '/ordens', '/alertas', '/assistente'].includes(i.href)).slice(0, 4)

  const lista = (
    <nav className="flex flex-col gap-0.5">
      {itens.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={cn(
            'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
            ativo(i.href) ? 'bg-brand-soft text-brand' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
          )}
        >
          <i.icone className="size-4 shrink-0" aria-hidden />
          <span className="flex-1">{i.rotulo}</span>
          {!!i.selo && <span className="rounded-full bg-crit px-1.5 py-0.5 text-[11px] leading-none font-semibold text-white">{i.selo}</span>}
        </Link>
      ))}
    </nav>
  )

  const rodape = (
    <div className="border-t border-line pt-3">
      <div className="px-3 text-sm font-medium text-ink">{nome}</div>
      <div className="px-3 text-xs text-muted">{perfilRotulo}</div>
      <form action={sair}>
        <button className="mt-2 flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm text-ink-2 hover:bg-surface-2" type="submit">
          <LogOut className="size-4" aria-hidden /> Sair
        </button>
      </form>
    </div>
  )

  const marca = (
    <Link href="/" className="flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-192.png" alt="" width={32} height={32} className="size-8 rounded-lg" />
      <span className="leading-tight">
        <span className="block text-sm font-semibold text-ink">Central de Abastecimento</span>
        <span className="block text-[11px] text-muted">Manutenção · CSN</span>
      </span>
    </Link>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col gap-6 border-r border-line bg-surface p-3 lg:flex">
        <div className="px-2 pt-2">{marca}</div>
        <div className="flex-1 overflow-y-auto">{lista}</div>
        {rodape}
      </aside>

      {/* Mobile: barra superior */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur lg:hidden">
        {marca}
        <button className="grid size-10 place-items-center rounded-lg text-ink-2 hover:bg-surface-2" onClick={() => setAberto(true)} aria-label="Abrir menu">
          <Menu className="size-5" />
        </button>
      </header>

      {aberto && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal>
          <button className="absolute inset-0 bg-black/40" onClick={() => setAberto(false)} aria-label="Fechar menu" />
          <div className="absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col gap-4 bg-surface p-3 shadow-xl">
            <div className="flex items-center justify-between px-2 pt-1">
              <span className="text-sm font-semibold">Menu</span>
              <button className="grid size-10 place-items-center rounded-lg hover:bg-surface-2" onClick={() => setAberto(false)} aria-label="Fechar">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{lista}</div>
            {rodape}
          </div>
        </div>
      )}

      {/* Mobile: navegação inferior */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" style={{ gridTemplateColumns: `repeat(${inferior.length + 1}, minmax(0, 1fr))` }}>
        {inferior.map((i) => (
          <Link key={i.href} href={i.href} className={cn('relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium', ativo(i.href) ? 'text-brand' : 'text-muted')}>
            <i.icone className="size-5" aria-hidden />
            {i.rotulo === 'Assistente IA' ? 'IA' : i.rotulo}
            {!!i.selo && <span className="absolute top-2 left-1/2 ml-2 rounded-full bg-crit px-1.5 text-[10px] leading-4 font-semibold text-white">{i.selo}</span>}
          </Link>
        ))}
        <button className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted" onClick={() => setAberto(true)}>
          <Menu className="size-5" aria-hidden />
          Mais
        </button>
      </nav>
    </>
  )
}

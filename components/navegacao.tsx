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

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes.at(-1)![0] : (partes[0]?.[1] ?? ''))).toUpperCase()
}

export function Navegacao({ nome, perfil, perfilRotulo, alertas }: { nome: string; perfil: string; perfilRotulo: string; alertas: number }) {
  const caminho = usePathname()
  const [aberto, setAberto] = useState(false)
  useEffect(() => setAberto(false), [caminho])

  const secoes: Array<{ titulo: string; itens: Item[] }> = [
    { titulo: 'Visão geral', itens: [{ href: '/', rotulo: 'Painel', icone: LayoutDashboard, perfis: GESTAO }] },
    {
      titulo: 'Operação',
      itens: [
        { href: '/ordens', rotulo: 'Ordens', icone: ClipboardList },
        { href: '/alertas', rotulo: 'Cobranças', icone: Bell, perfis: GESTAO, selo: alertas },
        { href: '/fup', rotulo: 'Follow-up', icone: Truck, perfis: GESTAO },
        { href: '/ativacao', rotulo: 'Ativação', icone: PackageCheck, perfis: GESTAO },
        { href: '/antec', rotulo: 'ANTECs', icone: FileClock, perfis: GESTAO },
      ],
    },
    {
      titulo: 'Ferramentas',
      itens: [
        { href: '/assistente', rotulo: 'Assistente IA', icone: Bot },
        { href: '/importar', rotulo: 'Importar / Excel', icone: Upload, perfis: EDICAO },
        { href: '/configuracoes', rotulo: 'Configurações', icone: Settings },
      ],
    },
  ]
    .map((s) => ({ ...s, itens: s.itens.filter((i) => !i.perfis || i.perfis.includes(perfil)) }))
    .filter((s) => s.itens.length)
  const itens = secoes.flatMap((s) => s.itens)

  const ativo = (href: string) => (href === '/' ? caminho === '/' : caminho.startsWith(href))
  const inferior = itens.filter((i) => ['/', '/ordens', '/alertas', '/assistente'].includes(i.href)).slice(0, 4)

  const lista = (
    <nav className="flex flex-col gap-5" aria-label="Principal">
      {secoes.map((s) => (
        <div key={s.titulo}>
          <p className="eyebrow mb-1.5 px-3">{s.titulo}</p>
          <div className="flex flex-col gap-0.5">
            {s.itens.map((i) => {
              const atual = ativo(i.href)
              return (
                <Link
                  key={i.href}
                  href={i.href}
                  aria-current={atual ? 'page' : undefined}
                  className={cn(
                    'relative flex h-9 items-center gap-3 rounded-lg px-3 text-[13.5px] font-medium transition-colors',
                    atual ? 'bg-brand-soft text-ink' : 'text-ink-2 hover:bg-surface-3 hover:text-ink',
                  )}
                >
                  {atual && <span className="absolute top-2 bottom-2 -left-3 w-[3px] rounded-r-full bg-accent" aria-hidden />}
                  <i.icone className={cn('size-4 shrink-0', atual ? 'text-accent' : 'text-muted')} aria-hidden />
                  <span className="flex-1">{i.rotulo}</span>
                  {!!i.selo && (
                    <span className="num rounded-md bg-crit px-1.5 py-0.5 text-[11px] leading-none font-semibold text-white" aria-label={`${i.selo} alertas`}>
                      {i.selo}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )

  const rodape = (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-brand text-xs font-semibold text-brand-ink" aria-hidden>
        {iniciais(nome)}
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-sm font-medium text-ink">{nome}</div>
        <div className="truncate text-xs text-muted">{perfilRotulo}</div>
      </div>
      <form action={sair}>
        <button className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-3 hover:text-ink" type="submit" aria-label="Sair" title="Sair">
          <LogOut className="size-4" aria-hidden />
        </button>
      </form>
    </div>
  )

  const marca = (
    <Link href="/" className="flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-192.png" alt="" width={32} height={32} className="size-8 rounded-[10px] shadow-card" />
      <span className="leading-tight">
        <span className="block text-sm font-semibold tracking-[-0.01em] text-ink">Central de Abastecimento</span>
        <span className="block text-[11px] text-muted">Manutenção · CSN</span>
      </span>
    </Link>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-6 border-r border-line bg-surface px-3 py-4 lg:flex">
        <div className="px-2">{marca}</div>
        <div className="-mx-3 flex-1 overflow-y-auto px-3">{lista}</div>
        {rodape}
      </aside>

      {/* Mobile: barra superior */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface/85 px-4 backdrop-blur-md lg:hidden">
        {marca}
        <button className="grid size-10 place-items-center rounded-lg text-ink-2 hover:bg-surface-3" onClick={() => setAberto(true)} aria-label="Abrir menu">
          <Menu className="size-5" />
        </button>
      </header>

      {aberto && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal aria-label="Menu">
          <button className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={() => setAberto(false)} aria-label="Fechar menu" />
          <div className="absolute inset-y-0 right-0 flex w-76 max-w-[86vw] flex-col gap-5 bg-surface px-3 py-4 shadow-alta">
            <div className="flex items-center justify-between px-2">
              <span className="text-sm font-semibold">Menu</span>
              <button className="grid size-10 place-items-center rounded-lg hover:bg-surface-3" onClick={() => setAberto(false)} aria-label="Fechar">
                <X className="size-5" />
              </button>
            </div>
            <div className="-mx-3 flex-1 overflow-y-auto px-3">{lista}</div>
            {rodape}
          </div>
        </div>
      )}

      {/* Mobile: navegação inferior */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
        style={{ gridTemplateColumns: `repeat(${inferior.length + 1}, minmax(0, 1fr))` }}
        aria-label="Atalhos"
      >
        {inferior.map((i) => {
          const atual = ativo(i.href)
          return (
            <Link
              key={i.href}
              href={i.href}
              aria-current={atual ? 'page' : undefined}
              className={cn('relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors', atual ? 'text-accent' : 'text-muted')}
            >
              {atual && <span className="absolute top-0 h-[3px] w-8 rounded-b-full bg-accent" aria-hidden />}
              <i.icone className="size-5" aria-hidden />
              {i.rotulo === 'Assistente IA' ? 'IA' : i.rotulo}
              {!!i.selo && <span className="num absolute top-2 left-1/2 ml-2 rounded-md bg-crit px-1.5 text-[10px] leading-4 font-semibold text-white">{i.selo}</span>}
            </Link>
          )
        })}
        <button className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted" onClick={() => setAberto(true)}>
          <Menu className="size-5" aria-hidden />
          Mais
        </button>
      </nav>
    </>
  )
}

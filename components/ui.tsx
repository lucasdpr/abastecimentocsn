import Link from 'next/link'
import { TriangleAlert, ArrowUpRight, CircleCheckBig, CircleDot, Clock, Inbox, Search, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Cabecalho({ titulo, descricao, acoes, sobre }: { titulo: string; descricao?: string; acoes?: React.ReactNode; sobre?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {sobre && <p className="eyebrow mb-1.5">{sobre}</p>}
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink md:text-[28px]">{titulo}</h1>
        {descricao && <p className="mt-1.5 max-w-2xl text-sm text-muted">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  )
}

type Tom = 'neutro' | 'bom' | 'alerta' | 'critico' | 'info'

const TONS: Record<Tom, string> = {
  neutro: 'bg-surface-3 text-ink-2',
  bom: 'bg-good-soft text-good-ink',
  alerta: 'bg-warn-soft text-warn-ink',
  critico: 'bg-crit-soft text-crit-ink',
  info: 'bg-brand-soft text-accent',
}

const ICONES: Partial<Record<Tom, LucideIcon>> = { bom: CircleCheckBig, alerta: Clock, critico: TriangleAlert, info: CircleDot }

export function Selo({ tom = 'neutro', children, icone = true }: { tom?: Tom; children: React.ReactNode; icone?: boolean }) {
  const Icone = icone ? ICONES[tom] : undefined
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap', TONS[tom])}>
      {Icone && <Icone className="size-3" aria-hidden />}
      {children}
    </span>
  )
}

export function Kpi({
  rotulo,
  valor,
  detalhe,
  tom,
  href,
  icone: Icone,
  className,
}: {
  rotulo: string
  valor: React.ReactNode
  detalhe?: React.ReactNode
  tom?: Tom
  href?: string
  icone?: LucideIcon
  className?: string
}) {
  const IconeTom = tom === 'critico' ? TriangleAlert : tom === 'alerta' ? Clock : undefined
  const conteudo = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-xs leading-snug font-medium text-muted">
          {Icone && (
            <span className="hidden size-6 shrink-0 place-items-center rounded-lg bg-surface-3 text-ink-2 sm:grid">
              <Icone className="size-3.5" aria-hidden />
            </span>
          )}
          <span className="line-clamp-3 sm:line-clamp-2">{rotulo}</span>
        </span>
        {href && <ArrowUpRight className="size-3.5 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[26px] leading-none font-semibold tracking-[-0.02em] whitespace-nowrap text-ink md:text-[28px]">
        {valor}
        {IconeTom && <IconeTom className={cn('size-4', tom === 'critico' ? 'text-crit' : 'text-warn-ink')} aria-label={tom === 'critico' ? 'Crítico' : 'Atenção'} />}
      </div>
      {detalhe && <div className="mt-2 text-xs text-muted">{detalhe}</div>}
    </>
  )
  const classe = cn('card group block min-w-0 p-4 md:p-5', tom === 'critico' && 'border-crit/30', className)
  return href ? (
    <Link href={href} className={cn(classe, 'card-link')}>
      {conteudo}
    </Link>
  ) : (
    <div className={classe}>{conteudo}</div>
  )
}

export function Painel({
  titulo,
  descricao,
  acao,
  children,
  className,
  corpo,
  id,
}: {
  id?: string
  titulo: string
  descricao?: string
  acao?: React.ReactNode
  children: React.ReactNode
  className?: string
  /** "tabela": conteúdo encosta nas bordas do cartão (tabelas). */
  corpo?: 'padrao' | 'tabela'
}) {
  return (
    <section id={id} className={cn('card min-w-0 scroll-mt-20', corpo === 'tabela' ? 'overflow-hidden' : 'p-4 md:p-5', className)}>
      <div className={cn('flex items-start justify-between gap-3', corpo === 'tabela' ? 'border-b border-line px-4 py-3.5 md:px-5' : 'mb-4')}>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{titulo}</h2>
          {descricao && <p className="mt-0.5 text-xs text-muted">{descricao}</p>}
        </div>
        {acao}
      </div>
      {children}
    </section>
  )
}

/** Barras horizontais de uma série, com rótulo direto e tooltip nativo. */
export function Barras({
  itens,
  formatar = (v) => String(v),
  cor = 'var(--series-1)',
}: {
  itens: Array<{ rotulo: string; valor: number; detalhe?: string; href?: string; cor?: string; icone?: LucideIcon }>
  formatar?: (v: number) => string
  cor?: string
}) {
  const max = Math.max(1, ...itens.map((item) => item.valor))
  if (!itens.length) return <Vazio texto="Sem dados ainda." />
  return (
    <ul className="space-y-3">
      {itens.map((item) => {
        const Icone = item.icone
        const linha = (
          <>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
              <span className="flex min-w-0 items-center gap-1.5 text-ink-2">
                {Icone && <Icone className="size-3.5 shrink-0" aria-hidden />}
                <span className="truncate">{item.rotulo}</span>
              </span>
              <span className="num shrink-0 font-medium text-ink">{formatar(item.valor)}</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: 'var(--grid)' }}>
              <div
                className="h-1.5 rounded-full transition-[width] duration-500"
                style={{ width: `${item.valor ? Math.max(1.5, (item.valor / max) * 100) : 0}%`, background: item.cor ?? cor }}
              />
            </div>
            {item.detalhe && <div className="mt-1 text-[11px] text-muted">{item.detalhe}</div>}
          </>
        )
        return (
          <li key={item.rotulo} title={`${item.rotulo}: ${formatar(item.valor)}${item.detalhe ? ` · ${item.detalhe}` : ''}`}>
            {item.href ? (
              <Link href={item.href} className="-mx-2 block rounded-lg px-2 py-1 transition-colors hover:bg-surface-2">
                {linha}
              </Link>
            ) : (
              linha
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** Barra fina de proporção (0–1) para usar dentro de tabelas. */
export function Medidor({ fracao, cor = 'var(--series-1)', rotulo }: { fracao: number; cor?: string; rotulo: string }) {
  const pct = Math.max(0, Math.min(1, fracao)) * 100
  return (
    <div className="flex items-center gap-2" title={rotulo}>
      <div className="h-1.5 w-full min-w-12 rounded-full" style={{ background: 'var(--grid)' }} aria-hidden>
        <div className="h-1.5 rounded-full" style={{ width: `${pct ? Math.max(2, pct) : 0}%`, background: cor }} />
      </div>
      <span className="num w-10 shrink-0 text-right text-xs text-muted">{pct.toLocaleString('pt-BR', { maximumFractionDigits: pct < 10 ? 1 : 0 })}%</span>
    </div>
  )
}

/** Barra de composição (parte do todo), com legenda sempre visível. */
export function Composicao({ partes, formatar = (v) => v.toLocaleString('pt-BR') }: { partes: Array<{ rotulo: string; valor: number; cor: string }>; formatar?: (v: number) => string }) {
  const total = partes.reduce((s, p) => s + p.valor, 0)
  if (!total) return null
  const visiveis = partes.filter((p) => p.valor > 0)
  return (
    <div>
      <div className="flex h-2.5 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={visiveis.map((p) => `${p.rotulo}: ${formatar(p.valor)}`).join('; ')}>
        {visiveis.map((p) => (
          <div key={p.rotulo} className="h-full min-w-[3px] first:rounded-l-full last:rounded-r-full" style={{ width: `${(p.valor / total) * 100}%`, background: p.cor }} title={`${p.rotulo}: ${formatar(p.valor)}`} />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-x-4 gap-y-2">
        {partes.map((p) => (
          <li key={p.rotulo} className="flex min-w-0 items-start gap-2 text-xs">
            <span className="mt-1 size-2 shrink-0 rounded-[3px]" style={{ background: p.cor }} aria-hidden />
            <span className="min-w-0">
              <span className="block truncate text-ink-2">{p.rotulo}</span>
              <span className="num block font-medium text-ink">
                {formatar(p.valor)} <span className="font-normal text-muted">· {((p.valor / total) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span>
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Vazio({ texto, acao }: { texto: string; acao?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line-strong/70 px-4 py-10 text-center text-sm text-muted">
      <span className="grid size-10 place-items-center rounded-xl bg-surface-3 text-ink-2">
        <Inbox className="size-5" aria-hidden />
      </span>
      <p className="max-w-sm">{texto}</p>
      {acao}
    </div>
  )
}

/** Links de filtro em linha (preservam os demais parâmetros). */
export function Filtros({
  base,
  parametros,
  chave,
  opcoes,
}: {
  base: string
  parametros: Record<string, string | undefined>
  chave: string
  opcoes: Array<{ valor: string; rotulo: string }>
}) {
  const atual = parametros[chave] ?? ''
  return (
    <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
      {opcoes.map((o) => {
        const p = new URLSearchParams(Object.entries(parametros).filter(([k, v]) => v && k !== chave && k !== 'pagina') as [string, string][])
        if (o.valor) p.set(chave, o.valor)
        const ativo = atual === o.valor
        return (
          <Link
            key={o.valor}
            href={`${base}${p.size ? `?${p}` : ''}`}
            aria-current={ativo ? 'page' : undefined}
            className={cn(
              'shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
              ativo ? 'border-transparent bg-ink text-surface' : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink',
            )}
          >
            {o.rotulo}
          </Link>
        )
      })}
    </div>
  )
}

/** Abas de visão (lista/gráficos) que preservam os filtros da URL. */
export function Abas({
  base,
  parametros,
  chave,
  opcoes,
}: {
  base: string
  parametros: Record<string, string | undefined>
  chave: string
  opcoes: Array<{ valor: string; rotulo: string; icone?: LucideIcon }>
}) {
  const atual = parametros[chave] ?? ''
  return (
    <div className="inline-flex rounded-xl border border-line bg-surface-3 p-1" role="tablist">
      {opcoes.map((o) => {
        const p = new URLSearchParams(Object.entries(parametros).filter(([k, v]) => v && k !== chave && k !== 'pagina') as [string, string][])
        if (o.valor) p.set(chave, o.valor)
        const ativo = atual === o.valor
        const Icone = o.icone
        return (
          <Link
            key={o.valor}
            href={`${base}${p.size ? `?${p}` : ''}`}
            role="tab"
            aria-selected={ativo}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-lg px-3.5 text-sm font-medium transition-colors',
              ativo ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink',
            )}
          >
            {Icone && <Icone className="size-4" aria-hidden />}
            {o.rotulo}
          </Link>
        )
      })}
    </div>
  )
}

export function Paginacao({ base, parametros, pagina, total, porPagina }: { base: string; parametros: Record<string, string | undefined>; pagina: number; total: number; porPagina: number }) {
  const paginas = Math.max(1, Math.ceil(total / porPagina))
  if (paginas <= 1) return null
  const link = (n: number) => {
    const p = new URLSearchParams(Object.entries(parametros).filter(([k, v]) => v && k !== 'pagina') as [string, string][])
    if (n > 1) p.set('pagina', String(n))
    return `${base}${p.size ? `?${p}` : ''}`
  }
  return (
    <div className="mt-4 flex items-center justify-between text-xs text-muted">
      <span className="num">
        Página {pagina} de {paginas}
      </span>
      <div className="flex gap-2">
        {pagina > 1 && (
          <Link className="btn btn-sm" href={link(pagina - 1)}>
            Anterior
          </Link>
        )}
        {pagina < paginas && (
          <Link className="btn btn-sm" href={link(pagina + 1)}>
            Próxima
          </Link>
        )}
      </div>
    </div>
  )
}

export function Busca({ placeholder, valor, ocultos }: { placeholder: string; valor?: string; ocultos?: Record<string, string | undefined> }) {
  return (
    <form className="flex w-full gap-2 md:max-w-lg" role="search">
      {Object.entries(ocultos ?? {}).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <input className="input pl-10" type="search" name="busca" defaultValue={valor} placeholder={placeholder} enterKeyHint="search" aria-label="Buscar" />
      </div>
      <button className="btn" type="submit">
        Buscar
      </button>
    </form>
  )
}

import Link from 'next/link'
import { AlertTriangle, CheckCircle2, CircleDot, Clock, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Cabecalho({ titulo, descricao, acoes }: { titulo: string; descricao?: string; acoes?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-ink md:text-2xl">{titulo}</h1>
        {descricao && <p className="mt-1 text-sm text-muted">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  )
}

type Tom = 'neutro' | 'bom' | 'alerta' | 'critico' | 'info'

const TONS: Record<Tom, string> = {
  neutro: 'bg-surface-2 text-ink-2 border-line',
  bom: 'bg-good-soft text-good-ink border-transparent',
  alerta: 'bg-warn-soft text-warn-ink border-transparent',
  critico: 'bg-crit-soft text-crit-ink border-transparent',
  info: 'bg-brand-soft text-accent border-transparent',
}

const ICONES: Partial<Record<Tom, LucideIcon>> = { bom: CheckCircle2, alerta: Clock, critico: AlertTriangle, info: CircleDot }

export function Selo({ tom = 'neutro', children, icone = true }: { tom?: Tom; children: React.ReactNode; icone?: boolean }) {
  const Icone = icone ? ICONES[tom] : undefined
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium whitespace-nowrap', TONS[tom])}>
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
  className,
}: {
  rotulo: string
  valor: React.ReactNode
  detalhe?: React.ReactNode
  tom?: Tom
  href?: string
  className?: string
}) {
  const conteudo = (
    <>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
        {tom === 'critico' && <AlertTriangle className="size-3.5 text-crit" aria-hidden />}
        {tom === 'alerta' && <Clock className="size-3.5 text-warn-ink" aria-hidden />}
        {rotulo}
      </div>
      <div className="mt-1.5 text-[22px] font-semibold tracking-tight whitespace-nowrap text-ink md:text-[26px]">{valor}</div>
      {detalhe && <div className="mt-1 text-xs text-muted">{detalhe}</div>}
    </>
  )
  const classe = cn('card block min-w-0 p-4 transition-colors', className)
  return href ? (
    <Link href={href} className={cn(classe, 'hover:border-line-strong')}>
      {conteudo}
    </Link>
  ) : (
    <div className={classe}>{conteudo}</div>
  )
}

export function Painel({ titulo, descricao, acao, children, className }: { titulo: string; descricao?: string; acao?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('card p-4 md:p-5', className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">{titulo}</h2>
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
  itens: Array<{ rotulo: string; valor: number; detalhe?: string; href?: string }>
  formatar?: (v: number) => string
  cor?: string
}) {
  const max = Math.max(1, ...itens.map((i) => i.valor))
  if (!itens.length) return <Vazio texto="Sem dados ainda." />
  return (
    <ul className="space-y-2.5">
      {itens.map((i) => {
        const linha = (
          <>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
              <span className="truncate text-ink-2">{i.rotulo}</span>
              <span className="num shrink-0 font-medium text-ink">{formatar(i.valor)}</span>
            </div>
            <div className="h-2 rounded-full bg-grid" style={{ background: 'var(--grid)' }}>
              <div className="h-2 rounded-full" style={{ width: `${Math.max(1.5, (i.valor / max) * 100)}%`, background: cor }} />
            </div>
          </>
        )
        return (
          <li key={i.rotulo} title={`${i.rotulo}: ${formatar(i.valor)}${i.detalhe ? ` · ${i.detalhe}` : ''}`}>
            {i.href ? (
              <Link href={i.href} className="block rounded-md hover:opacity-80">
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

export function Vazio({ texto, acao }: { texto: string; acao?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
      {texto}
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
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
              ativo ? 'border-transparent bg-brand text-brand-ink' : 'border-line bg-surface text-ink-2 hover:border-line-strong',
            )}
          >
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
      <span>
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
    <form className="flex w-full gap-2 md:max-w-md">
      {Object.entries(ocultos ?? {}).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <input className="input" type="search" name="busca" defaultValue={valor} placeholder={placeholder} enterKeyHint="search" />
      <button className="btn" type="submit">
        Buscar
      </button>
    </form>
  )
}

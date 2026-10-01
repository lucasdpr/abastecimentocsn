import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Busca, Cabecalho, Filtros, Paginacao, Selo, Vazio } from '@/components/ui'
import { exigirUsuario, pode } from '@/lib/auth'
import { BASES, type BaseId } from '@/lib/bases'
import { detalheImportacao, mudancasImportacao } from '@/lib/consultas'
import { dataHora, numero } from '@/lib/formato'

export const metadata = { title: 'O que mudou' }

type Params = { tipo?: string; busca?: string; pagina?: string }

const TIPOS = {
  novo: { rotulo: 'Nova', tom: 'info' as const },
  mudanca: { rotulo: 'Mudou', tom: 'alerta' as const },
  removido: { rotulo: 'Saiu', tom: 'neutro' as const },
}

/** Onde abrir o item que mudou (só a ordem tem tela própria). */
function destino(entidade: string, chave: string) {
  if (entidade === 'ordem') return `/ordens/${chave}`
  return null
}

/** "Prefixo: Campo: antes → depois; Outro campo: antes → depois" em linhas separadas. */
function partes(texto: string) {
  return texto.split('; ').filter(Boolean)
}

export default async function PaginaMudancas({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Params> }) {
  await exigirUsuario(pode.verGestao)
  const id = Number((await params).id)
  if (!Number.isInteger(id)) notFound()
  const sp = await searchParams
  const pagina = Math.max(1, Number(sp.pagina) || 1)
  const [imp, r] = await Promise.all([detalheImportacao(id), mudancasImportacao({ id, tipo: sp.tipo, busca: sp.busca, pagina })])
  if (!imp) notFound()
  const parametros = { tipo: sp.tipo, busca: sp.busca }
  const contagem = (tipo: string) => r.porTipo.find((t) => t.tipo === tipo)?.total ?? 0
  const registrados = r.porTipo.reduce((s, t) => s + t.total, 0)
  const base = `/importar/${id}`

  return (
    <>
      <Link href="/importar" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Importar
      </Link>
      <Cabecalho
        titulo="O que mudou"
        descricao={`${BASES[imp.base as BaseId]?.nome ?? imp.base} · ${dataHora(imp.concluido_em ?? imp.iniciado_em)} · ${imp.arquivo ?? ''}${imp.usuario ? ` · por ${imp.usuario}` : ''}`}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { rotulo: 'Linhas no arquivo', valor: imp.linhas },
          { rotulo: 'Novas', valor: imp.novas },
          { rotulo: 'Mudaram', valor: imp.alteradas },
          { rotulo: 'Saíram do relatório', valor: imp.removidas },
        ].map((k) => (
          <div key={k.rotulo} className="card p-4">
            <div className="text-xs text-muted">{k.rotulo}</div>
            <div className="num mt-1 text-2xl font-semibold tracking-[-0.02em]">{numero(k.valor)}</div>
          </div>
        ))}
      </div>

      {registrados === 0 ? (
        <Vazio texto="Esta importação não tem mudanças detalhadas. Ou foi a primeira carga da base (não lista tudo como novo), ou aconteceu antes de o app guardar este detalhe." />
      ) : (
        <>
          <div className="mb-4 space-y-3">
            <Busca placeholder="Ordem, PO, material, texto…" valor={sp.busca} ocultos={{ tipo: sp.tipo }} />
            <Filtros
              base={base}
              parametros={parametros}
              chave="tipo"
              opcoes={[
                { valor: '', rotulo: `Tudo (${numero(registrados)})` },
                { valor: 'mudanca', rotulo: `Mudaram (${numero(contagem('mudanca'))})` },
                { valor: 'novo', rotulo: `Novas (${numero(contagem('novo'))})` },
                { valor: 'removido', rotulo: `Saíram (${numero(contagem('removido'))})` },
              ]}
            />
          </div>
          <p className="mb-2 text-xs text-muted">{numero(r.total)} mudanças</p>
          {!r.linhas.length ? (
            <Vazio texto="Nenhuma mudança com esse filtro." />
          ) : (
            <ul className="card divide-y divide-line overflow-hidden">
              {r.linhas.map((e) => {
                const href = destino(e.entidade, e.chave)
                const tipo = TIPOS[e.tipo as keyof typeof TIPOS] ?? { rotulo: e.tipo, tom: 'neutro' as const }
                return (
                  <li key={e.id} className="flex items-start gap-3 px-4 py-3 md:px-5">
                    <div className="w-16 shrink-0 pt-0.5">
                      <Selo tom={tipo.tom} icone={false}>{tipo.rotulo}</Selo>
                    </div>
                    <div className="min-w-0 flex-1 text-sm">
                      <div className="codigo text-xs text-muted">
                        {href ? (
                          <Link href={href} className="font-medium text-accent hover:underline">
                            OM {e.chave}
                          </Link>
                        ) : (
                          e.chave
                        )}
                      </div>
                      {partes(e.descricao).map((linha, i) => (
                        <div key={i} className="mt-0.5 break-words text-ink-2">{linha}</div>
                      ))}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          <Paginacao base={base} parametros={parametros} pagina={pagina} total={r.total} porPagina={r.porPagina} />
        </>
      )}
    </>
  )
}

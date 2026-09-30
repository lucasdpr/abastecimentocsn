import Link from 'next/link'
import { X } from 'lucide-react'
import { FormStatusAtivacao } from '@/components/form-status-ativacao'
import { GraficoColunas } from '@/components/graficos'
import { Barras, Busca, Cabecalho, Filtros, Paginacao, Painel, Selo, Vazio } from '@/components/ui'
import { exigirUsuario, pode } from '@/lib/auth'
import { listarAtivacao, remessasAtivacao } from '@/lib/consultas'
import { data, moeda, moedaCurta, numero } from '@/lib/formato'

export const metadata = { title: 'Ativação' }

type Params = { busca?: string; faixa?: string; mes?: string; pagina?: string }

export default async function PaginaAtivacao({ searchParams }: { searchParams: Promise<Params> }) {
  const usuario = await exigirUsuario(pode.verGestao)
  const sp = await searchParams
  const pagina = Math.max(1, Number(sp.pagina) || 1)
  const [r, remessas] = await Promise.all([listarAtivacao({ busca: sp.busca, faixa: sp.faixa, mes: sp.mes, pagina }), remessasAtivacao()])
  const editar = pode.editar(usuario)
  const atrasadas = remessas.find((m) => m.chave === 'atrasada')
  const parametros = { busca: sp.busca, faixa: sp.faixa, mes: sp.mes }
  const mesAtivo = remessas.find((m) => m.chave === sp.mes)
  const semMes = new URLSearchParams(Object.entries({ busca: sp.busca, faixa: sp.faixa }).filter(([, v]) => v) as [string, string][])

  return (
    <>
      <Cabecalho titulo="Ativação de fornecedores" descricao="RMs com pedido de compra: status de entrega informado pelo fornecedor." />
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Painel
          className="lg:col-span-2"
          titulo="Remessas previstas"
          descricao={`Itens ainda não entregues pela data de remessa.${atrasadas?.itens ? ` ${numero(atrasadas.itens)} já passaram da data (${moedaCurta(atrasadas.valor)}).` : ''}`}
        >
          <GraficoColunas
            dados={remessas}
            legendas={{ atraso: 'Remessa vencida', prazo: 'Remessa prevista' }}
            descricao="Gráfico de colunas: valor dos itens de ativação por mês de remessa"
            links={remessas.map((m) => `/ativacao?${new URLSearchParams({ mes: m.chave })}#lista`)}
          />
        </Painel>
        <Painel titulo="Itens por status do PO" descricao="Status informado pelo fornecedor.">
          <Barras itens={r.porStatus.map((s) => ({ rotulo: s.status, valor: s.itens }))} formatar={(v) => numero(v)} />
        </Painel>
      </div>

      <div className="mb-4 space-y-3">
        <Busca placeholder="PO, RM, ordem, fornecedor, material…" valor={sp.busca} ocultos={{ faixa: sp.faixa, mes: sp.mes }} />
        <Filtros base="/ativacao" parametros={parametros} chave="faixa" opcoes={[
          { valor: '', rotulo: 'Todos' },
          { valor: 'atraso', rotulo: 'Em atraso' },
          { valor: 'entregue', rotulo: 'Entregues' },
        ]} />
      </div>
      {mesAtivo && (
        <Link
          href={`/ativacao${semMes.size ? `?${semMes}` : ''}`}
          className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-brand-soft py-1 pr-2 pl-3 text-xs font-medium text-ink hover:border-accent"
        >
          Remessa: {mesAtivo.rotulo} (não entregues)
          <X className="size-3.5 text-muted" aria-label="Remover filtro" />
        </Link>
      )}
      <p id="lista" className="mb-2 scroll-mt-20 text-xs text-muted">{numero(r.total)} itens · {moeda(r.valor)}</p>
      {!r.linhas.length ? (
        <Vazio texto="Nenhum item de ativação neste filtro." />
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {r.linhas.map((a) => (
            <li key={a.chave} className="px-4 py-3.5 transition-colors hover:bg-surface-2/60 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-center lg:gap-6">
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{a.descricao}</div>
                    <div className="codigo mt-0.5 text-xs text-muted">
                      PO {a.po}/{a.item_po} · RM {a.rm}/{a.item_rm}
                      {a.ordem && (
                        <> · <Link className="text-accent hover:underline" href={`/ordens/${a.ordem}`}>OM {a.ordem}</Link></>
                      )}
                    </div>
                  </div>
                  <Selo tom={/atraso/i.test(a.status_po ?? '') ? 'critico' : /entregue/i.test(a.status_po ?? '') ? 'bom' : 'neutro'} icone={false}>
                    {a.status_po ?? 'Sem status'}
                  </Selo>
                </div>
                <div className="num mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
                  {a.fornecedor && <span>{a.fornecedor}</span>}
                  {a.email && <a className="text-accent hover:underline" href={`mailto:${a.email}?subject=${encodeURIComponent(`Follow-up PO ${a.po} item ${a.item_po}`)}`}>{a.email}</a>}
                  <span>Remessa {data(a.data_remessa)}</span>
                  <span>Necessidade {data(a.data_necessidade)}</span>
                  <span>{numero(a.qtd)} × {moeda(a.valor)}</span>
                  {a.faixa_atraso && <span>{a.faixa_atraso}</span>}
                </div>
              </div>
              {editar && (
                <div className="lg:[&_form]:mt-0">
                  <FormStatusAtivacao chave={a.chave} status={a.status_po} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <datalist id="status-ativacao">
        {r.porStatus.map((s) => <option key={s.status} value={s.status} />)}
      </datalist>
      <Paginacao base="/ativacao" parametros={parametros} pagina={pagina} total={r.total} porPagina={r.porPagina} />
    </>
  )
}

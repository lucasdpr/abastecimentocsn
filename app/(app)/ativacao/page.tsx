import Link from 'next/link'
import { FormStatusAtivacao } from '@/components/form-status-ativacao'
import { Barras, Busca, Cabecalho, Filtros, Paginacao, Painel, Selo, Vazio } from '@/components/ui'
import { exigirUsuario, pode } from '@/lib/auth'
import { listarAtivacao } from '@/lib/consultas'
import { data, moeda, numero } from '@/lib/formato'

export const metadata = { title: 'Ativação' }

type Params = { busca?: string; faixa?: string; pagina?: string }

export default async function PaginaAtivacao({ searchParams }: { searchParams: Promise<Params> }) {
  const usuario = await exigirUsuario(pode.verGestao)
  const sp = await searchParams
  const pagina = Math.max(1, Number(sp.pagina) || 1)
  const r = await listarAtivacao({ busca: sp.busca, faixa: sp.faixa, pagina })
  const parametros = { busca: sp.busca, faixa: sp.faixa }

  return (
    <>
      <Cabecalho titulo="Ativação de fornecedores" descricao="RMs com pedido de compra: status de entrega informado pelo fornecedor." />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <div className="mb-4 space-y-3">
            <Busca placeholder="PO, RM, ordem, fornecedor, material…" valor={sp.busca} ocultos={{ faixa: sp.faixa }} />
            <Filtros base="/ativacao" parametros={parametros} chave="faixa" opcoes={[
              { valor: '', rotulo: 'Todos' },
              { valor: 'atraso', rotulo: 'Em atraso' },
              { valor: 'entregue', rotulo: 'Entregues' },
            ]} />
          </div>
          <p className="mb-2 text-xs text-muted">{numero(r.total)} itens · {moeda(r.valor)}</p>
          {!r.linhas.length ? (
            <Vazio texto="Nenhum item de ativação neste filtro." />
          ) : (
            <ul className="card divide-y divide-line overflow-hidden">
              {r.linhas.map((a) => (
                <li key={a.chave} className="px-4 py-3.5 transition-colors hover:bg-surface-2/60">
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
                  {pode.editar(usuario) && <FormStatusAtivacao chave={a.chave} status={a.status_po} />}
                </li>
              ))}
            </ul>
          )}
          <datalist id="status-ativacao">
            {r.porStatus.map((s) => <option key={s.status} value={s.status} />)}
          </datalist>
          <Paginacao base="/ativacao" parametros={parametros} pagina={pagina} total={r.total} porPagina={r.porPagina} />
        </div>
        <Painel titulo="Itens por status do PO" className="h-fit lg:sticky lg:top-6">
          <Barras itens={r.porStatus.map((s) => ({ rotulo: s.status, valor: s.itens }))} formatar={(v) => numero(v)} />
        </Painel>
      </div>
    </>
  )
}

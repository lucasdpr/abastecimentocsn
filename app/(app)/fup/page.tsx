import { Megaphone } from 'lucide-react'
import { cobrarFornecedor } from '@/app/acoes'
import { FormFup } from '@/components/form-fup'
import { SeletorFiltro } from '@/components/seletor-filtro'
import { Busca, Cabecalho, Filtros, Paginacao, Painel, Selo, Vazio } from '@/components/ui'
import { exigirUsuario, pode } from '@/lib/auth'
import { listarFup } from '@/lib/consultas'
import { data, moeda, moedaCurta, numero } from '@/lib/formato'

export const metadata = { title: 'Follow-up' }

type Params = { busca?: string; prazo?: string; retorno?: string; responsavel?: string; evento?: string; pagina?: string }

type Linha = {
  po_item: string
  po: string
  item_po: string
  material: string | null
  descricao: string | null
  fornecedor: string | null
  valor: string | null
  data_remessa_corrigida: string | null
  nova_data: string | null
  status_sap: string | null
  motivo: string | null
  motivo_dinamica: string | null
  responsavel: string | null
  obs_fornecedor: string | null
  retorno: boolean | null
  cobrancas: number
  gg: string | null
  diretoria: string | null
  evento: string | null
  descricao_evento: string | null
  semana_ativacao: string | null
  prazo: 'atraso' | 'no_prazo' | 'encerrado'
}

export default async function PaginaFup({ searchParams }: { searchParams: Promise<Params> }) {
  const usuario = await exigirUsuario(pode.verGestao)
  const sp = await searchParams
  const pagina = Math.max(1, Number(sp.pagina) || 1)
  const r = await listarFup({ ...sp, pagina })
  const linhas = r.linhas as Linha[]
  const parametros = { busca: sp.busca, prazo: sp.prazo, retorno: sp.retorno, responsavel: sp.responsavel, evento: sp.evento }
  const editar = pode.editar(usuario)

  return (
    <>
      <Cabecalho titulo="Follow-up de pedidos" descricao="Ativação dos fornecedores e tratativa dos pedidos em carteira." />
      <div className="mb-4 space-y-3">
        <Busca placeholder="PO, fornecedor, material, RM…" valor={sp.busca} ocultos={{ ...parametros, busca: undefined }} />
        <Filtros base="/fup" parametros={parametros} chave="prazo" opcoes={[
          { valor: '', rotulo: 'Todos os prazos' },
          { valor: 'atraso', rotulo: 'Em atraso' },
          { valor: 'no_prazo', rotulo: 'No prazo' },
          { valor: 'encerrado', rotulo: 'Entregue/eliminado' },
        ]} />
        <Filtros base="/fup" parametros={parametros} chave="retorno" opcoes={[
          { valor: '', rotulo: 'Qualquer retorno' },
          { valor: 'nao', rotulo: 'Sem retorno' },
          { valor: 'sim', rotulo: 'Com retorno' },
          { valor: 'cancelavel', rotulo: '3+ cobranças sem retorno' },
        ]} />
        <div className="flex flex-wrap gap-3">
          <SeletorFiltro base="/fup" parametros={parametros} chave="responsavel" rotulo="Responsável" opcoes={[{ valor: '', rotulo: 'Todos' }, ...r.responsaveis.map((x) => ({ valor: x, rotulo: x }))]} />
          <SeletorFiltro base="/fup" parametros={parametros} chave="evento" rotulo="Evento" opcoes={[{ valor: '', rotulo: 'Todos' }, { valor: 'rg', rotulo: 'Reparo Geral (RG)' }]} />
        </div>
      </div>

      {sp.evento === 'rg' && r.eventosRg.length > 0 && (
        <Painel titulo="Reparos gerais" descricao="Após a data do RG, o que não chegou segue como processo normal (exige de acordo do Diretor Operacional para manter na lista)." className="mb-4">
          <div className="-mx-4 overflow-x-auto md:mx-0">
            <table className="tabela">
              <thead><tr><th>Evento</th><th className="text-right">Itens</th><th className="text-right">Em atraso</th><th className="text-right">Com retorno</th><th className="text-right">Valor</th></tr></thead>
              <tbody>
                {r.eventosRg.map((e) => (
                  <tr key={e.evento}>
                    <td>{e.evento}</td>
                    <td className="num text-right">{numero(e.itens)}</td>
                    <td className="num text-right">{numero(e.atraso)}</td>
                    <td className="num text-right">{numero(e.com_retorno)}</td>
                    <td className="num text-right">{moedaCurta(e.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Painel>
      )}

      <p className="mb-2 text-xs text-muted">{numero(r.total)} itens · {moeda(r.valor)}</p>

      {!linhas.length ? (
        <Vazio texto="Nenhum item de follow-up neste filtro." />
      ) : (
        <ul className="space-y-2">
          {linhas.map((f) => (
            <li key={f.po_item} className="card">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-start gap-3 p-3.5 md:p-4 [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="num text-sm font-semibold">PO {f.po}/{f.item_po}</span>
                      {f.prazo === 'atraso' && <Selo tom="critico">Atraso</Selo>}
                      {f.prazo === 'no_prazo' && <Selo tom="bom">No prazo</Selo>}
                      {f.prazo === 'encerrado' && <Selo tom="neutro" icone={false}>{f.status_sap}</Selo>}
                      {f.retorno ? <Selo tom="info">Com retorno</Selo> : <Selo tom="alerta">Sem retorno</Selo>}
                      {f.evento === 'RG' && <Selo tom="neutro" icone={false}>{f.descricao_evento || 'RG'}</Selo>}
                    </div>
                    <div className="mt-1 truncate text-sm text-ink-2">{f.descricao}</div>
                    <div className="num mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                      <span>{f.fornecedor}</span>
                      <span>Remessa {data(f.nova_data ?? f.data_remessa_corrigida)}{f.nova_data ? ' (nova)' : ''}</span>
                      {f.responsavel && <span>Resp.: {f.responsavel}</span>}
                      {f.gg && <span>{f.gg} · {f.diretoria}</span>}
                      {f.cobrancas > 0 && <span>{f.cobrancas} cobrança(s)</span>}
                    </div>
                  </div>
                  <div className="num shrink-0 text-right text-sm font-semibold">{moedaCurta(f.valor)}</div>
                </summary>
                <div className="border-t border-line px-3.5 pb-4 md:px-4">
                  {f.obs_fornecedor && <p className="mt-3 rounded-lg bg-surface-2 p-3 text-sm text-ink-2">{f.obs_fornecedor}</p>}
                  {editar ? (
                    <>
                      <form action={cobrarFornecedor.bind(null, f.po_item)} className="mt-3">
                        <button className="btn btn-sm"><Megaphone className="size-3.5" /> Registrar cobrança ao fornecedor</button>
                      </form>
                      <FormFup poItem={f.po_item} motivo={f.motivo} novaData={f.nova_data} obs={f.obs_fornecedor} motivoDinamica={f.motivo_dinamica} responsavel={f.responsavel} retorno={f.retorno} />
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-muted">Motivo: {f.motivo ?? '—'} · Dinâmica: {f.motivo_dinamica ?? '—'}</p>
                  )}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
      <Paginacao base="/fup" parametros={parametros} pagina={pagina} total={r.total} porPagina={r.porPagina} />
    </>
  )
}

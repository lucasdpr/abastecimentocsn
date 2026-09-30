import Link from 'next/link'
import { ChartColumn, ChevronDown, List, Megaphone, X } from 'lucide-react'
import { cobrarFornecedor } from '@/app/acoes'
import { FormFup } from '@/components/form-fup'
import { SeletorFiltro } from '@/components/seletor-filtro'
import { GraficoColunas } from '@/components/graficos'
import { Abas, Barras, Busca, Cabecalho, Composicao, Filtros, Medidor, Paginacao, Painel, Selo, Vazio } from '@/components/ui'
import { exigirUsuario, pode } from '@/lib/auth'
import { FAIXAS_REMESSA, graficosFup, listarFup } from '@/lib/consultas'
import { data, moeda, moedaCurta, numero } from '@/lib/formato'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Follow-up' }

/** Colunas da lista no desktop (cabeçalho e linhas precisam bater). */
const COLUNAS = 'grid-cols-[minmax(11rem,14rem)_minmax(0,1fr)_7.5rem_9rem_6rem_1rem] gap-4'

type Params = { busca?: string; prazo?: string; retorno?: string; responsavel?: string; evento?: string; pagina?: string; aba?: string; remessa?: string; diretoria?: string }

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
  const verGraficos = sp.aba === 'graficos'
  const [r, g] = await Promise.all([listarFup({ ...sp, pagina, semLinhas: verGraficos }), verGraficos ? graficosFup(sp) : null])
  const linhas = r.linhas as Linha[]
  const parametros = { busca: sp.busca, prazo: sp.prazo, retorno: sp.retorno, responsavel: sp.responsavel, evento: sp.evento, aba: sp.aba, remessa: sp.remessa, diretoria: sp.diretoria }
  const editar = pode.editar(usuario)

  return (
    <>
      <Cabecalho
        titulo="Follow-up de pedidos"
        descricao="Ativação dos fornecedores e tratativa dos pedidos em carteira."
        acoes={
          <Abas
            base="/fup"
            parametros={parametros}
            chave="aba"
            opcoes={[
              { valor: '', rotulo: 'Lista', icone: List },
              { valor: 'graficos', rotulo: 'Gráficos', icone: ChartColumn },
            ]}
          />
        }
      />
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

      {(sp.remessa || sp.diretoria) && (
        <div className="mb-3 flex flex-wrap gap-2">
          {sp.remessa && FAIXAS_REMESSA[Number(sp.remessa)] && (
            <FiltroAtivo
              rotulo={`Remessa: ${FAIXAS_REMESSA[Number(sp.remessa)].grupo === 'atraso' ? 'atrasado há' : 'vence em'} ${FAIXAS_REMESSA[Number(sp.remessa)].rotulo}`}
              href={linkSem(parametros, 'remessa')}
            />
          )}
          {sp.diretoria && <FiltroAtivo rotulo={`Diretoria: ${sp.diretoria}`} href={linkSem(parametros, 'diretoria')} />}
        </div>
      )}
      <p className="mb-2 text-xs text-muted">{numero(r.total)} itens · {moeda(r.valor)}</p>

      {g ? (
        <GraficosFup g={g} parametros={parametros} />
      ) : !linhas.length ? (
        <Vazio texto="Nenhum item de follow-up neste filtro." />
      ) : (
        <div className="card overflow-hidden">
          <div className={cn(COLUNAS, 'hidden border-b border-line bg-surface-2 px-4 py-2.5 text-xs font-medium text-muted md:grid')}>
            <span>Pedido</span>
            <span>Material · fornecedor</span>
            <span>Remessa</span>
            <span>Responsável</span>
            <span className="text-right">Valor</span>
            <span />
          </div>
          <ul className="divide-y divide-line">
          {linhas.map((f) => {
            const selos = (
              <>
                {f.prazo === 'atraso' && <Selo tom="critico">Atraso</Selo>}
                {f.prazo === 'no_prazo' && <Selo tom="bom">No prazo</Selo>}
                {f.prazo === 'encerrado' && <Selo tom="neutro" icone={false}>{f.status_sap}</Selo>}
                {f.retorno ? <Selo tom="info">Com retorno</Selo> : <Selo tom="alerta">Sem retorno</Selo>}
                {f.evento === 'RG' && <Selo tom="neutro" icone={false}>{f.descricao_evento || 'RG'}</Selo>}
              </>
            )
            const remessa = `${data(f.nova_data ?? f.data_remessa_corrigida)}${f.nova_data ? ' (nova)' : ''}`
            return (
            <li key={f.po_item}>
              <details className="group">
                <summary className="cursor-pointer list-none transition-colors hover:bg-surface-2 group-open:bg-surface-2 [&::-webkit-details-marker]:hidden">
                  {/* Mobile */}
                  <div className="flex items-start gap-3 px-4 py-3.5 md:hidden">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="codigo text-sm font-semibold">PO {f.po}/{f.item_po}</span>
                        <span className="num shrink-0 text-sm font-semibold">{moedaCurta(f.valor)}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">{selos}</div>
                      <div className="mt-1.5 truncate text-sm text-ink-2">{f.descricao}</div>
                      <div className="num mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                        <span className="max-w-full truncate">{f.fornecedor}</span>
                        <span>Remessa {remessa}</span>
                        {f.responsavel && <span>Resp.: {f.responsavel}</span>}
                        {f.cobrancas > 0 && <span>{f.cobrancas} cobrança(s)</span>}
                      </div>
                    </div>
                  </div>
                  {/* Desktop */}
                  <div className={cn(COLUNAS, 'hidden items-center px-4 py-3 md:grid')}>
                    <div className="min-w-0">
                      <div className="codigo font-semibold text-ink">PO {f.po}/{f.item_po}</div>
                      <div className="mt-1 flex flex-wrap gap-1">{selos}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm text-ink">{f.descricao}</div>
                      <div className="truncate text-xs text-muted">
                        {f.fornecedor}
                        {f.gg && ` · ${f.gg} · ${f.diretoria}`}
                      </div>
                    </div>
                    <div className="num text-sm text-ink-2">{remessa}</div>
                    <div className="min-w-0 text-sm text-ink-2">
                      <div className="truncate">{f.responsavel ?? '—'}</div>
                      {f.cobrancas > 0 && <div className="text-xs text-muted">{f.cobrancas} cobrança(s)</div>}
                    </div>
                    <div className="num text-right text-sm font-semibold text-ink">{moedaCurta(f.valor)}</div>
                    <ChevronDown className="size-4 text-muted transition-transform group-open:rotate-180" aria-hidden />
                  </div>
                </summary>
                <div className="border-t border-line bg-surface-2/60 px-4 pb-4">
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
            )
          })}
          </ul>
        </div>
      )}
      {!g && <Paginacao base="/fup" parametros={parametros} pagina={pagina} total={r.total} porPagina={r.porPagina} />}
    </>
  )
}

/** Link para a lista com os filtros atuais + o recorte clicado no gráfico. */
function linkLista(parametros: Record<string, string | undefined>, extra: Record<string, string>) {
  const todos: Record<string, string | undefined> = { ...parametros, aba: undefined, ...extra }
  const p = new URLSearchParams(Object.entries(todos).filter(([, v]) => v) as [string, string][])
  return `/fup?${p}`
}

function GraficosFup({ g, parametros }: { g: Awaited<ReturnType<typeof graficosFup>>; parametros: Record<string, string | undefined> }) {
  const aberto = Number(g.retorno.com_retorno) + Number(g.retorno.sem_retorno)
  const atrasado = g.faixas.filter((f) => f.grupo === 'atraso').reduce((s, f) => s + f.valor, 0)
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Painel
          className="flex flex-col lg:col-span-2"
          titulo="Remessas por prazo"
          descricao={`Valor dos pedidos em aberto pela data de remessa (nova data, se houver). ${moedaCurta(atrasado)} já passaram da data.`}
        >
          <GraficoColunas
            dados={g.faixas}
            legendas={{ atraso: 'Atrasado há', prazo: 'Vence em' }}
            preencher
            links={g.faixas.map((_, i) => linkLista(parametros, { remessa: String(i) }))}
            descricao="Gráfico de colunas: valor em aberto por faixa de dias de atraso ou até a remessa"
          />
        </Painel>
        <div className="flex flex-col gap-4">
          <Painel titulo="Retorno do fornecedor" descricao="Valor em aberto: o fornecedor já respondeu?">
            {aberto ? (
              <>
                <Composicao
                  partes={[
                    { rotulo: 'Com retorno', valor: Number(g.retorno.com_retorno), cor: 'var(--series-1)' },
                    { rotulo: 'Sem retorno', valor: Number(g.retorno.sem_retorno), cor: 'var(--series-2)' },
                  ]}
                  formatar={moedaCurta}
                />
                {g.retorno.itens_3x > 0 && (
                  <Link href="/fup?retorno=cancelavel" className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-line bg-surface-2 p-3 text-xs transition-colors hover:border-line-strong">
                    <span className="text-ink-2">
                      <span className="font-semibold text-ink">{numero(g.retorno.itens_3x)} itens</span> sem retorno depois de 3+ cobranças: elegíveis a cancelar ou prorrogar.
                    </span>
                    <span className="num shrink-0 font-semibold text-ink">{moedaCurta(g.retorno.cobrado_3x)}</span>
                  </Link>
                )}
              </>
            ) : (
              <Vazio texto="Nenhum pedido em aberto neste recorte." />
            )}
          </Painel>
          <Painel titulo="Com quem está a pendência" descricao="Valor em aberto por responsável." className="flex-1">
            <Barras
              formatar={moedaCurta}
              itens={g.responsaveis.map((x) => ({ rotulo: x.responsavel, valor: Number(x.valor), detalhe: `${numero(x.itens)} itens`, href: linkLista(parametros, { responsavel: x.responsavel }) }))}
            />
          </Painel>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Painel titulo="Fornecedores com mais valor em atraso" descricao="Top 10. Clique para ver os pedidos do fornecedor.">
          <Barras
            cor="var(--crit)"
            formatar={moedaCurta}
            itens={g.fornecedores.map((f) => ({
              rotulo: f.fornecedor,
              valor: Number(f.valor),
              detalhe: `${numero(f.itens)} itens · ${f.sem_retorno === f.itens ? 'nenhum com retorno' : `${numero(f.sem_retorno)} sem retorno`}`,
              href: linkLista(parametros, { busca: f.fornecedor, prazo: 'atraso' }),
            }))}
          />
        </Painel>
        <Painel titulo="Por diretoria" descricao="Pedidos em aberto: quanto já atrasou e quanto tem retorno." corpo="tabela">
          {g.diretorias.length ? (
            <div className="overflow-x-auto">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Diretoria</th>
                    <th className="text-right">Itens</th>
                    <th className="text-right">Valor</th>
                    <th className="w-36">Em atraso</th>
                    <th className="w-36">Com retorno</th>
                  </tr>
                </thead>
                <tbody>
                  {g.diretorias.map((d) => (
                    <tr key={d.diretoria}>
                      <td className="font-medium">
                        <Link href={linkLista(parametros, { diretoria: d.diretoria })} className="text-accent hover:underline">
                          {d.diretoria}
                        </Link>
                      </td>
                      <td className="num text-right">{numero(d.itens)}</td>
                      <td className="num text-right whitespace-nowrap">{moedaCurta(d.valor)}</td>
                      <td>
                        <Medidor fracao={Number(d.valor) ? Number(d.valor_atraso) / Number(d.valor) : 0} cor="var(--crit)" rotulo={`${moedaCurta(d.valor_atraso)} em atraso`} />
                      </td>
                      <td>
                        <Medidor fracao={Number(d.valor) ? Number(d.valor_retorno) / Number(d.valor) : 0} rotulo={`${moedaCurta(d.valor_retorno)} com retorno`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-4 py-4 text-sm text-muted md:px-5">Nenhum pedido em aberto neste recorte.</p>
          )}
        </Painel>
      </div>
    </div>
  )
}

function linkSem(parametros: Record<string, string | undefined>, chave: string) {
  const p = new URLSearchParams(Object.entries(parametros).filter(([k, v]) => v && k !== chave) as [string, string][])
  return `/fup${p.size ? `?${p}` : ''}`
}

/** Filtro vindo de um clique no gráfico, com X para remover. */
function FiltroAtivo({ rotulo, href }: { rotulo: string; href: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-brand-soft py-1 pr-2 pl-3 text-xs font-medium text-ink hover:border-accent">
      {rotulo}
      <X className="size-3.5 text-muted" aria-label="Remover filtro" />
    </Link>
  )
}

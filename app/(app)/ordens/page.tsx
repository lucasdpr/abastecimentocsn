import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { SeloParada, SeloSituacao, StatusSap } from '@/components/selos'
import { SeletorFiltro } from '@/components/seletor-filtro'
import { Busca, Cabecalho, Filtros, Paginacao, Vazio } from '@/components/ui'
import { exigirUsuario } from '@/lib/auth'
import { gruposPlanejamento, listarOrdens, responsaveisGrupos } from '@/lib/consultas'
import { data, moeda, nomeCurto, numero } from '@/lib/formato'

export const metadata = { title: 'Ordens' }

type Params = { busca?: string; filtro?: string; grupo?: string; pagina?: string }

export default async function PaginaOrdens({ searchParams }: { searchParams: Promise<Params> }) {
  await exigirUsuario()
  const sp = await searchParams
  const pagina = Math.max(1, Number(sp.pagina) || 1)
  const [{ linhas, total, porPagina, cfg, soSap }, grupos, resp] = await Promise.all([
    listarOrdens({ busca: sp.busca, filtro: sp.filtro, grupo: sp.grupo, pagina }),
    gruposPlanejamento(),
    responsaveisGrupos(),
  ])
  const parametros = { busca: sp.busca, filtro: sp.filtro, grupo: sp.grupo }

  return (
    <>
      <Cabecalho titulo="Ordens" descricao="Busque pela OM, material, reserva ou local de instalação." />
      <div className="mb-4 space-y-3">
        <Busca placeholder="Ex.: 80008117069, ANEL VITON, G-CSN-10…" valor={sp.busca} ocultos={{ filtro: sp.filtro, grupo: sp.grupo }} />
        <Filtros
          base="/ordens"
          parametros={{ ...parametros, filtro: sp.filtro ?? (sp.busca ? 'todas' : undefined) }}
          chave="filtro"
          opcoes={[
            { valor: sp.busca ? 'abertas' : '', rotulo: 'Em aberto' },
            { valor: 'paradas', rotulo: `Paradas ≥ ${cfg.diasSemMovimentacao}d` },
            { valor: 'vencidas', rotulo: 'Necessidade vencida' },
            { valor: 'cobradas', rotulo: 'Cobradas' },
            { valor: 'encerradas', rotulo: 'Atendidas' },
            { valor: 'todas', rotulo: 'Todas' },
          ]}
        />
        {grupos.length > 1 && (
          <SeletorFiltro base="/ordens" parametros={parametros} chave="grupo" rotulo="Grupo de planejamento" opcoes={[{ valor: '', rotulo: 'Todos' }, ...grupos.map((g) => ({ valor: g, rotulo: g }))]} />
        )}
      </div>

      <p className="mb-2 text-xs text-muted">
        {numero(total)} ordens{sp.busca && !sp.filtro && ` · busca em todas as ordens, inclusive atendidas${soSap.length ? ` e encerradas só na IW38 (${soSap.length})` : ''}`}
      </p>

      {!linhas.length && !soSap.length ? (
        <Vazio texto={sp.busca ? 'Nenhuma ordem encontrada para essa busca.' : 'Nenhuma ordem neste filtro.'} />
      ) : (
        <>
          {linhas.length > 0 && (
            <>
          {/* Mobile */}
          <ul className="space-y-2 md:hidden">
            {linhas.map((o) => (
              <li key={o.ordem}>
                <Link href={`/ordens/${o.ordem}`} className="card flex items-center gap-3 p-3.5 active:bg-surface-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="codigo font-semibold">{o.ordem}</span>
                      <SeloSituacao situacao={o.situacao} />
                    </div>
                    <p className="mt-0.5 truncate text-sm text-ink-2">{o.texto_ordem ?? '—'}</p>
                    <div className="mt-1.5">
                      <StatusSap usuario={o.status_usuario} sistema={o.status_sistema} linha />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <SeloParada diasParada={o.dias_parada} limite={cfg.diasSemMovimentacao} abertos={o.itens_abertos} />
                      <span>{o.itens_abertos}/{o.itens} itens abertos</span>
                    </div>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted" />
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop */}
          <div className="card hidden overflow-x-auto md:block">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Ordem</th>
                  <th>Descrição</th>
                  <th title="Status do usuário / status do sistema">Status SAP</th>
                  <th className="text-right" title="Itens abertos / total">Itens</th>
                  <th>Necessidade</th>
                  <th className="text-right">Valor</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((o) => (
                  <tr key={o.ordem}>
                    <td>
                      <Link href={`/ordens/${o.ordem}`} className="codigo font-medium text-accent hover:underline">
                        {o.ordem}
                      </Link>
                      <div className="mt-0.5 text-xs whitespace-nowrap text-muted" title={resp.get(o.grp_planejamento ?? '')?.abastecimento ? `Abastecimento: ${resp.get(o.grp_planejamento ?? '')?.abastecimento}` : undefined}>
                        {o.grp_planejamento}
                        {resp.get(o.grp_planejamento ?? '')?.abastecimento && <> · {nomeCurto(resp.get(o.grp_planejamento ?? '')?.abastecimento)}</>}
                      </div>
                    </td>
                    <td className="w-full max-w-0 min-w-40">
                      <div className="truncate" title={o.texto_ordem ?? undefined}>{o.texto_ordem ?? '—'}</div>
                      <div className="truncate text-xs text-muted">{o.local_instalacao}</div>
                    </td>
                    <td>
                      <StatusSap usuario={o.status_usuario} sistema={o.status_sistema} />
                    </td>
                    <td className="num text-right">
                      {o.itens_abertos}
                      <span className="text-muted">/{o.itens}</span>
                    </td>
                    <td className="num whitespace-nowrap">{data(o.necessidade_mais_antiga)}</td>
                    <td className="num text-right whitespace-nowrap">{moeda(o.valor)}</td>
                    <td>
                      <div className="flex flex-col items-start gap-1">
                        <SeloParada diasParada={o.dias_parada} limite={cfg.diasSemMovimentacao} abertos={o.itens_abertos} />
                        {o.situacao && o.situacao !== 'sem_acao' && <SeloSituacao situacao={o.situacao} />}
                      </div>
                      {o.setor_responsavel && <div className="mt-1 text-xs text-muted">{o.setor_responsavel}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            </>
          )}
          <Paginacao base="/ordens" parametros={parametros} pagina={pagina} total={total} porPagina={porPagina} />
          {soSap.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2 text-sm font-semibold">Só na IW38 (sem itens de material)</h2>
              <ul className="card divide-y divide-line overflow-hidden">
                {soSap.map((s) => (
                  <li key={s.ordem}>
                    <Link href={`/ordens/${s.ordem}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2/60">
                      <span className="codigo font-medium text-accent">{s.ordem}</span>
                      <span className="min-w-0 flex-1 truncate text-sm">{s.texto ?? '—'}</span>
                      <span className="hidden text-xs text-muted sm:inline">{s.grp_planejamento}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  )
}

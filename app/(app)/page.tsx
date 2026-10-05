import Link from 'next/link'
import { redirect } from 'next/navigation'
import { TriangleAlert, ArrowRight, BellRing, CalendarCheck, CalendarX2, CircleQuestionMark, Clock, FileClock, Truck, Upload, CircleX } from 'lucide-react'
import { GraficoRetornoSemanal } from '@/components/graficos'
import { AvisoAtualizacao, Barras, Cabecalho, Composicao, Kpi, Medidor, Painel, Selo, Vazio } from '@/components/ui'
import { exigirUsuario, pode } from '@/lib/auth'
import { painel, responsaveisGrupos, statusAtualizacao } from '@/lib/consultas'
import { data, dataHora, moeda, moedaCurta, nomeCurto, numero, pct } from '@/lib/formato'

export const metadata = { title: 'Painel' }

const NOME_BASE: Record<string, string> = { ordens: 'Ordens', iw38: 'IW38', grupos: 'Grupos', fup: 'Follow-up', ativacao: 'Ativação', reservas: 'Reservas' }

// Status de sistema padrão do SAP PM. Os de usuário são do perfil da CSN e aparecem só como código.
const FASE_SISTEMA: Record<string, string> = { ABER: 'Aberta', LIB: 'Liberada', ENTE: 'Encerrada tecnicamente', ENCE: 'Encerrada' }

const PRAZOS: Record<number, { rotulo: string; cor: string; icone: typeof Clock }> = {
  1: { rotulo: 'Vencida há mais de 90 dias', cor: 'var(--crit)', icone: TriangleAlert },
  2: { rotulo: 'Vencida há 31 a 90 dias', cor: 'var(--serious)', icone: TriangleAlert },
  3: { rotulo: 'Vencida há até 30 dias', cor: 'var(--warn)', icone: Clock },
  4: { rotulo: 'Vence nos próximos 30 dias', cor: 'var(--series-1)', icone: CalendarCheck },
  5: { rotulo: 'Vence em mais de 30 dias', cor: 'var(--deemph-1)', icone: CalendarCheck },
  6: { rotulo: 'Sem data de necessidade', cor: 'var(--deemph-2)', icone: CalendarX2 },
}

const APROVACAO: Record<string, { cor: string; icone?: typeof Clock }> = {
  Liberado: { cor: 'var(--series-1)' },
  Rejeitado: { cor: 'var(--crit)', icone: CircleX },
  'Em processo de aprovação': { cor: 'var(--warn)', icone: Clock },
  'Sem status': { cor: 'var(--deemph-1)', icone: CircleQuestionMark },
}

export default async function PaginaPainel() {
  const usuario = await exigirUsuario()
  if (!pode.verGestao(usuario)) redirect('/ordens')
  const [d, atualizacao, resp] = await Promise.all([painel(), statusAtualizacao(), responsaveisGrupos()])
  const r = d.resumo
  const f = d.fupResumo
  const semDados = r.total === 0 && f.itens === 0
  const valorAberto = Number(r.valor_aberto)
  const outros = Math.max(0, r.itens - r.itens_abertos - r.itens_retirados - r.itens_eliminados)

  return (
    <>
      <Cabecalho
        sobre="Visão geral"
        titulo="Painel"
        descricao="Como estão as ordens de manutenção acompanhadas pela Central, a partir da última importação do SAP."
        acoes={
          pode.editar(usuario) && (
            <Link href="/importar" className="btn">
              <Upload className="size-4" /> Atualizar dados
            </Link>
          )
        }
      />

      <AvisoAtualizacao
        href={pode.editar(usuario) ? '/importar' : undefined}
        bases={atualizacao.filter((x) => x.atrasada).map((x) => ({ nome: NOME_BASE[x.base] ?? x.base, atualizadoEm: dataHora(x.concluido_em), diasUteis: x.diasUteis }))}
      />

      {semDados && (
        <div className="mb-6">
          <Vazio
            texto="Nenhuma planilha importada ainda. Importe as exportações do SAP para ver o painel."
            acao={pode.editar(usuario) && <Link href="/importar" className="btn btn-primary">Importar planilhas</Link>}
          />
        </div>
      )}

      {/* Destaque + indicadores */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <section className="card relative col-span-2 overflow-hidden p-5 md:p-6 xl:row-span-2">
          <div
            className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full opacity-60 blur-3xl"
            style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent) 22%, transparent), transparent 70%)' }}
            aria-hidden
          />
          <div className="relative">
            <p className="eyebrow">Carteira pendente</p>
            <p className="mt-3 text-5xl leading-none font-semibold tracking-[-0.035em] text-ink md:text-[56px]">{moedaCurta(valorAberto)}</p>
            <p className="mt-3 text-sm text-ink-2">
              <strong className="font-semibold text-ink">{numero(r.itens_abertos)} itens</strong> ainda sem atendimento em{' '}
              <strong className="font-semibold text-ink">{numero(r.abertas)} ordens</strong>
              <span className="text-muted"> — de {numero(r.total)} ordens importadas.</span>
            </p>
            <div className="mt-6">
              <p className="mb-2.5 text-xs font-medium text-muted">Situação de todos os {numero(r.itens)} itens de reserva</p>
              <Composicao
                partes={[
                  { rotulo: 'Pendentes', valor: r.itens_abertos, cor: 'var(--series-1)' },
                  { rotulo: 'Retirados', valor: r.itens_retirados, cor: 'var(--deemph-1)' },
                  { rotulo: 'Eliminados', valor: r.itens_eliminados, cor: 'var(--deemph-2)' },
                  ...(outros ? [{ rotulo: 'Outros', valor: outros, cor: 'var(--line-strong)' }] : []),
                ]}
              />
            </div>
          </div>
        </section>
        <Kpi
          icone={CalendarX2}
          rotulo="Necessidade vencida"
          valor={numero(r.vencidas)}
          detalhe={`${moedaCurta(r.valor_vencido)} em itens pendentes`}
          tom={r.vencidas ? 'critico' : undefined}
          href="/ordens?filtro=vencidas"
        />
        <Kpi
          icone={BellRing}
          rotulo={`Sem movimentação ≥ ${d.cfg.diasSemMovimentacao} dias`}
          valor={numero(r.paradas)}
          detalhe="Ordens para cobrar"
          tom={r.paradas ? 'alerta' : undefined}
          href="/alertas"
        />
        <Kpi
          icone={Truck}
          rotulo="Carteira em follow-up"
          valor={moedaCurta(f.total)}
          detalhe={`${pct(f.com_retorno, f.total).toLocaleString('pt-BR')}% com retorno do fornecedor`}
          href="/fup"
        />
        <Kpi
          icone={FileClock}
          rotulo="ANTECs fora do prazo"
          valor={numero(d.antecs.atrasadas)}
          detalhe={`${numero(d.antecs.abertas)} em andamento`}
          tom={d.antecs.atrasadas ? 'critico' : undefined}
          href="/antec"
        />
      </div>

      {/* Onde estão as ordens abertas */}
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Painel
          className="xl:col-span-2"
          corpo="tabela"
          titulo="Em que fase estão as ordens abertas"
          descricao="Primeiro código do status de sistema e do status do usuário no SAP."
        >
          {d.fases.length ? (
            <div className="overflow-x-auto">
              <table className="tabela md:min-w-[640px]">
                <thead>
                  <tr>
                    <th>Status sistema</th>
                    <th className="hidden sm:table-cell">Status usuário</th>
                    <th className="hidden lg:table-cell">Abastecimento</th>
                    <th className="text-right">Ordens</th>
                    <th className="hidden text-right md:table-cell">Itens</th>
                    <th className="text-right">Valor pendente</th>
                    <th className="hidden w-40 md:table-cell">Parte do valor</th>
                    <th className="text-right">Vencidas</th>
                  </tr>
                </thead>
                <tbody>
                  {d.fases.map((fa) => (
                    <tr key={`${fa.fase_sistema}-${fa.fase_usuario}`}>
                      <td>
                        <span className="codigo font-medium text-ink">{fa.fase_sistema ?? '—'}</span>
                        {fa.fase_sistema && FASE_SISTEMA[fa.fase_sistema] && <span className="ml-1.5 hidden text-xs text-muted sm:inline">{FASE_SISTEMA[fa.fase_sistema]}</span>}
                        <span className="codigo text-ink-2 sm:hidden"> · {fa.fase_usuario ?? '—'}</span>
                      </td>
                      <td className="codigo hidden text-ink-2 sm:table-cell">{fa.fase_usuario ?? '—'}</td>
                      <td className="num text-right font-medium">{numero(fa.ordens)}</td>
                      <td className="num hidden text-right text-ink-2 md:table-cell">{numero(fa.itens_abertos)}</td>
                      <td className="num text-right whitespace-nowrap">{moedaCurta(fa.valor_aberto)}</td>
                      <td className="hidden md:table-cell">
                        <Medidor fracao={valorAberto ? Number(fa.valor_aberto) / valorAberto : 0} rotulo={`${moeda(fa.valor_aberto)} de ${moeda(valorAberto)}`} />
                      </td>
                      <td className="num text-right">{fa.vencidas ? <Selo tom="critico">{numero(fa.vencidas)}</Selo> : <span className="text-muted">0</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-5"><Vazio texto="Nenhuma ordem com itens pendentes." /></div>
          )}
        </Painel>

        <Painel titulo="Prazo de necessidade" descricao="Ordens abertas pela data de necessidade mais antiga.">
          <Barras
            itens={d.prazos.map((p) => ({
              rotulo: PRAZOS[p.faixa].rotulo,
              valor: p.ordens,
              cor: PRAZOS[p.faixa].cor,
              icone: PRAZOS[p.faixa].icone,
              detalhe: `${numero(p.itens_abertos)} itens · ${moedaCurta(p.valor_aberto)}`,
              href: p.faixa <= 3 ? '/ordens?filtro=vencidas' : undefined,
            }))}
            formatar={(v) => `${numero(v)} ordens`}
          />
        </Painel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Painel className="xl:col-span-2" corpo="tabela" titulo="Por grupo de planejamento" descricao="Somente ordens com itens pendentes.">
          {d.grupos.length ? (
            <div className="overflow-x-auto">
              <table className="tabela md:min-w-[600px]">
                <thead>
                  <tr>
                    <th>Grupo</th>
                    <th className="text-right">Ordens</th>
                    <th className="hidden text-right md:table-cell">Itens</th>
                    <th className="text-right">Valor pendente</th>
                    <th className="w-40">Vencidas</th>
                    <th className="hidden text-right md:table-cell">Paradas</th>
                  </tr>
                </thead>
                <tbody>
                  {d.grupos.map((g) => (
                    <tr key={g.grupo}>
                      <td>
                        <Link href={`/ordens?grupo=${encodeURIComponent(g.grupo)}`} className="codigo font-medium text-accent hover:underline">
                          {g.grupo}
                        </Link>
                      </td>
                      <td className="hidden text-ink-2 lg:table-cell">{nomeCurto(resp.get(g.grupo)?.abastecimento) || <span className="text-muted">—</span>}</td>
                      <td className="num text-right font-medium">{numero(g.abertas)}</td>
                      <td className="num hidden text-right text-ink-2 md:table-cell">{numero(g.itens_abertos)}</td>
                      <td className="num text-right whitespace-nowrap">{moedaCurta(g.valor_aberto)}</td>
                      <td>
                        <Medidor fracao={g.abertas ? g.vencidas / g.abertas : 0} cor="var(--crit)" rotulo={`${numero(g.vencidas)} de ${numero(g.abertas)} ordens vencidas`} />
                      </td>
                      <td className="num hidden text-right md:table-cell">{g.paradas ? <Selo tom="alerta">{numero(g.paradas)}</Selo> : <span className="text-muted">0</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-5"><Vazio texto="Nenhuma ordem com itens pendentes." /></div>
          )}
        </Painel>

        <Painel titulo="Aprovação dos itens pendentes" descricao="Status de aprovação no SAP dos itens ainda não atendidos.">
          <Barras
            itens={d.aprovacao.map((a) => ({
              rotulo: a.aprovacao,
              valor: a.itens,
              cor: APROVACAO[a.aprovacao]?.cor ?? 'var(--deemph-1)',
              icone: APROVACAO[a.aprovacao]?.icone,
              detalhe: moedaCurta(a.valor),
            }))}
            formatar={(v) => `${numero(v)} itens`}
          />
        </Painel>
      </div>

      <Painel
        className="mt-4"
        corpo="tabela"
        titulo="Maiores pendências em valor"
        descricao="As ordens abertas com mais valor em itens ainda não atendidos."
        acao={
          <Link href="/ordens" className="flex shrink-0 items-center gap-1 text-xs font-medium text-accent hover:underline">
            Todas as ordens <ArrowRight className="size-3" />
          </Link>
        }
      >
        {d.maiores.length ? (
          <div className="overflow-x-auto">
            <table className="tabela md:min-w-[760px]">
              <thead>
                <tr>
                  <th>Ordem</th>
                  <th>Descrição</th>
                  <th className="hidden md:table-cell">Grupo</th>
                  <th className="hidden md:table-cell">Status</th>
                  <th className="hidden text-right md:table-cell">Itens</th>
                  <th className="hidden sm:table-cell">Necessidade</th>
                  <th className="text-right">Valor pendente</th>
                </tr>
              </thead>
              <tbody>
                {d.maiores.map((o) => {
                  const vencida = o.vencida
                  return (
                    <tr key={o.ordem}>
                      <td>
                        <Link href={`/ordens/${o.ordem}`} className="codigo font-medium text-accent hover:underline">
                          {o.ordem}
                        </Link>
                      </td>
                      <td className="max-w-[110px] sm:max-w-[340px]">
                        <div className="truncate">{o.texto_ordem ?? '—'}</div>
                      </td>
                      <td className="codigo hidden text-ink-2 md:table-cell">{o.grp_planejamento ?? '—'}</td>
                      <td className="codigo hidden text-xs whitespace-nowrap text-ink-2 md:table-cell">
                        {o.fase_sistema ?? '—'} · {o.fase_usuario ?? '—'}
                      </td>
                      <td className="num hidden text-right md:table-cell">{numero(o.itens_abertos)}</td>
                      <td className="num hidden whitespace-nowrap sm:table-cell">{vencida ? <Selo tom="critico">{data(o.necessidade_mais_antiga)}</Selo> : data(o.necessidade_mais_antiga)}</td>
                      <td className="num text-right font-medium whitespace-nowrap">{moeda(o.valor_aberto)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5"><Vazio texto="Nenhuma ordem com itens pendentes." /></div>
        )}
      </Painel>

      {/* Follow-up */}
      <div className="mt-10 mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Follow-up de pedidos</p>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.01em]">Retorno dos fornecedores</h2>
        </div>
        <Link href="/fup" className="flex items-center gap-1 text-xs font-medium text-accent hover:underline">
          Abrir follow-up <ArrowRight className="size-3" />
        </Link>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi rotulo="Itens em atraso" valor={numero(f.atraso)} detalhe={moedaCurta(f.valor_atraso)} tom={f.atraso ? 'alerta' : undefined} href="/fup" />
        <Kpi
          rotulo="Sem retorno do fornecedor"
          valor={moedaCurta(Number(f.total) - Number(f.com_retorno))}
          detalhe={`${pct(Number(f.total) - Number(f.com_retorno), f.total).toLocaleString('pt-BR')}% da carteira`}
          href="/fup"
        />
        <Kpi rotulo="Elegíveis a cancelar ou prorrogar" valor={numero(f.eleg_cancelamento)} detalhe="3+ cobranças sem resposta" href="/fup?retorno=cancelavel" />
        <Kpi rotulo="Itens em follow-up" valor={numero(f.itens)} detalhe={`${moedaCurta(f.total)} em carteira`} href="/fup" />
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-3">
        <Painel className="xl:col-span-2" titulo="Valor ativado por semana" descricao="Valor corrigido dos pedidos ativados no follow-up.">
          {d.fupSemanas.length ? (
            <GraficoRetornoSemanal dados={d.fupSemanas.map((s) => ({ semana: s.semana, com_retorno: Number(s.com_retorno), sem_retorno: Number(s.sem_retorno) }))} />
          ) : (
            <Vazio texto="Importe a planilha de FUP para ver este gráfico." />
          )}
        </Painel>
        <Painel titulo="Com quem está a pendência" descricao="Valor em follow-up por responsável.">
          <Barras
            itens={d.fupResponsavel.map((x) => ({ rotulo: x.responsavel, valor: Number(x.valor), detalhe: `${numero(x.itens)} itens`, href: `/fup?responsavel=${encodeURIComponent(x.responsavel)}` }))}
            formatar={moedaCurta}
          />
        </Painel>
      </div>

      <p className="mt-8 text-xs text-muted">
        Última atualização:{' '}
        {d.importacoes.length
          ? d.importacoes.map((i) => `${NOME_BASE[i.base] ?? i.base} ${dataHora(i.concluido_em)}`).join(' · ')
          : 'nenhuma importação'}
      </p>
    </>
  )
}

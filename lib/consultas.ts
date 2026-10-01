import 'server-only'
import { query, queryOne } from './db'
import { garantirEsquemaEventos } from './importacao'

export async function configuracoes() {
  const rows = await query<{ chave: string; valor: string }>('select chave, valor from configuracoes')
  const mapa = Object.fromEntries(rows.map((r) => [r.chave, r.valor]))
  return {
    diasSemMovimentacao: Number(mapa.dias_sem_movimentacao ?? 30),
    diasRecobranca: Number(mapa.dias_recobranca ?? 7),
  }
}

/** Expressão SQL da situação de prazo do FUP. */
export const FUP_PRAZO_SQL = `case
  when f.status_sap in ('Entregue', 'Eliminado') then 'encerrado'
  when coalesce(f.nova_data, f.data_remessa_corrigida) < current_date then 'atraso'
  else 'no_prazo' end`

/** Condição SQL de ordem que precisa de cobrança (sem movimentação há N dias). */
const ORDEM_PARADA_SQL = `o.itens_abertos > 0
  and o.ultima_mudanca_em < now() - make_interval(days => $1::int)
  and coalesce(a.situacao, 'sem_acao') <> 'resolvido'
  and (a.ultima_cobranca_em is null or a.ultima_cobranca_em < now() - make_interval(days => $2::int))`

export type OrdemResumo = {
  ordem: string
  texto_ordem: string | null
  local_instalacao: string | null
  grp_planejamento: string | null
  status_usuario: string | null
  status_sistema: string | null
  itens: number
  itens_abertos: number
  itens_retirados: number
  itens_eliminados: number
  valor: string
  necessidade_mais_antiga: string | null
  ultima_mudanca_em: string
  dias_parada: number
  situacao: string | null
  setor_responsavel: string | null
  cobrancas: number | null
  ultima_cobranca_em: string | null
  observacao: string | null
}

const ORDEM_SELECT = `select o.*, (current_date - o.ultima_mudanca_em::date)::int as dias_parada,
  a.situacao, a.setor_responsavel, a.cobrancas, a.ultima_cobranca_em, a.observacao
  from ordens_resumo o left join ordem_acompanhamento a on a.ordem = o.ordem`

/** Fase da ordem no SAP = primeiro código do status (sistema: ABER/LIB/ENTE/ENCE; usuário: PLAN/EXCT/…). */
const FASE_SISTEMA_SQL = `nullif(split_part(coalesce(o.status_sistema, ''), ' ', 1), '')`
const FASE_USUARIO_SQL = `nullif(split_part(coalesce(o.status_usuario, ''), ' ', 1), '')`

export async function painel() {
  const cfg = await configuracoes()
  const [resumo, fases, prazos, grupos, maiores, aprovacao, fupResumo, fupSemanas, fupResponsavel, antecs, importacoes] = await Promise.all([
    queryOne<{
      total: number
      abertas: number
      itens: number
      itens_abertos: number
      itens_retirados: number
      itens_eliminados: number
      valor_aberto: string
      paradas: number
      vencidas: number
      valor_vencido: string
    }>(
      `select count(*)::int as total,
              count(*) filter (where o.itens_abertos > 0)::int as abertas,
              coalesce(sum(o.itens), 0)::int as itens,
              coalesce(sum(o.itens_abertos), 0)::int as itens_abertos,
              coalesce(sum(o.itens_retirados), 0)::int as itens_retirados,
              coalesce(sum(o.itens_eliminados), 0)::int as itens_eliminados,
              coalesce(sum(o.valor_aberto), 0) as valor_aberto,
              count(*) filter (where ${ORDEM_PARADA_SQL})::int as paradas,
              count(*) filter (where o.itens_abertos > 0 and o.necessidade_mais_antiga < current_date)::int as vencidas,
              coalesce(sum(o.valor_aberto) filter (where o.itens_abertos > 0 and o.necessidade_mais_antiga < current_date), 0) as valor_vencido
         from ordens_resumo o left join ordem_acompanhamento a on a.ordem = o.ordem`,
      [cfg.diasSemMovimentacao, cfg.diasRecobranca],
    ),
    query<{ fase_sistema: string | null; fase_usuario: string | null; ordens: number; itens_abertos: number; valor_aberto: string; vencidas: number }>(
      `select ${FASE_SISTEMA_SQL} as fase_sistema, ${FASE_USUARIO_SQL} as fase_usuario,
              count(*)::int as ordens, sum(o.itens_abertos)::int as itens_abertos, sum(o.valor_aberto) as valor_aberto,
              count(*) filter (where o.necessidade_mais_antiga < current_date)::int as vencidas
         from ordens_resumo o where o.itens_abertos > 0
        group by 1, 2 order by sum(o.valor_aberto) desc nulls last`,
    ),
    query<{ faixa: number; ordens: number; itens_abertos: number; valor_aberto: string }>(
      `select case
                when o.necessidade_mais_antiga is null then 6
                when o.necessidade_mais_antiga < current_date - 90 then 1
                when o.necessidade_mais_antiga < current_date - 30 then 2
                when o.necessidade_mais_antiga < current_date then 3
                when o.necessidade_mais_antiga <= current_date + 30 then 4
                else 5 end as faixa,
              count(*)::int as ordens, sum(o.itens_abertos)::int as itens_abertos, sum(o.valor_aberto) as valor_aberto
         from ordens_resumo o where o.itens_abertos > 0 group by 1 order by 1`,
    ),
    query<{ grupo: string; abertas: number; itens_abertos: number; valor_aberto: string; vencidas: number; paradas: number }>(
      `select coalesce(o.grp_planejamento, '—') as grupo,
              count(*)::int as abertas, sum(o.itens_abertos)::int as itens_abertos, sum(o.valor_aberto) as valor_aberto,
              count(*) filter (where o.necessidade_mais_antiga < current_date)::int as vencidas,
              count(*) filter (where ${ORDEM_PARADA_SQL})::int as paradas
         from ordens_resumo o left join ordem_acompanhamento a on a.ordem = o.ordem
        where o.itens_abertos > 0 group by 1 order by 4 desc nulls last`,
      [cfg.diasSemMovimentacao, cfg.diasRecobranca],
    ),
    query<{ ordem: string; texto_ordem: string | null; grp_planejamento: string | null; fase_sistema: string | null; fase_usuario: string | null; itens_abertos: number; valor_aberto: string; necessidade_mais_antiga: string | null; vencida: boolean }>(
      `select o.ordem, o.texto_ordem, o.grp_planejamento, ${FASE_SISTEMA_SQL} as fase_sistema, ${FASE_USUARIO_SQL} as fase_usuario,
              o.itens_abertos, o.valor_aberto, o.necessidade_mais_antiga, coalesce(o.necessidade_mais_antiga < current_date, false) as vencida
         from ordens_resumo o where o.itens_abertos > 0 order by o.valor_aberto desc nulls last limit 8`,
    ),
    query<{ aprovacao: string; itens: number; valor: string }>(
      `select coalesce(nullif(status_aprovacao, ''), 'Sem status') as aprovacao, count(*)::int as itens, coalesce(sum(qtd * preco_medio), 0) as valor
         from ordem_itens
        where removido_em is null and not eliminado and coalesce(status_item, 'ABERTO') in ('ABERTO', 'PENDENTE', 'PARCIAL')
        group by 1 order by 2 desc`,
    ),
    queryOne<{ total: string; com_retorno: string; itens: number; atraso: number; valor_atraso: string; eleg_cancelamento: number }>(
      `select coalesce(sum(valor), 0) as total,
              coalesce(sum(valor) filter (where retorno), 0) as com_retorno,
              count(*)::int as itens,
              count(*) filter (where ${FUP_PRAZO_SQL} = 'atraso')::int as atraso,
              coalesce(sum(valor) filter (where ${FUP_PRAZO_SQL} = 'atraso'), 0) as valor_atraso,
              count(*) filter (where not coalesce(retorno, false) and cobrancas >= 3 and ${FUP_PRAZO_SQL} <> 'encerrado')::int as eleg_cancelamento
         from fup f where removido_em is null`,
    ),
    query<{ semana: string; com_retorno: string; sem_retorno: string }>(
      `select coalesce(semana_ativacao, 'Sem data') as semana,
              coalesce(sum(valor) filter (where retorno), 0) as com_retorno,
              coalesce(sum(valor) filter (where not coalesce(retorno, false)), 0) as sem_retorno
         from fup where removido_em is null
        group by 1 order by min(data_ativacao) nulls last`,
    ),
    query<{ responsavel: string; valor: string; itens: number }>(
      `select coalesce(responsavel, 'Não definido') as responsavel, sum(valor) as valor, count(*)::int as itens
         from fup where removido_em is null group by 1 order by 2 desc nulls last limit 8`,
    ),
    antecsResumo(),
    query<{ base: string; concluido_em: string; linhas: number }>(
      `select distinct on (base) base, concluido_em, linhas from importacoes
        where status = 'concluida' order by base, concluido_em desc`,
    ),
  ])
  return { cfg, resumo: resumo!, fases, prazos, grupos, maiores, aprovacao, fupResumo: fupResumo!, fupSemanas, fupResponsavel, antecs, importacoes }
}

export type FiltroOrdens = { busca?: string; filtro?: string; grupo?: string; pagina?: number }

export async function listarOrdens({ busca, filtro, grupo, pagina = 1 }: FiltroOrdens) {
  const cfg = await configuracoes()
  const where: string[] = []
  const params: unknown[] = [cfg.diasSemMovimentacao, cfg.diasRecobranca]
  if (busca?.trim()) {
    params.push(`%${busca.trim()}%`)
    const p = `$${params.length}`
    where.push(`(o.ordem ilike ${p} or o.texto_ordem ilike ${p} or o.local_instalacao ilike ${p}
      or exists (select 1 from ordem_itens i where i.ordem = o.ordem and (i.material ilike ${p} or i.descricao ilike ${p} or i.reserva ilike ${p})))`)
  }
  if (grupo) {
    params.push(grupo)
    where.push(`o.grp_planejamento = $${params.length}`)
  }
  if (filtro === 'abertas' || !filtro) where.push('o.itens_abertos > 0')
  if (filtro === 'paradas') where.push(ORDEM_PARADA_SQL)
  if (filtro === 'vencidas') where.push('o.itens_abertos > 0 and o.necessidade_mais_antiga < current_date')
  if (filtro === 'cobradas') where.push("a.situacao in ('cobrado', 'aguardando')")
  if (filtro === 'encerradas') where.push('o.itens_abertos = 0')
  // Garante que $1/$2 sejam sempre usados (evita erro de tipo do Postgres).
  where.push('$1::int >= 0 and $2::int >= 0')
  const porPagina = 50
  const sqlWhere = `where ${where.join(' and ')}`
  const [linhas, total] = await Promise.all([
    query<OrdemResumo>(
      `${ORDEM_SELECT} ${sqlWhere} order by o.ultima_mudanca_em asc, o.ordem limit ${porPagina} offset ${(pagina - 1) * porPagina}`,
      params,
    ),
    queryOne<{ total: number }>(
      `select count(*)::int as total from ordens_resumo o left join ordem_acompanhamento a on a.ordem = o.ordem ${sqlWhere}`,
      params,
    ),
  ])
  return { linhas, total: total?.total ?? 0, porPagina, cfg }
}

export async function gruposPlanejamento() {
  const rows = await query<{ grupo: string }>(
    'select distinct grp_planejamento as grupo from ordem_itens where grp_planejamento is not null order by 1',
  )
  return rows.map((r) => r.grupo)
}

export type OrdemSap = {
  ordem: string
  tipo: string | null
  prioridade: string | null
  grp_planejamento: string | null
  centro_trabalho: string | null
  tam: string | null
  plano_manutencao: string | null
  status_aprovacao: string | null
  local_instalacao: string | null
  denominacao_local: string | null
  texto: string | null
  status_usuario: string | null
  status_sistema: string | null
  modificado_por: string | null
  criado_por: string | null
  unidade_operacional: string | null
  centro_custo: string | null
  nota: string | null
  inicio_base: string | null
  fim_base: string | null
  data_modificacao: string | null
  data_liberacao: string | null
  data_entrada: string | null
  custo_planejado: string | null
  removido_em: string | null
}

export async function detalheOrdem(ordem: string) {
  const resumo = await queryOne<OrdemResumo>(`${ORDEM_SELECT} where o.ordem = $1`, [ordem])
  const [itens, pedidos, eventos, antecs, sap] = await Promise.all([
    query(
      `select reserva, item, material, descricao, qtd, unidade, qtd_retirada, data_necessidade, status_item,
              status_aprovacao, eliminado, preco_medio, removido_em
         from ordem_itens where ordem = $1 order by eliminado, reserva, item::int nulls last`,
      [ordem],
    ),
    query(
      `select po, item_po, rm, item_rm, descricao, fornecedor, email, data_remessa, status_po, faixa_atraso, valor, qtd
         from ativacao where ordem = $1 and removido_em is null order by data_remessa nulls last`,
      [ordem],
    ),
    query<{ tipo: string; descricao: string; criado_em: string; usuario: string | null }>(
      `select e.tipo, e.descricao, e.criado_em, u.nome as usuario from eventos e left join usuarios u on u.id = e.usuario_id
        where e.entidade = 'ordem' and e.chave = $1 order by e.criado_em desc limit 100`,
      [ordem],
    ),
    query('select id, numero, status, recebida_em from antecs where ordem = $1 order by recebida_em desc', [ordem]),
    // Cadastro da OM vindo da IW38 (a tabela só existe depois da primeira importação dessa base).
    queryOne<OrdemSap>(
      'select s.* from ordens_sap s where s.ordem = $1',
      [ordem],
    ).catch(() => null),
  ])
  return { resumo, itens, pedidos, eventos, antecs, sap }
}

type FiltroFup = {
  busca?: string
  prazo?: string
  retorno?: string
  responsavel?: string
  evento?: string
  /** Índice em FAIXAS_REMESSA (clique numa coluna do gráfico). */
  remessa?: string
  diretoria?: string
}

/** Limites (em dias até a remessa) de cada faixa de FAIXAS_REMESSA. */
const LIMITES_REMESSA: Array<[number | null, number | null]> = [
  [null, -181], [-180, -91], [-90, -31], [-30, -1], [0, 30], [31, 90], [91, null],
]

/** WHERE da tela de follow-up: a lista e os gráficos usam exatamente o mesmo recorte. */
function filtroFup(params: FiltroFup) {
  const where = ['f.removido_em is null']
  const valores: unknown[] = []
  const add = (sql: string, valor: unknown) => {
    valores.push(valor)
    where.push(sql.replace('?', `$${valores.length}`))
  }
  if (params.busca?.trim()) {
    valores.push(`%${params.busca.trim()}%`)
    const p = `$${valores.length}`
    where.push(`(f.po ilike ${p} or f.fornecedor ilike ${p} or f.descricao ilike ${p} or f.material ilike ${p} or f.rm_item ilike ${p})`)
  }
  if (params.prazo) add(`${FUP_PRAZO_SQL} = ?`, params.prazo)
  if (params.retorno === 'sim') where.push('f.retorno')
  if (params.retorno === 'nao') where.push('not coalesce(f.retorno, false)')
  if (params.retorno === 'cancelavel') where.push(`not coalesce(f.retorno, false) and f.cobrancas >= 3 and ${FUP_PRAZO_SQL} <> 'encerrado'`)
  if (params.responsavel) add('coalesce(f.responsavel, \'Não definido\') = ?', params.responsavel)
  if (params.evento === 'rg') where.push("f.evento = 'RG'")
  const limites = params.remessa ? LIMITES_REMESSA[Number(params.remessa)] : undefined
  if (limites) {
    const d = 'coalesce(f.nova_data, f.data_remessa_corrigida) - current_date'
    where.push(`${FUP_PRAZO_SQL} <> 'encerrado' and ${d} is not null`)
    if (limites[0] != null) where.push(`${d} >= ${limites[0]}`)
    if (limites[1] != null) where.push(`${d} <= ${limites[1]}`)
  }
  if (params.diretoria) add("coalesce(nullif(f.diretoria, ''), 'Sem diretoria') = ?", params.diretoria)
  return { sqlWhere: `where ${where.join(' and ')}`, valores }
}

export async function listarFup(params: FiltroFup & { pagina?: number; semLinhas?: boolean }) {
  const { sqlWhere, valores } = filtroFup(params)
  const porPagina = 50
  const pagina = params.pagina ?? 1
  const [linhas, total, responsaveis, eventosRg] = await Promise.all([
    params.semLinhas
      ? Promise.resolve([])
      : query(
          `select f.*, ${FUP_PRAZO_SQL} as prazo from fup f ${sqlWhere}
            order by (${FUP_PRAZO_SQL} = 'atraso') desc, f.valor desc nulls last limit ${porPagina} offset ${(pagina - 1) * porPagina}`,
          valores,
        ),
    queryOne<{ total: number; valor: string }>(
      `select count(*)::int as total, coalesce(sum(valor), 0) as valor from fup f ${sqlWhere}`,
      valores,
    ),
    query<{ responsavel: string }>(
      "select distinct coalesce(responsavel, 'Não definido') as responsavel from fup where removido_em is null order by 1",
    ),
    query<{ evento: string; itens: number; valor: string; atraso: number; com_retorno: number }>(
      `select coalesce(nullif(descricao_evento, ''), 'RG sem descrição') as evento, count(*)::int as itens, sum(valor) as valor,
              count(*) filter (where ${FUP_PRAZO_SQL} = 'atraso')::int as atraso,
              count(*) filter (where f.retorno)::int as com_retorno
         from fup f where removido_em is null and evento = 'RG' group by 1 order by 3 desc nulls last`,
    ),
  ])
  return {
    linhas,
    total: total?.total ?? 0,
    valor: total?.valor ?? '0',
    porPagina,
    responsaveis: responsaveis.map((r) => r.responsavel),
    eventosRg,
  }
}

/** Faixas de atraso/antecedência da remessa (em dias, relativo a hoje). A ordem é a do eixo do gráfico. */
export const FAIXAS_REMESSA = [
  { rotulo: '> 180 d', grupo: 'atraso' },
  { rotulo: '91–180 d', grupo: 'atraso' },
  { rotulo: '31–90 d', grupo: 'atraso' },
  { rotulo: '1–30 d', grupo: 'atraso' },
  { rotulo: '0–30 d', grupo: 'prazo' },
  { rotulo: '31–90 d', grupo: 'prazo' },
  { rotulo: '> 90 d', grupo: 'prazo' },
] as const

/** Gráficos do follow-up, no mesmo recorte de filtros da lista. Pedidos entregues/eliminados ficam de fora. */
export async function graficosFup(params: FiltroFup) {
  const { sqlWhere, valores } = filtroFup(params)
  const abertos = `${sqlWhere} and ${FUP_PRAZO_SQL} <> 'encerrado'`
  const [faixas, fornecedores, retorno, diretorias, responsaveis] = await Promise.all([
    query<{ faixa: number; itens: number; valor: string }>(
      `select case when d < -180 then 0 when d < -90 then 1 when d < -30 then 2 when d < 0 then 3
                   when d <= 30 then 4 when d <= 90 then 5 else 6 end as faixa,
              count(*)::int as itens, coalesce(sum(valor), 0) as valor
         from (select f.valor, coalesce(f.nova_data, f.data_remessa_corrigida) - current_date as d from fup f ${abertos}) x
        where d is not null group by 1 order by 1`,
      valores,
    ),
    query<{ fornecedor: string; itens: number; valor: string; sem_retorno: number }>(
      `select coalesce(f.fornecedor, 'Sem fornecedor') as fornecedor, count(*)::int as itens, coalesce(sum(f.valor), 0) as valor,
              count(*) filter (where not coalesce(f.retorno, false))::int as sem_retorno
         from fup f ${sqlWhere} and ${FUP_PRAZO_SQL} = 'atraso'
        group by 1 order by 3 desc nulls last limit 10`,
      valores,
    ),
    queryOne<{ com_retorno: string; sem_retorno: string; cobrado_3x: string; itens_3x: number }>(
      `select coalesce(sum(f.valor) filter (where f.retorno), 0) as com_retorno,
              coalesce(sum(f.valor) filter (where not coalesce(f.retorno, false)), 0) as sem_retorno,
              coalesce(sum(f.valor) filter (where not coalesce(f.retorno, false) and f.cobrancas >= 3), 0) as cobrado_3x,
              count(*) filter (where not coalesce(f.retorno, false) and f.cobrancas >= 3)::int as itens_3x
         from fup f ${abertos}`,
      valores,
    ),
    query<{ diretoria: string; itens: number; valor: string; valor_atraso: string; valor_retorno: string }>(
      `select coalesce(nullif(f.diretoria, ''), 'Sem diretoria') as diretoria, count(*)::int as itens, coalesce(sum(f.valor), 0) as valor,
              coalesce(sum(f.valor) filter (where ${FUP_PRAZO_SQL} = 'atraso'), 0) as valor_atraso,
              coalesce(sum(f.valor) filter (where f.retorno), 0) as valor_retorno
         from fup f ${abertos} group by 1 order by 3 desc nulls last`,
      valores,
    ),
    query<{ responsavel: string; itens: number; valor: string }>(
      `select coalesce(f.responsavel, 'Não definido') as responsavel, count(*)::int as itens, coalesce(sum(f.valor), 0) as valor
         from fup f ${abertos} group by 1 order by 3 desc nulls last limit 6`,
      valores,
    ),
  ])
  return {
    faixas: FAIXAS_REMESSA.map((f, i) => {
      const linha = faixas.find((x) => x.faixa === i)
      return { ...f, itens: linha?.itens ?? 0, valor: Number(linha?.valor ?? 0) }
    }),
    fornecedores,
    retorno: retorno!,
    diretorias,
    responsaveis,
  }
}

/** Remessas da ativação ainda não entregues: atrasadas, mês a mês (6 meses) e depois. */
export async function remessasAtivacao() {
  const linhas = await query<{ mes: string; itens: number; valor: string }>(
    `select case when data_remessa is null then 'sem'
                 when data_remessa < current_date then 'atrasada'
                 when data_remessa >= date_trunc('month', current_date) + interval '6 months' then 'depois'
                 else to_char(data_remessa, 'YYYY-MM') end as mes,
            count(*)::int as itens, coalesce(sum(valor * coalesce(qtd, 1)), 0) as valor
       from ativacao where removido_em is null and coalesce(status_po, '') not ilike '%entregue%'
      group by 1`,
  )
  const hoje = new Date()
  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const pega = (chave: string) => linhas.find((l) => l.mes === chave)
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  const nomeMes = (chave: string) => `${MESES[Number(chave.slice(5)) - 1]}/${chave.slice(2, 4)}`
  return [
    { chave: 'atrasada', rotulo: 'Atrasada', grupo: 'atraso' as const },
    ...meses.map((m) => ({ chave: m, rotulo: nomeMes(m), grupo: 'prazo' as const })),
    { chave: 'depois', rotulo: 'Depois', grupo: 'prazo' as const },
    { chave: 'sem', rotulo: 'Sem data', grupo: 'sem' as const },
  ].map((b) => ({ ...b, itens: pega(b.chave)?.itens ?? 0, valor: Number(pega(b.chave)?.valor ?? 0) }))
}

export async function listarAtivacao(params: { busca?: string; faixa?: string; mes?: string; pagina?: number }) {
  const where = ['removido_em is null']
  const valores: unknown[] = []
  if (params.busca?.trim()) {
    valores.push(`%${params.busca.trim()}%`)
    where.push('(po ilike $1 or rm ilike $1 or ordem ilike $1 or fornecedor ilike $1 or descricao ilike $1 or material ilike $1)')
  }
  if (params.faixa === 'atraso') where.push("(status_po ilike '%atraso%' or faixa_atraso ilike '%entre%' or faixa_atraso ilike '%maior%' or faixa_atraso ilike '%menor%')")
  if (params.faixa === 'entregue') where.push("status_po ilike '%entregue%'")
  // Clique numa coluna do gráfico de remessas (mesmos recortes de remessasAtivacao).
  if (params.mes) {
    where.push("coalesce(status_po, '') not ilike '%entregue%'")
    if (params.mes === 'sem') where.push('data_remessa is null')
    else if (params.mes === 'atrasada') where.push('data_remessa < current_date')
    else if (params.mes === 'depois') where.push("data_remessa >= date_trunc('month', current_date) + interval '6 months'")
    else if (/^\d{4}-\d{2}$/.test(params.mes)) {
      valores.push(`${params.mes}-01`)
      where.push(`data_remessa >= current_date and date_trunc('month', data_remessa) = $${valores.length}::date`)
    }
  }
  const porPagina = 50
  const pagina = params.pagina ?? 1
  const sqlWhere = `where ${where.join(' and ')}`
  const [linhas, total, porStatus] = await Promise.all([
    query(`select * from ativacao ${sqlWhere} order by data_remessa nulls last limit ${porPagina} offset ${(pagina - 1) * porPagina}`, valores),
    queryOne<{ total: number; valor: string }>(`select count(*)::int as total, coalesce(sum(valor * coalesce(qtd, 1)), 0) as valor from ativacao ${sqlWhere}`, valores),
    query<{ status: string; itens: number }>(
      `select coalesce(status_po, 'Sem status') as status, count(*)::int as itens from ativacao where removido_em is null group by 1 order by 2 desc limit 8`,
    ),
  ])
  return { linhas, total: total?.total ?? 0, valor: total?.valor ?? '0', porPagina, porStatus }
}

// ---------- ANTEC ----------

export type Antec = {
  id: number
  numero: string
  ordem: string | null
  po: string | null
  descricao: string | null
  area: string | null
  ponto_focal: string | null
  recebida_em: string
  enviada_area_em: string | null
  retorno_area_em: string | null
  status: 'recebida' | 'com_area' | 'em_aprovacao' | 'concluida' | 'cancelada'
  observacao: string | null
}

/** Dias úteis entre duas datas (seg–sex), sem contar o dia inicial. */
export function diasUteis(inicio: Date, fim: Date) {
  let dias = 0
  const d = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), inicio.getUTCDate()))
  const alvo = Date.UTC(fim.getUTCFullYear(), fim.getUTCMonth(), fim.getUTCDate())
  while (d.getTime() < alvo) {
    d.setUTCDate(d.getUTCDate() + 1)
    const dia = d.getUTCDay()
    if (dia !== 0 && dia !== 6) dias++
  }
  return dias
}

/** Prazo da etapa atual: Central tem 1 dia útil para enviar, área tem 4 dias úteis para retornar. */
export function prazoAntec(a: Antec, hoje = new Date()) {
  const data = (v: string | null) => (v ? new Date(`${String(v).slice(0, 10)}T00:00:00Z`) : null)
  if (a.status === 'recebida') {
    const usados = diasUteis(data(a.recebida_em)!, hoje)
    return { etapa: 'Central', limite: 1, usados, atrasada: usados > 1 }
  }
  if (a.status === 'com_area') {
    const usados = diasUteis(data(a.enviada_area_em) ?? data(a.recebida_em)!, hoje)
    return { etapa: 'Área', limite: 4, usados, atrasada: usados > 4 }
  }
  return null
}

export async function listarAntecs() {
  return query<Antec>(
    `select id, numero, ordem, po, descricao, area, ponto_focal, recebida_em::text, enviada_area_em::text,
            retorno_area_em::text, status, observacao
       from antecs order by status in ('concluida', 'cancelada'), recebida_em desc limit 500`,
  )
}

export async function antecsResumo() {
  const antecs = await listarAntecs()
  let abertas = 0
  let atrasadas = 0
  for (const a of antecs) {
    const prazo = prazoAntec(a)
    if (a.status !== 'concluida' && a.status !== 'cancelada') abertas++
    if (prazo?.atrasada) atrasadas++
  }
  return { abertas, atrasadas }
}

// ---------- Alertas ----------

export async function alertas() {
  const cfg = await configuracoes()
  const [paradas, vencidas, recobrar, antecs, cancelaveis] = await Promise.all([
    query<OrdemResumo>(
      `${ORDEM_SELECT} where ${ORDEM_PARADA_SQL} order by o.ultima_mudanca_em asc`,
      [cfg.diasSemMovimentacao, cfg.diasRecobranca],
    ),
    query<OrdemResumo>(
      `${ORDEM_SELECT} where o.itens_abertos > 0 and o.necessidade_mais_antiga < current_date - 7
        and coalesce(a.situacao, 'sem_acao') <> 'resolvido' order by o.necessidade_mais_antiga asc`,
    ),
    query<OrdemResumo>(
      `${ORDEM_SELECT} where a.situacao in ('cobrado', 'aguardando') and a.ultima_cobranca_em < now() - make_interval(days => $1::int)
        and o.itens_abertos > 0 order by a.ultima_cobranca_em asc`,
      [cfg.diasRecobranca],
    ),
    listarAntecs(),
    query(
      `select f.po_item, f.po, f.item_po, f.fornecedor, f.descricao, f.valor, f.cobrancas, f.ultima_cobranca_em, count(*) over()::int as total
         from fup f where f.removido_em is null and not coalesce(f.retorno, false) and f.cobrancas >= 3
          and ${FUP_PRAZO_SQL} <> 'encerrado' order by f.valor desc nulls last limit 100`,
    ),
  ])
  const antecsAtrasadas = antecs.filter((a) => prazoAntec(a)?.atrasada)
  const totalCancelaveis = Number(cancelaveis[0]?.total ?? 0)
  return { cfg, paradas, vencidas, recobrar, antecsAtrasadas, cancelaveis, totalCancelaveis }
}

export async function contarAlertas() {
  const cfg = await configuracoes()
  const r = await queryOne<{ total: number }>(
    `select count(*)::int as total from ordens_resumo o left join ordem_acompanhamento a on a.ordem = o.ordem where ${ORDEM_PARADA_SQL}`,
    [cfg.diasSemMovimentacao, cfg.diasRecobranca],
  )
  return r?.total ?? 0
}

export async function contarPendentes() {
  const r = await queryOne<{ total: number }>('select count(*)::int as total from usuarios where pendente_aprovacao')
  return r?.total ?? 0
}

// ---------- O que mudou (por importação) ----------

export type Importacao = {
  id: number
  base: string
  arquivo: string | null
  iniciado_em: string
  concluido_em: string | null
  linhas: number
  novas: number
  alteradas: number
  removidas: number
  status: string
  usuario: string | null
}

export async function detalheImportacao(id: number) {
  return queryOne<Importacao>(
    `select i.*, u.nome as usuario from importacoes i left join usuarios u on u.id = i.usuario_id where i.id = $1`,
    [id],
  )
}

/** Mudanças que uma importação trouxe: itens novos, alterados (antes → depois) e que saíram do relatório. */
export async function mudancasImportacao(params: { id: number; tipo?: string; busca?: string; pagina?: number }) {
  await garantirEsquemaEventos()
  const where = ['e.importacao_id = $1']
  const valores: unknown[] = [params.id]
  if (params.tipo && ['novo', 'mudanca', 'removido'].includes(params.tipo)) {
    valores.push(params.tipo)
    where.push(`e.tipo = $${valores.length}`)
  }
  if (params.busca?.trim()) {
    valores.push(`%${params.busca.trim()}%`)
    where.push(`(e.chave ilike $${valores.length} or e.descricao ilike $${valores.length})`)
  }
  const porPagina = 50
  const pagina = params.pagina ?? 1
  const sqlWhere = `where ${where.join(' and ')}`
  const [linhas, total, porTipo] = await Promise.all([
    query<{ id: number; entidade: string; chave: string; tipo: string; descricao: string }>(
      `select e.id, e.entidade, e.chave, e.tipo, e.descricao from eventos e ${sqlWhere}
        order by e.tipo, e.chave limit ${porPagina} offset ${(pagina - 1) * porPagina}`,
      valores,
    ),
    queryOne<{ total: number }>(`select count(*)::int as total from eventos e ${sqlWhere}`, valores),
    query<{ tipo: string; total: number }>(`select tipo, count(*)::int as total from eventos where importacao_id = $1 group by 1`, [params.id]),
  ])
  return { linhas, total: total?.total ?? 0, porPagina, porTipo }
}

/** Dias úteis (seg–sex) entre a data e hoje. Fim de semana sem importação não conta como atraso. */
function diasUteisDesde(data: Date) {
  let dias = 0
  const cursor = new Date(data)
  cursor.setHours(0, 0, 0, 0)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  while (cursor < hoje) {
    cursor.setDate(cursor.getDate() + 1)
    const dia = cursor.getDay()
    if (dia !== 0 && dia !== 6) dias++
  }
  return dias
}

/** Última importação concluída de cada base e se ela está atrasada (mais de 1 dia útil sem atualizar). */
export async function statusAtualizacao() {
  const linhas = await query<{ id: number; base: string; concluido_em: string; linhas: number; novas: number; alteradas: number; removidas: number }>(
    `select distinct on (base) id, base, concluido_em, linhas, novas, alteradas, removidas from importacoes
      where status = 'concluida' order by base, concluido_em desc`,
  )
  return linhas.map((l) => {
    const diasUteis = diasUteisDesde(new Date(l.concluido_em))
    return { ...l, diasUteis, atrasada: diasUteis > 1 }
  })
}

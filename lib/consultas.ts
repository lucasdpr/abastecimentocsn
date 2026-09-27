import 'server-only'
import { query, queryOne } from './db'

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
  from ordens o left join ordem_acompanhamento a on a.ordem = o.ordem`

export async function painel() {
  const cfg = await configuracoes()
  const [ordensResumo, faixas, fupResumo, fupSemanas, fupResponsavel, antecs, importacoes, grupos] = await Promise.all([
    queryOne<{ abertas: number; itens_abertos: number; paradas: number; vencidas: number; valor_aberto: string; total: number }>(
      `select count(*) filter (where o.itens_abertos > 0)::int as abertas,
              coalesce(sum(o.itens_abertos), 0)::int as itens_abertos,
              count(*) filter (where ${ORDEM_PARADA_SQL})::int as paradas,
              count(*) filter (where o.itens_abertos > 0 and o.necessidade_mais_antiga < current_date)::int as vencidas,
              coalesce(sum(o.valor) filter (where o.itens_abertos > 0), 0) as valor_aberto,
              count(*)::int as total
         from ordens o left join ordem_acompanhamento a on a.ordem = o.ordem`,
      [cfg.diasSemMovimentacao, cfg.diasRecobranca],
    ),
    query<{ faixa: string; ordens: number }>(
      `select faixa, count(*)::int as ordens from (
         select case
           when current_date - o.ultima_mudanca_em::date < 15 then '0–14 dias'
           when current_date - o.ultima_mudanca_em::date < 30 then '15–29 dias'
           when current_date - o.ultima_mudanca_em::date < 60 then '30–59 dias'
           else '60+ dias' end as faixa
         from ordens o where o.itens_abertos > 0) x
       group by faixa order by faixa`,
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
    query<{ grupo: string; abertas: number }>(
      `select coalesce(grp_planejamento, '—') as grupo, count(*)::int as abertas
         from ordens where itens_abertos > 0 group by 1 order by 2 desc limit 8`,
    ),
  ])
  return { cfg, ordensResumo, faixas, fupResumo, fupSemanas, fupResponsavel, antecs, importacoes, grupos }
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
      `select count(*)::int as total from ordens o left join ordem_acompanhamento a on a.ordem = o.ordem ${sqlWhere}`,
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

export async function detalheOrdem(ordem: string) {
  const resumo = await queryOne<OrdemResumo>(`${ORDEM_SELECT} where o.ordem = $1`, [ordem])
  const [itens, pedidos, eventos, antecs] = await Promise.all([
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
  ])
  return { resumo, itens, pedidos, eventos, antecs }
}

export async function listarFup(params: {
  busca?: string
  prazo?: string
  retorno?: string
  responsavel?: string
  evento?: string
  pagina?: number
}) {
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
  const porPagina = 50
  const pagina = params.pagina ?? 1
  const sqlWhere = `where ${where.join(' and ')}`
  const [linhas, total, responsaveis, eventosRg] = await Promise.all([
    query(
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

export async function listarAtivacao(params: { busca?: string; faixa?: string; pagina?: number }) {
  const where = ['removido_em is null']
  const valores: unknown[] = []
  if (params.busca?.trim()) {
    valores.push(`%${params.busca.trim()}%`)
    where.push('(po ilike $1 or rm ilike $1 or ordem ilike $1 or fornecedor ilike $1 or descricao ilike $1 or material ilike $1)')
  }
  if (params.faixa === 'atraso') where.push("(status_po ilike '%atraso%' or faixa_atraso ilike '%entre%' or faixa_atraso ilike '%maior%' or faixa_atraso ilike '%menor%')")
  if (params.faixa === 'entregue') where.push("status_po ilike '%entregue%'")
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
      `${ORDEM_SELECT} where ${ORDEM_PARADA_SQL} order by o.ultima_mudanca_em asc limit 200`,
      [cfg.diasSemMovimentacao, cfg.diasRecobranca],
    ),
    query<OrdemResumo>(
      `${ORDEM_SELECT} where o.itens_abertos > 0 and o.necessidade_mais_antiga < current_date - 7
        and coalesce(a.situacao, 'sem_acao') <> 'resolvido' order by o.necessidade_mais_antiga asc limit 100`,
    ),
    query<OrdemResumo>(
      `${ORDEM_SELECT} where a.situacao in ('cobrado', 'aguardando') and a.ultima_cobranca_em < now() - make_interval(days => $1::int)
        and o.itens_abertos > 0 order by a.ultima_cobranca_em asc limit 100`,
      [cfg.diasRecobranca],
    ),
    listarAntecs(),
    query(
      `select f.po_item, f.po, f.item_po, f.fornecedor, f.descricao, f.valor, f.cobrancas, f.ultima_cobranca_em
         from fup f where f.removido_em is null and not coalesce(f.retorno, false) and f.cobrancas >= 3
          and ${FUP_PRAZO_SQL} <> 'encerrado' order by f.valor desc nulls last limit 100`,
    ),
  ])
  const antecsAtrasadas = antecs.filter((a) => prazoAntec(a)?.atrasada)
  return { cfg, paradas, vencidas, recobrar, antecsAtrasadas, cancelaveis }
}

export async function contarAlertas() {
  const cfg = await configuracoes()
  const r = await queryOne<{ total: number }>(
    `select count(*)::int as total from ordens o left join ordem_acompanhamento a on a.ordem = o.ordem where ${ORDEM_PARADA_SQL}`,
    [cfg.diasSemMovimentacao, cfg.diasRecobranca],
  )
  return r?.total ?? 0
}

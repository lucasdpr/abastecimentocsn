import 'server-only'
import { BASES, type BaseId } from './bases'
import { query } from './db'
import { FUP_PRAZO_SQL } from './consultas'

type Coluna = { titulo: string; campo: string; tipo?: 'data' | 'numero' | 'simnao' | 'flag' | 'datahora' }

/** Colunas exportadas: as da planilha original (mesmos títulos, para reimportar) + as do app. */
export function colunasExportacao(baseId: BaseId): Coluna[] {
  const base = BASES[baseId]
  const originais: Coluna[] = base.campos.filter((c) => !c.app).map((c) => ({
    titulo: c.cabecalhos[0],
    campo: c.campo,
    tipo: c.tipo === 'data' ? 'data' : c.tipo === 'numero' || c.tipo === 'inteiro' ? 'numero' : c.tipo === 'simnao' ? 'simnao' : c.tipo === 'flag' ? 'flag' : undefined,
  }))
  const extras: Record<BaseId, Coluna[]> = {
    ordens: [
      { titulo: 'APP Situação', campo: 'app_situacao' },
      { titulo: 'APP Setor responsável', campo: 'app_setor' },
      { titulo: 'APP Observação', campo: 'app_observacao' },
      { titulo: 'APP Cobranças', campo: 'app_cobrancas', tipo: 'numero' },
      { titulo: 'APP Última cobrança', campo: 'app_ultima_cobranca', tipo: 'datahora' },
      { titulo: 'APP Dias sem mudança', campo: 'app_dias_parada', tipo: 'numero' },
      // Do relatório ZMR37 (base Materiais), pelo código do material.
      { titulo: 'MRP', campo: 'app_mrp' },
      { titulo: 'Tipo MRP', campo: 'app_tipo_mrp' },
      { titulo: 'Estoque livre', campo: 'app_estoque_livre', tipo: 'numero' },
    ],
    fup: [
      { titulo: 'APP Prazo', campo: 'app_prazo' },
      { titulo: 'APP Cobranças', campo: 'cobrancas', tipo: 'numero' },
      { titulo: 'APP Última cobrança', campo: 'ultima_cobranca_em', tipo: 'datahora' },
    ],
    ativacao: [],
    reservas: [],
    iw38: [],
    grupos: [],
    materiais: [],
  }
  return [...originais, ...extras[baseId]]
}

export async function dadosExportacao(baseId: BaseId) {
  switch (baseId) {
    case 'ordens':
      return query(
        `select i.*, a.situacao as app_situacao, a.setor_responsavel as app_setor, a.observacao as app_observacao,
                a.cobrancas as app_cobrancas, a.ultima_cobranca_em as app_ultima_cobranca,
                (current_date - o.ultima_mudanca_em::date) as app_dias_parada,
                m.planejador_mrp as app_mrp, m.tipo_mrp as app_tipo_mrp, m.estoque_livre as app_estoque_livre
           from ordem_itens i
           join ordens_resumo o on o.ordem = i.ordem
           left join ordem_acompanhamento a on a.ordem = i.ordem
           left join materiais_sap m on m.material = i.material and m.removido_em is null
          where i.removido_em is null order by i.ordem, i.reserva, i.item`,
      ).catch(() =>
        // Antes da primeira importação da ZMR37 a tabela materiais_sap ainda não existe.
        query(
          `select i.*, a.situacao as app_situacao, a.setor_responsavel as app_setor, a.observacao as app_observacao,
                  a.cobrancas as app_cobrancas, a.ultima_cobranca_em as app_ultima_cobranca,
                  (current_date - o.ultima_mudanca_em::date) as app_dias_parada
             from ordem_itens i
             join ordens_resumo o on o.ordem = i.ordem
             left join ordem_acompanhamento a on a.ordem = i.ordem
            where i.removido_em is null order by i.ordem, i.reserva, i.item`,
        ),
      )
    case 'fup':
      return query(`select f.*, ${FUP_PRAZO_SQL} as app_prazo from fup f where f.removido_em is null order by f.po, f.item_po`)
    case 'ativacao':
      return query('select * from ativacao where removido_em is null order by po, item_po')
    case 'reservas':
      return query('select * from reservas where removido_em is null order by reserva, item')
    case 'grupos':
      return query('select * from grupos_planejamento where removido_em is null order by gpm').catch(() => [])
    case 'materiais':
      return query('select * from materiais_sap where removido_em is null order by material').catch(() => [])
    case 'iw38':
      return query("select * from ordens_sap where removido_em is null order by ordem").catch(() => [])
  }
}

export function valorCelula(v: unknown, tipo?: Coluna['tipo']) {
  if (v == null) return null
  if (tipo === 'simnao') return v ? 'Sim' : 'Não'
  if (tipo === 'flag') return v ? 'X' : null
  if (tipo === 'numero') return Number(v)
  if (tipo === 'data') return v instanceof Date ? new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate())) : new Date(String(v))
  if (tipo === 'datahora') return v instanceof Date ? v : new Date(String(v))
  return String(v)
}

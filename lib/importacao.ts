import 'server-only'
import { createHash } from 'node:crypto'
import type { PoolClient } from 'pg'
import { BASES, converterValor, normalizarCabecalho, type Base, type BaseId } from './bases'
import { pool, query, queryOne } from './db'

const TIPO_SQL = { texto: 'text', codigo: 'text', numero: 'numeric', inteiro: 'int', data: 'date', flag: 'boolean', simnao: 'boolean' } as const

/**
 * Nomes amigáveis no histórico. Todos os campos vindos da planilha são acompanhados
 * (qualquer coisa que o SAP mudar aparece em "O que mudou"); aqui só se ajusta o rótulo.
 */
const CAMPOS_HISTORICO: Partial<Record<BaseId, Record<string, string>>> = {
  ordens: {
    status_item: 'Status do item',
    norma_apropriacao: 'Coletor de custo',
    qtd: 'Qtd. necessária',
    data_necessidade: 'Data da necessidade',
    status_aprovacao: 'Status aprovação',
    status_usuario: 'Status usuário',
    status_sistema: 'Status sistema',
    qtd_retirada: 'Qtd. retirada',
  },
  fup: { status_sap: 'Status SAP', data_remessa_corrigida: 'Remessa corrigida' },
  ativacao: { status_po: 'Status do PO', data_remessa: 'Data remessa', faixa_atraso: 'Faixa de atraso' },
  reservas: { status_reserva: 'Status da reserva', registro_final: 'Registro final' },
  grupos: {
    gerencia: 'Gerência',
    equipamento: 'Equipamento',
    supervisor: 'Supervisor',
    inspetor: 'Inspetor',
    abastecimento: 'Abastecimento',
  },
  iw38: {
    tipo: 'Tipo da ordem',
    prioridade: 'Prioridade',
    centro_trabalho: 'Centro de trabalho',
    status_aprovacao: 'Status aprovação',
    status_usuario: 'Status usuário',
    status_sistema: 'Status sistema',
    inicio_base: 'Início base',
    fim_base: 'Fim base',
    data_liberacao: 'Data de liberação',
    custo_planejado: 'Custo total planejado',
    texto: 'Texto da ordem',
    modificado_por: 'Modificado por',
    data_modificacao: 'Data de modificação',
  },
}

const ENTIDADE_EVENTO: Record<BaseId, (r: Record<string, unknown>) => { entidade: string; chave: string }> = {
  ordens: (r) => ({ entidade: 'ordem', chave: String(r.ordem) }),
  fup: (r) => ({ entidade: 'fup', chave: String(r.po_item) }),
  ativacao: (r) => ({ entidade: 'ativacao', chave: String(r.chave) }),
  reservas: (r) => ({ entidade: 'reserva', chave: `${r.reserva}-${r.item}` }),
  // Mesmo histórico da tela da OM.
  iw38: (r) => ({ entidade: 'ordem', chave: String(r.ordem) }),
  grupos: (r) => ({ entidade: 'grupo', chave: String(r.gpm) }),
}

/** Tabelas criadas pelo próprio app na primeira importação (sem precisar rodar a migração à mão). Mesmo DDL de db/schema.sql. */
const TABELAS_AUTOMATICAS: Partial<Record<BaseId, string>> = {
  grupos: `create table if not exists grupos_planejamento (
  gpm text primary key,
  gerencia text,
  equipamento text,
  matricula_supervisor text,
  supervisor text,
  matricula_inspetor text,
  inspetor text,
  matricula_abastecimento text,
  abastecimento text,
  hash text not null,
  primeira_vez_em timestamptz not null default now(),
  ultima_mudanca_em timestamptz not null default now(),
  ultima_importacao_id int,
  removido_em timestamptz
)`,
  iw38: `create table if not exists ordens_sap (
  ordem text primary key,
  tipo text,
  prioridade text,
  grp_planejamento text,
  centro_trabalho text,
  tam text,
  plano_manutencao text,
  revisao text,
  status_aprovacao text,
  local_instalacao text,
  denominacao_local text,
  texto text,
  status_usuario text,
  status_sistema text,
  modificado_por text,
  criado_por text,
  sistema_funcional text,
  unidade_operacional text,
  unidade_funcional text,
  indicador text,
  centro_custo text,
  centro_custo_resp text,
  nota text,
  inicio_base date,
  fim_base date,
  data_modificacao date,
  data_liberacao date,
  data_entrada date,
  custo_planejado numeric,
  hash text not null,
  primeira_vez_em timestamptz not null default now(),
  ultima_mudanca_em timestamptz not null default now(),
  ultima_importacao_id int,
  removido_em timestamptz
)`,
}

const tabelasGarantidas = new Map<BaseId, Promise<unknown>>()
function garantirTabela(base: Base) {
  const ddl = TABELAS_AUTOMATICAS[base.id]
  if (!ddl) return Promise.resolve()
  let p = tabelasGarantidas.get(base.id)
  if (!p) {
    p = queryOne('select to_regclass($1) as existe', [base.tabela])
      .then((r) => (r?.existe ? null : query(ddl)))
      .catch((erro) => {
        tabelasGarantidas.delete(base.id)
        throw erro
      })
    tabelasGarantidas.set(base.id, p)
  }
  return p
}

let colunaGarantida: Promise<unknown> | null = null
/** Garante a coluna que liga o evento à importação (idempotente; evita quebrar se o banco ainda não foi migrado). */
export function garantirEsquemaEventos() {
  // Consulta antes de alterar: "alter table" trava a tabela mesmo quando a coluna já existe.
  colunaGarantida ??= queryOne(
    "select 1 from information_schema.columns where table_schema = current_schema() and table_name = 'eventos' and column_name = 'importacao_id'",
  )
    .then((existe) =>
      existe ? null : query('alter table eventos add column if not exists importacao_id int references importacoes(id) on delete set null'),
    )
    .catch((erro) => {
      colunaGarantida = null
      throw erro
    })
  return colunaGarantida
}

const camposTabela = (base: Base) => base.campos.filter((c) => !c.app)

function hashRegistro(base: Base, registro: Record<string, unknown>) {
  const valores = camposTabela(base).filter((c) => !c.tratativa).map((c) => registro[c.campo] ?? '')
  return createHash('sha1').update(JSON.stringify(valores)).digest('hex')
}

/** Campos acompanhados de uma base: todos os da planilha (menos chave e colunas do app), com rótulo amigável. */
function camposAcompanhados(base: Base) {
  const rotulos = CAMPOS_HISTORICO[base.id] ?? {}
  return Object.fromEntries(
    camposTabela(base)
      .filter((c) => !base.chave.includes(c.campo) && !c.tratativa)
      .map((c) => [c.campo, rotulos[c.campo] ?? c.cabecalhos[0] ?? c.campo]),
  )
}

function textoValor(v: unknown) {
  if (v == null || v === '') return '—'
  // Numérico do banco vem como texto ("20.50"); normaliza para comparar com o da planilha (20.5).
  if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v)) return String(Number(v))
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não'
  return String(v)
}

export async function iniciarImportacao(baseId: BaseId, arquivo: string, usuarioId: number | null) {
  await garantirTabela(BASES[baseId])
  const row = await queryOne<{ id: number }>(
    'insert into importacoes (base, arquivo, usuario_id) values ($1, $2, $3) returning id',
    [baseId, arquivo.slice(0, 200), usuarioId],
  )
  return row!.id
}

export async function importarLote(importacaoId: number, linhas: Record<string, unknown>[]) {
  const imp = await queryOne<{ base: BaseId; status: string }>('select base, status from importacoes where id = $1', [importacaoId])
  if (!imp || imp.status !== 'em_andamento') throw new Error('Importação não encontrada ou já concluída.')
  const base = BASES[imp.base]
  await garantirEsquemaEventos()

  // Revalida tipos no servidor e remove duplicadas da mesma chave (vale a última).
  const porChave = new Map<string, Record<string, unknown>>()
  for (const bruta of linhas) {
    const registro: Record<string, unknown> = {}
    for (const campo of base.campos) registro[campo.campo] = converterValor(campo.tipo, bruta[campo.campo])
    if (base.derivarChave) Object.assign(registro, base.derivarChave(registro))
    if (!base.chave.every((k) => registro[k] != null && registro[k] !== '')) continue
    registro.hash = hashRegistro(base, registro)
    porChave.set(base.chave.map((k) => registro[k]).join('|'), registro)
  }
  const registros = [...porChave.values()]
  if (!registros.length) return { novas: 0, alteradas: 0 }

  const client = await pool().connect()
  try {
    await client.query('begin')
    const chaveSql = base.chave.map((k) => `t.${k}`).join(', ')
    const chaveTipos = base.chave.map((k) => `${k} text`).join(', ')
    const monitorados = camposAcompanhados(base)
    const colunasAntigas = ['hash', 'removido_em', ...Object.keys(monitorados)]
    const antigos = await client.query(
      `select ${base.chave.map((k) => `t.${k}`).join(', ')}, ${colunasAntigas.map((c) => `t.${c}`).join(', ')}
         from ${base.tabela} t
         join jsonb_to_recordset($1::jsonb) as x(${chaveTipos}) on (${chaveSql}) = (${base.chave.map((k) => `x.${k}`).join(', ')})`,
      [JSON.stringify(registros.map((r) => Object.fromEntries(base.chave.map((k) => [k, r[k]]))))],
    )
    const mapaAntigo = new Map(antigos.rows.map((r) => [base.chave.map((k) => r[k]).join('|'), r]))
    // Na primeira carga da base não gera eventos de "novo" (seriam milhares sem utilidade).
    const primeiraCarga =
      (await client.query(`select 1 from importacoes where base = $1 and status = 'concluida' limit 1`, [base.id])).rowCount === 0

    let novas = 0
    let alteradas = 0
    const eventos: Array<{ entidade: string; chave: string; tipo: string; descricao: string }> = []
    for (const r of registros) {
      const antigo = mapaAntigo.get(base.chave.map((k) => r[k]).join('|'))
      const alvo = ENTIDADE_EVENTO[base.id](r)
      if (!antigo) {
        novas++
        if (!primeiraCarga) eventos.push({ ...alvo, tipo: 'novo', descricao: descreverNovo(base.id, r) })
        continue
      }
      if (antigo.hash === r.hash && !antigo.removido_em) continue
      alteradas++
      const mudancas = Object.entries(monitorados)
        .filter(([campo]) => textoValor(antigo[campo]) !== textoValor(r[campo]))
        .map(([campo, rotulo]) => `${rotulo}: ${textoValor(antigo[campo])} → ${textoValor(r[campo])}`)
      if (antigo.removido_em) mudancas.unshift('Voltou a aparecer no relatório')
      if (mudancas.length) eventos.push({ ...alvo, tipo: 'mudanca', descricao: prefixo(base.id, r) + mudancas.join('; ') })
    }

    // Chaves derivadas (ex.: ativação) não são colunas da planilha, mas precisam ser gravadas.
    const chavesDerivadas = base.chave.filter((k) => !camposTabela(base).some((c) => c.campo === k))
    const colunas = [...chavesDerivadas, ...camposTabela(base).map((c) => c.campo), 'hash']
    const definicao = [...chavesDerivadas.map((k) => `${k} text`), ...camposTabela(base).map((c) => `${c.campo} ${TIPO_SQL[c.tipo]}`), 'hash text'].join(', ')
    const atualizacoes = camposTabela(base)
      .filter((c) => !base.chave.includes(c.campo))
      .map((c) =>
        c.tratativa
          ? // Planilha preenchida prevalece; vazia mantém o que foi feito no app.
            `${c.campo} = coalesce(excluded.${c.campo}, t.${c.campo})`
          : `${c.campo} = excluded.${c.campo}`,
      )
    const colunasInsert = colunas.map((c) =>
      base.campos.find((f) => f.campo === c)?.tipo === 'flag' ? `coalesce(x.${c}, false)` : `x.${c}`,
    )
    await client.query(
      `insert into ${base.tabela} as t (${colunas.join(', ')}, ultima_importacao_id)
       select ${colunasInsert.join(', ')}, $2 from jsonb_to_recordset($1::jsonb) as x(${definicao})
       on conflict (${base.chave.join(', ')}) do update set
         ${atualizacoes.join(',\n         ')},
         ultima_mudanca_em = case when t.hash <> excluded.hash or t.removido_em is not null then now() else t.ultima_mudanca_em end,
         hash = excluded.hash,
         removido_em = null,
         ultima_importacao_id = excluded.ultima_importacao_id`,
      [JSON.stringify(registros), importacaoId],
    )
    if (eventos.length) {
      await client.query(
        `insert into eventos (entidade, chave, tipo, descricao, importacao_id)
         select entidade, chave, tipo, descricao, $2 from jsonb_to_recordset($1::jsonb) as x(entidade text, chave text, tipo text, descricao text)`,
        [JSON.stringify(eventos), importacaoId],
      )
    }
    if (base.id === 'ordens') await aplicarAcompanhamentoDaPlanilha(client, registros)
    await client.query(
      'update importacoes set linhas = linhas + $2, novas = novas + $3, alteradas = alteradas + $4 where id = $1',
      [importacaoId, registros.length, novas, alteradas],
    )
    await client.query('commit')
    return { novas, alteradas }
  } catch (erro) {
    await client.query('rollback')
    throw erro
  } finally {
    client.release()
  }
}

const SITUACAO_POR_TEXTO: Record<string, string> = {
  sem_acao: 'sem_acao', 'sem acao': 'sem_acao', cobrado: 'cobrado',
  aguardando: 'aguardando', 'aguardando retorno': 'aguardando', resolvido: 'resolvido',
}

/** Colunas "APP ..." de uma planilha exportada pelo app voltam para o acompanhamento (mão dupla). */
async function aplicarAcompanhamentoDaPlanilha(client: PoolClient, registros: Record<string, unknown>[]) {
  const porOrdem = new Map<string, { situacao: string | null; setor: string | null; observacao: string | null }>()
  for (const r of registros) {
    const bruta = typeof r.app_situacao === 'string' ? normalizarCabecalho(r.app_situacao).replace(/_/g, ' ') : ''
    const situacao = SITUACAO_POR_TEXTO[bruta] ?? SITUACAO_POR_TEXTO[bruta.replace(/ /g, '_')] ?? null
    const setor = (r.app_setor as string | null) ?? null
    const observacao = (r.app_observacao as string | null) ?? null
    if (situacao || setor || observacao) porOrdem.set(String(r.ordem), { situacao, setor, observacao })
  }
  if (!porOrdem.size) return
  await client.query(
    `insert into ordem_acompanhamento (ordem, situacao, setor_responsavel, observacao)
     select ordem, coalesce(situacao, 'sem_acao'), setor, observacao
       from jsonb_to_recordset($1::jsonb) as x(ordem text, situacao text, setor text, observacao text)
     on conflict (ordem) do update set
       situacao = coalesce(excluded.situacao, ordem_acompanhamento.situacao),
       setor_responsavel = coalesce(excluded.setor_responsavel, ordem_acompanhamento.setor_responsavel),
       observacao = coalesce(excluded.observacao, ordem_acompanhamento.observacao),
       atualizado_em = now()
     where (ordem_acompanhamento.situacao, ordem_acompanhamento.setor_responsavel, ordem_acompanhamento.observacao)
       is distinct from (coalesce(excluded.situacao, ordem_acompanhamento.situacao),
                         coalesce(excluded.setor_responsavel, ordem_acompanhamento.setor_responsavel),
                         coalesce(excluded.observacao, ordem_acompanhamento.observacao))`,
    [JSON.stringify([...porOrdem].map(([ordem, v]) => ({ ordem, ...v })))],
  )
}

function prefixo(base: BaseId, r: Record<string, unknown>) {
  if (base === 'ordens') return `Item ${r.reserva}/${r.item} (${r.descricao ?? r.material}): `
  if (base === 'fup') return `PO ${r.po}/${r.item_po}: `
  if (base === 'ativacao') return `PO ${r.po}/${r.item_po}: `
  if (base === 'iw38') return 'Dados da ordem (IW38): '
  if (base === 'grupos') return 'Responsáveis do grupo: '
  return ''
}

function descreverNovo(base: BaseId, r: Record<string, unknown>) {
  if (base === 'ordens') return `Novo item ${r.reserva}/${r.item}: ${r.descricao ?? r.material ?? ''} (${r.qtd ?? ''} ${r.unidade ?? ''})`
  if (base === 'fup') return `PO ${r.po}/${r.item_po} entrou no follow-up`
  if (base === 'ativacao') return `PO ${r.po}/${r.item_po} entrou na ativação`
  if (base === 'iw38') return `OM ${r.ordem} entrou na IW38${r.tipo ? ` (${r.tipo})` : ''}: ${r.texto ?? ''}`
  if (base === 'grupos') return `Grupo ${r.gpm} entrou na lista de responsáveis`
  return 'Novo registro'
}

/** Finaliza: registros que não vieram no arquivo são marcados como fora do relatório. */
export async function concluirImportacao(importacaoId: number, carteiraCompleta: boolean) {
  const imp = await queryOne<{ base: BaseId; status: string }>('select base, status from importacoes where id = $1', [importacaoId])
  if (!imp || imp.status !== 'em_andamento') throw new Error('Importação não encontrada ou já concluída.')
  const base = BASES[imp.base]
  await garantirEsquemaEventos()
  let removidas = 0
  if (carteiraCompleta) {
    const rows = await query(
      `update ${base.tabela} set removido_em = now(), ultima_mudanca_em = now()
        where removido_em is null and ultima_importacao_id is distinct from $1
        returning ${base.chave.join(', ')}`,
      [importacaoId],
    )
    removidas = rows.length
    if (rows.length) {
      const saidas = rows.map((r) => ({
        ...ENTIDADE_EVENTO[base.id](r),
        tipo: 'removido',
        descricao:
          base.id === 'ordens' ? `Item ${r.reserva}/${r.item} saiu do relatório do SAP` : base.id === 'iw38' ? 'OM saiu da IW38' : base.id === 'grupos' ? 'Grupo saiu da lista de responsáveis' : 'Saiu do relatório do SAP',
      }))
      await query(
        `insert into eventos (entidade, chave, tipo, descricao, importacao_id)
         select entidade, chave, tipo, descricao, $2 from jsonb_to_recordset($1::jsonb) as x(entidade text, chave text, tipo text, descricao text)`,
        [JSON.stringify(saidas), importacaoId],
      )
    }
  }
  if (base.id === 'ordens') {
    await query('refresh materialized view concurrently ordens_resumo')
  }
  return queryOne(
    `update importacoes set status = 'concluida', concluido_em = now(), removidas = $2 where id = $1
     returning id, base, linhas, novas, alteradas, removidas`,
    [importacaoId, removidas],
  )
}

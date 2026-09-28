import 'server-only'
import { createHash } from 'node:crypto'
import type { PoolClient } from 'pg'
import { BASES, converterValor, normalizarCabecalho, type Base, type BaseId } from './bases'
import { pool, query, queryOne } from './db'

const TIPO_SQL = { texto: 'text', numero: 'numeric', inteiro: 'int', data: 'date', flag: 'boolean', simnao: 'boolean' } as const

/** Campos acompanhados no histórico quando mudam de uma importação para outra. */
const CAMPOS_HISTORICO: Partial<Record<BaseId, Record<string, string>>> = {
  ordens: {
    status_item: 'Status do item',
    status_aprovacao: 'Status aprovação',
    status_usuario: 'Status usuário',
    status_sistema: 'Status sistema',
    qtd_retirada: 'Qtd. retirada',
  },
  fup: { status_sap: 'Status SAP', data_remessa_corrigida: 'Remessa corrigida' },
  ativacao: { status_po: 'Status do PO', data_remessa: 'Data remessa', faixa_atraso: 'Faixa de atraso' },
  reservas: { status_reserva: 'Status da reserva', registro_final: 'Registro final' },
}

const ENTIDADE_EVENTO: Record<BaseId, (r: Record<string, unknown>) => { entidade: string; chave: string }> = {
  ordens: (r) => ({ entidade: 'ordem', chave: String(r.ordem) }),
  fup: (r) => ({ entidade: 'fup', chave: String(r.po_item) }),
  ativacao: (r) => ({ entidade: 'ativacao', chave: String(r.chave) }),
  reservas: (r) => ({ entidade: 'reserva', chave: `${r.reserva}-${r.item}` }),
}

const camposTabela = (base: Base) => base.campos.filter((c) => !c.app)

function hashRegistro(base: Base, registro: Record<string, unknown>) {
  const valores = camposTabela(base).filter((c) => !c.tratativa).map((c) => registro[c.campo] ?? '')
  return createHash('sha1').update(JSON.stringify(valores)).digest('hex')
}

function textoValor(v: unknown) {
  if (v == null || v === '') return '—'
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não'
  return String(v)
}

export async function iniciarImportacao(baseId: BaseId, arquivo: string, usuarioId: number) {
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
    const monitorados = CAMPOS_HISTORICO[base.id] ?? {}
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
        `insert into eventos (entidade, chave, tipo, descricao)
         select entidade, chave, tipo, descricao from jsonb_to_recordset($1::jsonb) as x(entidade text, chave text, tipo text, descricao text)`,
        [JSON.stringify(eventos)],
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
  return ''
}

function descreverNovo(base: BaseId, r: Record<string, unknown>) {
  if (base === 'ordens') return `Novo item ${r.reserva}/${r.item}: ${r.descricao ?? r.material ?? ''} (${r.qtd ?? ''} ${r.unidade ?? ''})`
  if (base === 'fup') return `PO ${r.po}/${r.item_po} entrou no follow-up`
  if (base === 'ativacao') return `PO ${r.po}/${r.item_po} entrou na ativação`
  return 'Novo registro'
}

/** Finaliza: registros que não vieram no arquivo são marcados como fora do relatório. */
export async function concluirImportacao(importacaoId: number, carteiraCompleta: boolean) {
  const imp = await queryOne<{ base: BaseId; status: string }>('select base, status from importacoes where id = $1', [importacaoId])
  if (!imp || imp.status !== 'em_andamento') throw new Error('Importação não encontrada ou já concluída.')
  const base = BASES[imp.base]
  let removidas = 0
  if (carteiraCompleta) {
    const rows = await query(
      `update ${base.tabela} set removido_em = now(), ultima_mudanca_em = now()
        where removido_em is null and ultima_importacao_id is distinct from $1
        returning ${base.chave.join(', ')}`,
      [importacaoId],
    )
    removidas = rows.length
    if (base.id === 'ordens' && rows.length) {
      await query(
        `insert into eventos (entidade, chave, tipo, descricao)
         select 'ordem', ordem, 'removido', 'Item ' || reserva || '/' || item || ' saiu do relatório do SAP'
           from jsonb_to_recordset($1::jsonb) as x(ordem text, reserva text, item text)`,
        [JSON.stringify(rows)],
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

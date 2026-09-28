import 'server-only'
import { query, queryOne } from './db'
import { alertas, configuracoes, detalheOrdem, FUP_PRAZO_SQL, listarOrdens, painel } from './consultas'
import { data, dias, moeda, moedaCurta, numero } from './formato'

const NOME_SITUACAO: Record<string, string> = { sem_acao: 'Sem ação', cobrado: 'Cobrado', aguardando: 'Aguardando retorno', resolvido: 'Resolvido' }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Qualquer = Record<string, any>

export type Mensagem = { role: 'user' | 'assistant'; content: string }

const SISTEMA = `Você é o assistente da Central de Abastecimento de Manutenção da CSN.
Responde dúvidas sobre ordens de manutenção (OM), itens de reserva, pedidos de compra (PO), follow-up (FUP) com fornecedores, ativação e ANTECs.

Regras:
- SEMPRE use as ferramentas para buscar dados. Nunca invente números de ordem, PO, datas, status ou valores.
- Se a ferramenta não encontrar, diga claramente que não encontrou e sugira conferir o número no SAP.
- Responda em português, direto e curto. Use **negrito** para OM, PO e status. Use listas com "-" quando houver vários itens.
- Ao falar de uma ordem, informe: situação dos itens (abertos/retirados/eliminados), status no SAP, há quantos dias não muda, data de necessidade e o acompanhamento da Central (cobranças, setor).
- Os dados vêm de exportações do SAP importadas no app; mencione a data da última mudança quando relevante. O SAP é a fonte oficial.
- Processo: demandas de sobressalentes exigem OM; a Central confere a OM, planeja (PLAN) e acompanha aprovações (GDOP, G, GG, D). ANTEC: Central tem 1 dia útil para encaminhar e a área 4 dias úteis para retornar. FUP: pedidos com 3 cobranças sem resposta, rejeitados ou não recebidos pelo fornecedor podem ser cancelados/prorrogados pela Central (acima de R$ 500 mil só com de acordo do fornecedor).
Hoje é ${'{HOJE}'}.`

// ---------- Ferramentas (consultas ao banco) ----------

async function ferramentaOrdem(ordem: string) {
  const d = await detalheOrdem(ordem.replace(/\D/g, ''))
  if (!d.resumo) return { encontrado: false, ordem }
  const itens = d.itens as Array<Record<string, unknown>>
  return {
    encontrado: true,
    ordem: d.resumo.ordem,
    descricao: d.resumo.texto_ordem,
    local_instalacao: d.resumo.local_instalacao,
    status_usuario_sap: d.resumo.status_usuario,
    status_sistema_sap: d.resumo.status_sistema,
    itens_total: d.resumo.itens,
    itens_abertos: d.resumo.itens_abertos,
    itens_retirados: d.resumo.itens_retirados,
    itens_eliminados: d.resumo.itens_eliminados,
    valor_estimado: moeda(d.resumo.valor),
    necessidade_mais_antiga_aberta: data(d.resumo.necessidade_mais_antiga),
    ultima_mudanca_no_sap: data(d.resumo.ultima_mudanca_em),
    dias_sem_mudanca: d.resumo.dias_parada,
    acompanhamento_central: {
      situacao: d.resumo.situacao ?? 'sem_acao',
      setor_responsavel: d.resumo.setor_responsavel,
      cobrancas: d.resumo.cobrancas ?? 0,
      ultima_cobranca: d.resumo.ultima_cobranca_em ? data(d.resumo.ultima_cobranca_em) : null,
      observacao: d.resumo.observacao,
    },
    itens: itens.slice(0, 25).map((i) => ({
      reserva: `${i.reserva}/${i.item}`,
      material: i.material,
      descricao: i.descricao,
      qtd: `${numero(i.qtd)} ${i.unidade ?? ''}`,
      retirado: numero(i.qtd_retirada),
      status: i.eliminado ? 'ELIMINADO' : (i.status_item ?? 'EM ABERTO'),
      aprovacao: i.status_aprovacao,
      necessidade: data(i.data_necessidade),
    })),
    pedidos_compra: d.pedidos.slice(0, 10).map((p) => ({ po: `${p.po}/${p.item_po}`, fornecedor: p.fornecedor, remessa: data(p.data_remessa), status: p.status_po })),
    antecs: d.antecs,
    historico_recente: d.eventos.slice(0, 8).map((e) => `${data(e.criado_em)}: ${e.descricao}`),
  }
}

async function ferramentaBuscarOrdens(texto: string, filtro?: string) {
  const r = await listarOrdens({ busca: texto, filtro: filtro || 'todas' })
  return {
    total: r.total,
    ordens: r.linhas.slice(0, 15).map((o) => ({
      ordem: o.ordem,
      descricao: o.texto_ordem,
      itens_abertos: `${o.itens_abertos}/${o.itens}`,
      dias_sem_mudanca: o.dias_parada,
      acompanhamento: o.situacao ?? 'sem_acao',
    })),
  }
}

async function ferramentaPedido(numeroPedido: string) {
  const n = numeroPedido.replace(/\D/g, '')
  const [fup, ativacao] = await Promise.all([
    query(
      `select po, item_po, descricao, fornecedor, valor, data_remessa_corrigida, nova_data, status_sap, motivo, motivo_dinamica,
              responsavel, retorno, obs_fornecedor, cobrancas, gg, diretoria, evento, descricao_evento, ${FUP_PRAZO_SQL} as prazo
         from fup f where removido_em is null and (po = $1 or po_item = $1 or rm_item like $1 || '%') limit 20`,
      [n],
    ),
    query(
      `select po, item_po, rm, item_rm, ordem, descricao, fornecedor, email, data_remessa, status_po, faixa_atraso, valor, qtd
         from ativacao where removido_em is null and (po = $1 or rm = $1) limit 20`,
      [n],
    ),
  ])
  return {
    encontrado: fup.length + ativacao.length > 0,
    follow_up: fup.map((f): Qualquer => ({ ...f, valor: moeda(f.valor), data_remessa_corrigida: data(f.data_remessa_corrigida), nova_data: data(f.nova_data) })),
    ativacao: ativacao.map((a): Qualquer => ({ ...a, data_remessa: data(a.data_remessa) })),
  }
}

async function ferramentaFornecedor(nome: string): Promise<Qualquer> {
  const r = await queryOne(
    `select count(*)::int as itens, coalesce(sum(valor), 0) as valor,
            count(*) filter (where ${FUP_PRAZO_SQL} = 'atraso')::int as em_atraso,
            count(*) filter (where retorno)::int as com_retorno,
            string_agg(distinct fornecedor, ', ') as fornecedores
       from fup f where removido_em is null and fornecedor ilike $1`,
    [`%${nome}%`],
  )
  const itens = await query(
    `select po, item_po, descricao, valor, coalesce(nova_data, data_remessa_corrigida) as remessa, ${FUP_PRAZO_SQL} as prazo, motivo, retorno
       from fup f where removido_em is null and fornecedor ilike $1 order by (${FUP_PRAZO_SQL} = 'atraso') desc, valor desc nulls last limit 10`,
    [`%${nome}%`],
  )
  const resumo: Qualquer = { ...r, valor: moeda(r?.valor) }
  return { ...resumo, principais: itens.map((i): Qualquer => ({ ...i, valor: moeda(i.valor), remessa: data(i.remessa) })) }
}

async function ferramentaMaterial(texto: string) {
  const itens = await query(
    `select ordem, reserva, item, material, descricao, qtd, unidade, status_item, eliminado, data_necessidade
       from ordem_itens where removido_em is null and (material = $1 or descricao ilike $2)
      order by eliminado, data_necessidade desc nulls last limit 20`,
    [texto.trim(), `%${texto.trim()}%`],
  )
  return { total: itens.length, itens: itens.map((i): Qualquer => ({ ...i, data_necessidade: data(i.data_necessidade), status: i.eliminado ? 'ELIMINADO' : (i.status_item ?? 'EM ABERTO') })) }
}

async function ferramentaResumo() {
  const p = await painel()
  return {
    ordens_em_aberto: p.resumo.abertas,
    ordens_total: p.resumo.total,
    itens_pendentes: p.resumo.itens_abertos,
    valor_itens_pendentes: moeda(p.resumo.valor_aberto),
    ordens_paradas_para_cobrar: p.resumo.paradas,
    ordens_com_necessidade_vencida: p.resumo.vencidas,
    ordens_abertas_por_fase_sap: p.fases.map((f) => `${f.fase_sistema ?? '—'}/${f.fase_usuario ?? '—'}: ${f.ordens} ordens, ${moeda(f.valor_aberto)}`),
    dias_para_alerta: p.cfg.diasSemMovimentacao,
    fup_carteira_total: moeda(p.fupResumo?.total),
    fup_com_retorno: moeda(p.fupResumo?.com_retorno),
    fup_itens_em_atraso: p.fupResumo?.atraso,
    fup_elegiveis_cancelamento: p.fupResumo?.eleg_cancelamento,
    fup_por_responsavel: p.fupResponsavel.map((r) => `${r.responsavel}: ${moeda(r.valor)} (${r.itens} itens)`),
    antecs_abertas: p.antecs.abertas,
    antecs_fora_do_prazo: p.antecs.atrasadas,
  }
}

async function ferramentaAlertas() {
  const a = await alertas()
  return {
    regra: `Ordens sem mudança há ${a.cfg.diasSemMovimentacao}+ dias`,
    ordens_para_cobrar: a.paradas.slice(0, 20).map((o) => ({ ordem: o.ordem, descricao: o.texto_ordem, dias_sem_mudanca: o.dias_parada, cobrancas: o.cobrancas ?? 0 })),
    total_para_cobrar: a.paradas.length,
    cobradas_sem_resposta: a.recobrar.slice(0, 10).map((o) => ({ ordem: o.ordem, setor: o.setor_responsavel })),
    antecs_atrasadas: a.antecsAtrasadas.map((x) => ({ numero: x.numero, ordem: x.ordem, status: x.status })),
  }
}

const FERRAMENTAS = [
  {
    nome: 'consultar_ordem',
    descricao: 'Detalhes completos de uma ordem de manutenção (OM) pelo número: itens, status SAP, dias parada, pedidos, acompanhamento e histórico.',
    parametros: { ordem: { type: 'string', description: 'Número da OM, ex.: 80008117069' } },
    obrigatorios: ['ordem'],
    executar: (a: Record<string, string>) => ferramentaOrdem(a.ordem),
  },
  {
    nome: 'buscar_ordens',
    descricao: 'Busca ordens por texto (descrição, local de instalação, material, reserva). Filtro opcional: abertas, paradas, vencidas, cobradas, encerradas, todas.',
    parametros: { texto: { type: 'string' }, filtro: { type: 'string', enum: ['abertas', 'paradas', 'vencidas', 'cobradas', 'encerradas', 'todas'] } },
    obrigatorios: ['texto'],
    executar: (a: Record<string, string>) => ferramentaBuscarOrdens(a.texto, a.filtro),
  },
  {
    nome: 'consultar_pedido',
    descricao: 'Situação de um pedido de compra (PO) ou RM no follow-up e na ativação: fornecedor, remessa, atraso, retorno.',
    parametros: { numero: { type: 'string', description: 'Número do PO (45...) ou da RM' } },
    obrigatorios: ['numero'],
    executar: (a: Record<string, string>) => ferramentaPedido(a.numero),
  },
  {
    nome: 'consultar_fornecedor',
    descricao: 'Resumo do follow-up de um fornecedor pelo nome (parcial): valor em carteira, atrasos, retorno e principais pedidos.',
    parametros: { nome: { type: 'string' } },
    obrigatorios: ['nome'],
    executar: (a: Record<string, string>) => ferramentaFornecedor(a.nome),
  },
  {
    nome: 'buscar_material',
    descricao: 'Encontra em quais ordens/reservas um material aparece, pelo código ou parte da descrição.',
    parametros: { texto: { type: 'string' } },
    obrigatorios: ['texto'],
    executar: (a: Record<string, string>) => ferramentaMaterial(a.texto),
  },
  {
    nome: 'resumo_carteira',
    descricao: 'Números gerais: ordens abertas, paradas, necessidade vencida, carteira do FUP, ANTECs.',
    parametros: {},
    obrigatorios: [],
    executar: () => ferramentaResumo(),
  },
  {
    nome: 'listar_alertas',
    descricao: 'Lista o que precisa ser cobrado: ordens paradas, cobradas sem resposta, ANTECs atrasadas.',
    parametros: {},
    obrigatorios: [],
    executar: () => ferramentaAlertas(),
  },
]

// ---------- Provedor (compatível com OpenAI Chat Completions) ----------

function provedor(oidc?: string | null) {
  if (process.env.AI_BASE_URL && process.env.AI_API_KEY) {
    return { url: process.env.AI_BASE_URL.replace(/\/$/, ''), chave: process.env.AI_API_KEY, modelo: process.env.AI_MODEL ?? 'gemini-2.5-flash' }
  }
  const chave = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || oidc
  if (chave) return { url: 'https://ai-gateway.vercel.sh/v1', chave, modelo: process.env.AI_MODEL ?? 'openai/gpt-4o-mini' }
  return null
}

type MsgApi = { role: string; content: string | null; tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>; tool_call_id?: string }

export async function responder(mensagens: Mensagem[], oidc?: string | null): Promise<{ texto: string; modo: 'ia' | 'direto' }> {
  const cfg = provedor(oidc)
  if (!cfg) return { texto: await modoDireto(mensagens.at(-1)?.content ?? ''), modo: 'direto' }

  const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const historico: MsgApi[] = [
    { role: 'system', content: SISTEMA.replace('{HOJE}', hoje) },
    ...mensagens.slice(-12).map((m) => ({ role: m.role, content: m.content.slice(0, 4000) })),
  ]
  const tools = FERRAMENTAS.map((f) => ({
    type: 'function' as const,
    function: { name: f.nome, description: f.descricao, parameters: { type: 'object', properties: f.parametros, required: f.obrigatorios } },
  }))

  try {
    for (let passo = 0; passo < 5; passo++) {
      const resposta = await fetch(`${cfg.url}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.chave}` },
        body: JSON.stringify({ model: cfg.modelo, messages: historico, tools, temperature: 0.1 }),
        signal: AbortSignal.timeout(25_000),
      })
      if (!resposta.ok) {
        console.error('ia', resposta.status, await resposta.text().catch(() => ''))
        break
      }
      const json = (await resposta.json()) as { choices?: Array<{ message?: MsgApi }> }
      const msg = json.choices?.[0]?.message
      if (!msg) break
      if (!msg.tool_calls?.length) {
        if (msg.content?.trim()) return { texto: msg.content.trim(), modo: 'ia' }
        break
      }
      historico.push({ role: 'assistant', content: msg.content ?? null, tool_calls: msg.tool_calls })
      for (const chamada of msg.tool_calls) {
        const ferramenta = FERRAMENTAS.find((f) => f.nome === chamada.function.name)
        let resultado: unknown
        try {
          const args = JSON.parse(chamada.function.arguments || '{}')
          resultado = ferramenta ? await ferramenta.executar(args) : { erro: 'Ferramenta desconhecida' }
        } catch (e) {
          resultado = { erro: e instanceof Error ? e.message : 'Falha' }
        }
        historico.push({ role: 'tool', tool_call_id: chamada.id, content: JSON.stringify(resultado).slice(0, 12_000) })
      }
    }
  } catch (e) {
    console.error('ia', e)
  }
  // Sem resposta do modelo: responde com a consulta direta ao banco.
  return { texto: await modoDireto(mensagens.at(-1)?.content ?? ''), modo: 'direto' }
}

// ---------- Modo direto (sem modelo de linguagem) ----------

/** Responde perguntas objetivas consultando o banco, sem IA. Garante resposta mesmo sem chave configurada. */
export async function modoDireto(pergunta: string): Promise<string> {
  const texto = pergunta.trim()
  const numeros = texto.match(/\d{7,12}/g) ?? []

  for (const n of numeros) {
    if (/^45\d{8}/.test(n) || /\b(po|pedido)\b/i.test(texto)) {
      const p = await ferramentaPedido(n)
      if (p.encontrado) {
        const linhas = [
          ...p.follow_up.map((f) => `- **PO ${f.po}/${f.item_po}** · ${f.descricao}\n  ${f.fornecedor} · remessa ${f.nova_data !== '—' ? f.nova_data : f.data_remessa_corrigida} · **${f.prazo === 'atraso' ? 'Em atraso' : f.prazo === 'no_prazo' ? 'No prazo' : f.status_sap}** · retorno: ${f.retorno ? 'sim' : 'não'}${f.motivo ? ` · ${f.motivo}` : ''}`),
          ...p.ativacao.map((a) => `- **PO ${a.po}/${a.item_po}** (RM ${a.rm}) · ${a.descricao}\n  ${a.fornecedor} · remessa ${a.data_remessa} · **${a.status_po ?? 'sem status'}**${a.ordem ? ` · OM ${a.ordem}` : ''}`),
        ]
        return `Encontrei o pedido **${n}**:\n\n${linhas.join('\n')}`
      }
    }
    const o = await ferramentaOrdem(n)
    if (o.encontrado) {
      const cfg = await configuracoes()
      const alerta = o.itens_abertos && (o.dias_sem_mudanca ?? 0) >= cfg.diasSemMovimentacao ? `\n\n⚠️ Sem mudança no SAP há **${dias(o.dias_sem_mudanca)}** — cobrar o setor responsável.` : ''
      const itensAbertos = (o.itens ?? []).filter((i) => i.status !== 'ELIMINADO' && i.status !== 'RETIRADO')
      return [
        `**OM ${o.ordem}** — ${o.descricao ?? ''}`,
        '',
        `- Itens: **${o.itens_abertos} em aberto**, ${o.itens_retirados} retirados, ${o.itens_eliminados} eliminados (de ${o.itens_total})`,
        `- Status SAP: ${o.status_usuario_sap ?? '—'} / ${o.status_sistema_sap ?? '—'}`,
        `- Necessidade mais antiga em aberto: ${o.necessidade_mais_antiga_aberta}`,
        `- Última mudança no SAP: ${o.ultima_mudanca_no_sap} (${dias(o.dias_sem_mudanca)})`,
        `- Acompanhamento da Central: **${NOME_SITUACAO[o.acompanhamento_central?.situacao ?? 'sem_acao'] ?? 'Sem ação'}**${o.acompanhamento_central?.setor_responsavel ? ` · setor ${o.acompanhamento_central.setor_responsavel}` : ''}${o.acompanhamento_central?.cobrancas ? ` · ${o.acompanhamento_central.cobrancas} cobrança(s)` : ''}`,
        ...(itensAbertos.length ? ['', 'Itens em aberto:', ...itensAbertos.slice(0, 10).map((i) => `- ${i.descricao} · ${i.qtd} · nec. ${i.necessidade}`)] : []),
        ...(o.pedidos_compra?.length ? ['', 'Pedidos:', ...o.pedidos_compra.map((p) => `- PO ${p.po} · ${p.fornecedor} · ${p.status ?? 'sem status'}`)] : []),
      ].join('\n') + alerta
    }
  }
  if (numeros.length) return `Não encontrei a ordem ou pedido **${numeros[0]}** nos dados importados. Confira o número no SAP ou se a planilha mais recente já foi importada.`

  if (/alerta|cobrar|cobran|parad|atrasad/i.test(texto)) {
    const a = await ferramentaAlertas()
    if (!a.total_para_cobrar) return 'Nenhuma ordem parada precisando de cobrança no momento. 👍'
    return `${a.regra}: **${a.total_para_cobrar} ordens** para cobrar.\n\n${a.ordens_para_cobrar.slice(0, 10).map((o) => `- **OM ${o.ordem}** · ${o.descricao ?? ''} · ${dias(o.dias_sem_mudanca)}`).join('\n')}`
  }
  if (/resumo|painel|carteira|geral|quantas|quantos|total/i.test(texto)) {
    const r = await ferramentaResumo()
    return [
      '**Resumo da carteira**',
      `- Ordens em aberto: **${numero(r.ordens_em_aberto)}** de ${numero(r.ordens_total)} (${numero(r.itens_pendentes)} itens, ${r.valor_itens_pendentes})`,
      `- Paradas para cobrar: **${numero(r.ordens_paradas_para_cobrar)}**`,
      `- Necessidade vencida: ${numero(r.ordens_com_necessidade_vencida)}`,
      `- FUP: ${r.fup_carteira_total} em carteira, ${r.fup_com_retorno} com retorno · ${numero(r.fup_itens_em_atraso)} itens em atraso`,
      `- ANTECs: ${numero(r.antecs_abertas)} abertas, ${numero(r.antecs_fora_do_prazo)} fora do prazo`,
    ].join('\n')
  }
  const fornecedor = texto.match(/fornecedor\s+(.+)/i)?.[1]
  if (fornecedor) {
    const f = await ferramentaFornecedor(fornecedor)
    if (!f.itens) return `Não encontrei o fornecedor "${fornecedor}" no follow-up.`
    return `**${f.fornecedores}**\n- ${f.itens} itens · ${f.valor}\n- Em atraso: ${f.em_atraso} · com retorno: ${f.com_retorno}\n\n${f.principais.map((i: Qualquer) => `- PO ${i.po}/${i.item_po} · ${i.descricao} · ${moedaCurta(i.valor)} · ${i.prazo}`).join('\n')}`
  }
  if (texto.length >= 3) {
    const m = await ferramentaMaterial(texto.replace(/^(material|onde|qual|tem)\s+/i, ''))
    if (m.total) return `Encontrei **${m.total}** item(ns) com “${texto}”:\n\n${m.itens.slice(0, 10).map((i) => `- **OM ${i.ordem}** · ${i.descricao} · ${numero(i.qtd)} ${i.unidade ?? ''} · ${i.status}`).join('\n')}`
  }
  return 'Me diga o **número da OM** (ex.: 80008117069), o **PO** (ex.: 4504791859), um material, ou pergunte “o que preciso cobrar hoje?”.'
}

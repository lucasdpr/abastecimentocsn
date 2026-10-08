// Definição das planilhas exportadas do SAP que o app sabe importar/exportar.
// Usado no navegador (leitura do Excel) e no servidor (gravação no banco).

// codigo: texto, mas só dígitos perdem os zeros à esquerda (o SAP exporta 0031826684 ou 31826684
// conforme o layout; sem isso a mesma reserva viraria duas linhas).
export type TipoCampo = 'texto' | 'codigo' | 'numero' | 'inteiro' | 'data' | 'flag' | 'simnao'

export type Campo = {
  campo: string
  /** Cabeçalhos aceitos na planilha (comparados sem acento/maiúsculas). */
  cabecalhos: string[]
  tipo: TipoCampo
  /** Campo de tratativa: editável no app e também lido da planilha quando preenchido. */
  tratativa?: boolean
  /** Coluna gerada pelo app na exportação (acompanhamento); não é gravada na tabela da base. */
  app?: boolean
}

export type BaseId = 'ordens' | 'fup' | 'ativacao' | 'reservas' | 'iw38' | 'grupos' | 'materiais'

export type Base = {
  id: BaseId
  nome: string
  descricao: string
  tabela: string
  chave: string[]
  /** Cabeçalhos que precisam existir para reconhecer a planilha. */
  assinatura: string[]
  /** Outros layouts da mesma planilha (ex.: cabeçalhos abreviados do SAP). */
  outrasAssinaturas?: string[][]
  campos: Campo[]
  /** Monta a chave quando ela não vem pronta na planilha. */
  derivarChave?: (linha: Record<string, unknown>) => Record<string, unknown>
  /** Linhas que não são dados (ex.: cabeçalho repetido no meio da aba). */
  ignorar?: (linha: Record<string, unknown>) => boolean
}

const c = (campo: string, tipo: TipoCampo, ...cabecalhos: string[]): Campo => ({ campo, tipo, cabecalhos })
const a = (campo: string, ...cabecalhos: string[]): Campo => ({ campo, tipo: 'texto', cabecalhos, app: true })
const t = (campo: string, tipo: TipoCampo, ...cabecalhos: string[]): Campo => ({ campo, tipo, cabecalhos, tratativa: true })

export const BASES: Record<BaseId, Base> = {
  ordens: {
    id: 'ordens',
    nome: 'Ordens (itens de reserva)',
    descricao: 'Planilha ATUALIZAÇÃO ORDENS: itens de material de cada OM.',
    tabela: 'ordem_itens',
    chave: ['ordem', 'reserva', 'item'],
    assinatura: ['Status do item', 'Ordem', 'Nº reserva', 'Status do sistema'],
    // Exportação direta do SAP (ORDENS itens de reserva), com cabeçalhos abreviados.
    outrasAssinaturas: [['Stat Item', 'Ordem', 'Nºreser.', 'Status do sistema']],
    campos: [
      c('status_item', 'texto', 'Status do item', 'Stat Item'),
      c('norma_apropriacao', 'texto', 'Norma de apropriação', 'Norma apro', 'Coletor custo'),
      c('material', 'codigo', 'Material'),
      c('descricao', 'texto', 'Texto breve material'),
      c('qtd', 'numero', 'Qtd.necessária', 'Qtd.necess.'),
      c('unidade', 'texto', 'Unid.medida básica', 'UMB'),
      c('grp_planejamento', 'texto', 'Grp.plnj.PM', 'GPM'),
      c('ordem', 'codigo', 'Ordem'),
      c('reserva', 'codigo', 'Nº reserva', 'Nºreser.'),
      c('item', 'codigo', 'Nº item reserva transferência', 'Item'),
      c('data_necessidade', 'data', 'Data da necessidade', 'Data nec.'),
      c('status_aprovacao', 'texto', 'Status Aprovação'),
      c('status_usuario', 'texto', 'Status usuário'),
      c('status_sistema', 'texto', 'Status do sistema'),
      c('local_instalacao', 'texto', 'Local de instalação'),
      c('preco_medio', 'numero', 'Preço médio móvel', 'PMM'),
      c('qtd_retirada', 'numero', 'Qtd.retirada'),
      c('registro_final', 'flag', 'Com registro final', 'RgF'),
      c('eliminado', 'flag', 'Item foi eliminado', 'Eli'),
      c('permitido_movimento', 'flag', 'Permitido movimento', 'Mov.perm.'),
      c('texto_ordem', 'texto', 'Texto breve'),
      a('app_situacao', 'APP Situação'),
      a('app_setor', 'APP Setor responsável'),
      a('app_observacao', 'APP Observação'),
    ],
  },
  fup: {
    id: 'fup',
    nome: 'Follow-up (FUP)',
    descricao: 'Planilha Dashboard FUP, aba Base: pedidos ativados e tratativa com fornecedor.',
    tabela: 'fup',
    chave: ['po_item'],
    assinatura: ['PO', 'Item PO', 'Nome Fornecedor', 'Valor Corrigido'],
    campos: [
      c('material', 'texto', 'Material'),
      c('descricao', 'texto', 'Texto Breve'),
      c('po', 'texto', 'PO'),
      c('item_po', 'texto', 'Item PO'),
      c('data_remessa_corrigida', 'data', 'Data Remessa Corrigida'),
      c('fornecedor_codigo', 'texto', 'Fornecedor'),
      c('fornecedor', 'texto', 'Nome Fornecedor'),
      c('data_remessa_po', 'data', 'Data Remessa PO'),
      c('data_po', 'data', 'Data PO'),
      c('data_relatorio', 'data', 'Data Relatório'),
      c('centro', 'texto', 'Centro'),
      c('gg', 'texto', 'GG2', 'GG'),
      c('g', 'texto', 'G2', 'G'),
      c('diretoria', 'texto', 'Dir2', 'Diretoria'),
      c('rm_item', 'texto', 'RM-ITEM'),
      c('evento', 'texto', 'Evento'),
      c('descricao_evento', 'texto', 'Descrição do Evento'),
      c('data_ativacao', 'data', 'Data ativação'),
      c('semana_ativacao', 'texto', 'Sem ativação'),
      c('po_item', 'texto', 'PO item'),
      c('valor', 'numero', 'Valor Corrigido'),
      c('tipo_po', 'texto', 'Tipo de PO'),
      c('contrato', 'texto', 'CONTRATO/SPOT'),
      c('status_sap', 'texto', 'Status SAP'),
      t('motivo', 'texto', 'Motivo Consolidado'),
      t('nova_data', 'data', 'Nova data'),
      t('obs_fornecedor', 'texto', 'Obs do fornecedor'),
      t('motivo_dinamica', 'texto', 'Motivo Dinamica'),
      t('responsavel', 'texto', 'Responsável Dinamica', 'Responsável'),
      t('retorno', 'simnao', 'Retorno'),
    ],
    derivarChave: (l) => ({ po_item: l.po_item ?? (l.po && l.item_po ? `${l.po}${l.item_po}` : null) }),
  },
  ativacao: {
    id: 'ativacao',
    nome: 'Ativação',
    descricao: 'Planilha Ativação: RMs com PO e status de entrega por fornecedor.',
    tabela: 'ativacao',
    chave: ['chave'],
    assinatura: ['NUM_ACOMP', 'ITEM_ACOMP', 'FORNECEDOR', 'STATUS DO PO'],
    campos: [
      c('material', 'texto', 'MATERIAL'),
      c('descricao', 'texto', 'DESCRICAO'),
      c('mrp', 'texto', 'MRP'),
      c('valor', 'numero', 'VALOR'),
      c('qtd', 'numero', 'QTD'),
      c('tipo_doc', 'texto', 'TIPO_DOC'),
      c('atendimento', 'texto', 'ATENDIMENTO'),
      c('data_necessidade', 'data', 'DATA_NECESSIDADE'),
      c('po', 'texto', 'NUM_ACOMP'),
      c('item_po', 'texto', 'ITEM_ACOMP'),
      c('data_remessa', 'data', 'DATA REMESSA'),
      t('status_po', 'texto', 'STATUS DO PO'),
      c('tipo_projeto', 'texto', 'TIPO_PROJETO'),
      c('rm', 'texto', 'RM'),
      c('item_rm', 'texto', 'ITEM_RM'),
      c('fornecedor', 'texto', 'FORNECEDOR'),
      c('email', 'texto', 'email'),
      c('faixa_atraso', 'texto', 'FAIXA_ATRASO'),
      c('classe', 'texto', 'CLASSE'),
      c('desc_classe', 'texto', 'DESC_CLASSE'),
      c('ordem', 'texto', 'ORDEM'),
      c('leadtime', 'inteiro', 'LEADTIME'),
      c('centro', 'texto', 'CENTRO'),
    ],
    derivarChave: (l) => ({ chave: [l.rm, l.item_rm, l.po, l.item_po].map((v) => v ?? '').join('-') }),
  },
  iw38: {
    id: 'iw38',
    nome: 'Ordens SAP (IW38)',
    descricao: 'Exportação da IW38: uma linha por OM (tipo, prioridade, datas, custo e status).',
    tabela: 'ordens_sap',
    chave: ['ordem'],
    assinatura: ['Ordem', 'Tp.', 'Status do sistema', 'InícioBase'],
    // Exportação em arquivo (XLSX) usa os nomes completos das colunas.
    outrasAssinaturas: [['Ordem', 'Tipo de ordem', 'Status do sistema', 'Data-base do início']],
    campos: [
      c('ordem', 'codigo', 'Ordem'),
      c('tipo', 'texto', 'Tp.', 'Tipo de ordem'),
      c('prioridade', 'texto', 'P', 'Prioridade'),
      c('grp_planejamento', 'texto', 'GPM', 'Grp.plnj.PM'),
      c('centro_trabalho', 'texto', 'CenTrabRes', 'Centro trab.respons.'),
      c('tam', 'texto', 'TAM', 'Tipo atividad.manut.'),
      c('plano_manutencao', 'texto', 'Pln.manut.', 'Plano de manutenção'),
      c('revisao', 'texto', 'Revisão'),
      c('status_aprovacao', 'texto', 'St.Aprovaç', 'Status Aprovação'),
      c('local_instalacao', 'texto', 'Loc.instalação', 'Local de instalação'),
      c('denominacao_local', 'texto', 'Denom.loc.instalação', 'Denominação do loc.instalação'),
      c('texto', 'texto', 'Texto breve'),
      c('status_usuario', 'texto', 'Status usuário'),
      c('status_sistema', 'texto', 'Status do sistema'),
      c('modificado_por', 'texto', 'Modif.por', 'Último modificador'),
      c('criado_por', 'texto', 'Criado por'),
      c('sistema_funcional', 'texto', 'Sistema Funcional'),
      c('unidade_operacional', 'texto', 'Unidade Operacional'),
      c('unidade_funcional', 'texto', 'Unidade Funcional'),
      c('centro_custo', 'texto', 'Centro custo'),
      c('centro_custo_resp', 'texto', 'CenCstResp', 'Cen.cst.responsável'),
      c('nota', 'codigo', 'Nota'),
      c('inicio_base', 'data', 'InícioBase', 'Data-base do início'),
      c('fim_base', 'data', 'Fim-base', 'Data-base do fim'),
      c('data_modificacao', 'data', 'Data modif.', 'Data de modif.mestre ordens'),
      c('data_liberacao', 'data', 'Dat.liberação real', 'Data liberação real'),
      c('data_entrada', 'data', 'Data entr.', 'Data de entrada'),
      c('custo_planejado', 'numero', 'CustTotPl.', 'Custos totais plan.'),
    ],
  },
  grupos: {
    id: 'grupos',
    nome: 'Grupos de planejamento',
    descricao: 'Aba "Grupo de Planejamento": quem é o responsável (gerência, supervisor, inspetor e abastecimento) por cada grupo.',
    tabela: 'grupos_planejamento',
    chave: ['gpm'],
    assinatura: ['GPM', 'Matrícula Supervisor', 'Matrícula Abastecimento'],
    // A aba repete o cabeçalho no meio (um bloco por equipamento).
    ignorar: (r) => String(r.gpm ?? '').toUpperCase() === 'GPM',
    campos: [
      c('gpm', 'texto', 'GPM'),
      c('gerencia', 'texto', 'Gerênica', 'Gerência', 'Gerencia'),
      c('equipamento', 'texto', 'Equipamento'),
      c('matricula_supervisor', 'texto', 'Matrícula Supervisor'),
      c('supervisor', 'texto', 'Supervisor'),
      c('matricula_inspetor', 'texto', 'Matrícula Inspetor'),
      c('inspetor', 'texto', 'Inspetor'),
      c('matricula_abastecimento', 'texto', 'Matrícula Abastecimento'),
      c('abastecimento', 'texto', 'Abastecimento'),
    ],
  },
  materiais: {
    id: 'materiais',
    nome: 'Materiais (ZMR37)',
    descricao: 'Relatório ZMR37 consolidado por material/centro: MRP e estoque de cada material das reservas.',
    tabela: 'materiais_sap',
    chave: ['material'],
    assinatura: ['Material', 'PlMRP', 'TpM'],
    campos: [
      c('material', 'codigo', 'Material'),
      c('descricao', 'texto', 'Texto breve material'),
      c('centro', 'texto', 'Cen.', 'Centro'),
      c('planejador_mrp', 'texto', 'PlMRP', 'Planejador MRP'),
      c('tipo_mrp', 'texto', 'TpM', 'Tipo de MRP'),
      c('estoque_livre', 'numero', 'Utiliz.livre', 'Estoque livre'),
      c('estoque_seguranca', 'numero', 'Estq.seg.', 'Estoque de segurança'),
      c('unidade', 'texto', 'UMB'),
      c('abc', 'texto', 'ABC'),
      c('preco_medio', 'numero', 'PMM'),
    ],
  },
  reservas: {
    id: 'reservas',
    nome: 'Reservas',
    descricao: 'Planilha RESERVAS: SM para centro de custo.',
    tabela: 'reservas',
    chave: ['reserva', 'item'],
    assinatura: ['Nº reserva', 'Recebedor mercadoria', 'Status da reserva'],
    campos: [
      c('ordem', 'texto', 'Ordem'),
      c('reserva', 'texto', 'Nº reserva'),
      c('item', 'texto', 'Nº item reserva transferência'),
      c('material', 'texto', 'Material'),
      c('descricao', 'texto', 'Texto breve material'),
      c('unidade', 'texto', 'Unid.medida básica'),
      c('qtd', 'numero', 'Qtd.necessária'),
      c('data_necessidade', 'data', 'Data da necessidade'),
      c('usuario_sap', 'texto', 'Nome do usuário'),
      c('registro_final', 'flag', 'Com registro final'),
      c('recebedor', 'texto', 'Recebedor mercadoria'),
      c('eliminado', 'flag', 'Item foi eliminado'),
      c('permitido_movimento', 'flag', 'Permitido movimento'),
      c('centro', 'texto', 'Centro'),
      c('tipo_movimento', 'texto', 'Tipo de movimento'),
      c('status_reserva', 'texto', 'Status da reserva'),
      c('texto_movimento', 'texto', 'Txt.tipo movimento'),
      c('centro_custo', 'texto', 'Centro custo'),
      c('elemento_pep', 'texto', 'Elemento PEP'),
      c('deposito', 'texto', 'Depósito'),
    ],
  },
}

export const LISTA_BASES = Object.values(BASES)

export function normalizarCabecalho(valor: unknown) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/** Descobre qual base a linha de cabeçalho representa. */
export function identificarBase(cabecalho: unknown[]): Base | null {
  const presentes = new Set(cabecalho.map(normalizarCabecalho))
  const confere = (assinatura: string[]) => assinatura.every((h) => presentes.has(normalizarCabecalho(h)))
  return LISTA_BASES.find((b) => [b.assinatura, ...(b.outrasAssinaturas ?? [])].some(confere)) ?? null
}

/** Mapeia índice da coluna -> campo. */
export function mapearColunas(base: Base, cabecalho: unknown[]) {
  const normalizados = cabecalho.map(normalizarCabecalho)
  const mapa: Array<{ indice: number; campo: Campo }> = []
  for (const campo of base.campos) {
    const indice = normalizados.findIndex((h) => campo.cabecalhos.some((alvo) => normalizarCabecalho(alvo) === h))
    if (indice >= 0) mapa.push({ indice, campo })
  }
  return mapa
}

function dataIso(valor: unknown): string | null {
  if (valor == null || valor === '') return null
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor.toISOString().slice(0, 10)
  if (typeof valor === 'number') {
    // Número serial do Excel.
    const d = new Date(Math.round((valor - 25569) * 86_400_000))
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
  }
  const texto = String(valor).trim()
  const br = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (br) return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : null
}

function numero(valor: unknown): number | null {
  if (valor == null || valor === '') return null
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null
  let texto = String(valor).trim().replace(/\s/g, '')
  // SAP escreve negativo com o sinal no fim ("1,000-").
  if (/^[\d.,]+-$/.test(texto)) texto = '-' + texto.slice(0, -1)
  const normalizado = /,\d{1,}$/.test(texto) ? texto.replace(/\./g, '').replace(',', '.') : texto
  const n = Number(normalizado)
  return Number.isFinite(n) ? n : null
}

function texto(valor: unknown): string | null {
  if (valor == null) return null
  if (valor instanceof Date) return dataIso(valor)
  if (typeof valor === 'number') return Number.isInteger(valor) ? String(valor) : String(valor)
  const s = String(valor).trim()
  return s === '' ? null : s
}

export function converterValor(tipo: TipoCampo, valor: unknown): string | number | boolean | null {
  switch (tipo) {
    case 'texto':
      return texto(valor)
    case 'codigo': {
      const s = texto(valor)
      return s && /^\d+$/.test(s) ? s.replace(/^0+(?=\d)/, '') : s
    }
    case 'numero':
      return numero(valor)
    case 'inteiro': {
      const n = numero(valor)
      return n == null ? null : Math.round(n)
    }
    case 'data':
      return dataIso(valor)
    case 'flag':
      if (typeof valor === 'boolean') return valor
      return texto(valor)?.toUpperCase() === 'X'
    case 'simnao': {
      if (typeof valor === 'boolean') return valor
      const s = normalizarCabecalho(valor)
      if (s === 'sim' || s === 's' || s === 'x' || s === 'true') return true
      if (s === 'nao' || s === 'n' || s === 'false') return false
      return null
    }
  }
}

/** Converte uma linha crua do Excel em registro do banco (ou null se não tiver chave). */
export function converterLinha(base: Base, mapa: ReturnType<typeof mapearColunas>, linha: unknown[]) {
  const registro: Record<string, unknown> = {}
  for (const { indice, campo } of mapa) registro[campo.campo] = converterValor(campo.tipo, linha[indice])
  if (base.derivarChave) Object.assign(registro, base.derivarChave(registro))
  if (base.ignorar?.(registro)) return null
  return base.chave.every((k) => registro[k] != null && registro[k] !== '') ? registro : null
}

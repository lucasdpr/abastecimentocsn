import type { Workbook } from 'exceljs'
import { converterLinha, identificarBase, mapearColunas, type BaseId } from './bases'

/** Converte o valor de uma célula do ExcelJS em valor simples. */
export function valorCelula(v: unknown): unknown {
  if (v == null) return null
  if (v instanceof Date || typeof v !== 'object') return v
  const o = v as Record<string, unknown>
  if ('result' in o) return valorCelula(o.result)
  if ('richText' in o && Array.isArray(o.richText)) return (o.richText as Array<{ text: string }>).map((r) => r.text).join('')
  if ('text' in o) return o.text
  if ('error' in o) return null
  return String(v)
}

export type AbaLida = { nome: string; base: BaseId; linhas: Record<string, unknown>[]; colunasReconhecidas: number }

/**
 * Lê as abas reconhecidas de uma planilha (uma por base: a primeira aba de cada base vence).
 * Usado no navegador (tela Importar) e no servidor (robô).
 */
export function lerAbas(wb: Workbook): AbaLida[] {
  const encontradas: AbaLida[] = []
  wb.eachSheet((ws) => {
    // O cabeçalho pode estar nas primeiras linhas (ex.: aba Base do FUP começa na linha 2).
    for (let r = 1; r <= Math.min(6, ws.rowCount); r++) {
      const valores = ws.getRow(r).values as unknown[]
      const cabecalho = (Array.isArray(valores) ? valores.slice(1) : []).map(valorCelula)
      const base = identificarBase(cabecalho)
      if (!base) continue
      const mapa = mapearColunas(base, cabecalho)
      const linhas: Record<string, unknown>[] = []
      ws.eachRow({ includeEmpty: false }, (row, n) => {
        if (n <= r) return
        const bruta = (row.values as unknown[]).slice(1).map(valorCelula)
        const registro = converterLinha(base, mapa, bruta)
        if (registro) linhas.push(registro)
      })
      if (linhas.length) encontradas.push({ nome: ws.name, base: base.id, linhas, colunasReconhecidas: mapa.length })
      break
    }
  })
  return encontradas
}

/** É um .xlsx (zip)? Os relatórios salvos pelo SAP em "arquivo local" são texto com tabulação. */
export function ehXlsx(conteudo: Uint8Array) {
  return conteudo.length > 3 && conteudo[0] === 0x50 && conteudo[1] === 0x4b
}

/**
 * Converte o texto com tabulação do SAP (Lista › Salvar › Arquivo local) numa planilha do ExcelJS.
 * Ignora o título do relatório: fica só das linhas com várias colunas em diante (cabeçalho + dados).
 */
export function planilhaDeTexto(wb: Workbook, conteudo: Uint8Array) {
  // O SAP grava em ANSI (ISO-8859-1); se vier em UTF-8 válido, usa UTF-8.
  let texto: string
  try {
    texto = new TextDecoder('utf-8', { fatal: true }).decode(conteudo)
  } catch {
    texto = new TextDecoder('latin1').decode(conteudo)
  }
  const ws = wb.addWorksheet('Relatorio SAP')
  let comecou = false
  for (const linha of texto.split(/\r?\n/)) {
    const colunas = linha.split('\t')
    if (!comecou && colunas.length < 4) continue
    comecou = true
    if (colunas.every((c) => !c.trim())) continue
    ws.addRow(colunas.map((c) => c.trim()))
  }
  return wb
}

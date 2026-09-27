import { timingSafeEqual } from 'node:crypto'
import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'
import { pode, usuarioAtual } from '@/lib/auth'
import { BASES, type BaseId } from '@/lib/bases'
import { colunasExportacao, dadosExportacao, valorCelula } from '@/lib/exportacao'

export const maxDuration = 60

function tokenValido(token: string | null) {
  const esperado = process.env.EXPORT_TOKEN
  if (!token || !esperado || esperado.length < 16) return false
  const a = Buffer.from(token)
  const b = Buffer.from(esperado)
  return a.length === b.length && timingSafeEqual(a, b)
}

function csvCampo(v: unknown) {
  if (v == null) return ''
  const s = v instanceof Date ? v.toISOString().slice(0, 10) : typeof v === 'number' ? String(v).replace('.', ',') : String(v)
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET(request: Request, { params }: { params: Promise<{ base: string }> }) {
  const { base } = await params
  const url = new URL(request.url)
  const usuario = await usuarioAtual()
  const autorizado = (usuario && pode.verGestao(usuario)) || tokenValido(url.searchParams.get('token'))
  if (!autorizado) return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 })
  if (!(base in BASES)) return NextResponse.json({ erro: 'Base desconhecida.' }, { status: 404 })

  const baseId = base as BaseId
  const colunas = colunasExportacao(baseId)
  const linhas = await dadosExportacao(baseId)
  const nome = `${baseId}-${new Date().toISOString().slice(0, 10)}`

  if (url.searchParams.get('formato') === 'csv') {
    const corpo = [
      colunas.map((c) => csvCampo(c.titulo)).join(';'),
      ...linhas.map((l) => colunas.map((c) => csvCampo(valorCelula(l[c.campo], c.tipo))).join(';')),
    ].join('\r\n')
    return new NextResponse(`﻿${corpo}`, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="${nome}.csv"`,
        'cache-control': 'no-store',
      },
    })
  }

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Central de Abastecimento'
  const ws = wb.addWorksheet(BASES[baseId].nome.slice(0, 31), { views: [{ state: 'frozen', ySplit: 1 }] })
  ws.columns = colunas.map((c) => ({
    header: c.titulo,
    key: c.campo,
    width: Math.min(40, Math.max(12, c.titulo.length + 2)),
    style: c.tipo === 'data' ? { numFmt: 'dd/mm/yyyy' } : c.tipo === 'datahora' ? { numFmt: 'dd/mm/yyyy hh:mm' } : undefined,
  }))
  for (const l of linhas) ws.addRow(Object.fromEntries(colunas.map((c) => [c.campo, valorCelula(l[c.campo], c.tipo)])))
  ws.getRow(1).font = { bold: true }
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: colunas.length } }
  const buffer = await wb.xlsx.writeBuffer()
  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="${nome}.xlsx"`,
      'cache-control': 'no-store',
    },
  })
}

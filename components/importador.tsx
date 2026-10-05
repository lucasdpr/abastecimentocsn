'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CircleCheckBig, FileSpreadsheet, LoaderCircle, Upload } from 'lucide-react'
import { BASES, type BaseId } from '@/lib/bases'
import { lerAbas } from '@/lib/planilha'
import { numero } from '@/lib/formato'

type Aba = {
  nome: string
  base: BaseId
  linhas: Record<string, unknown>[]
  colunasReconhecidas: number
  selecionada: boolean
}

type Resultado = { base: BaseId; linhas: number; novas: number; alteradas: number; removidas: number }

const LOTE = 1000

export function Importador() {
  const router = useRouter()
  const [arquivo, setArquivo] = useState<string>('')
  const [abas, setAbas] = useState<Aba[]>([])
  const [lendo, setLendo] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [progresso, setProgresso] = useState('')
  const [erro, setErro] = useState('')
  const [carteiraCompleta, setCarteiraCompleta] = useState(true)
  const [resultados, setResultados] = useState<Resultado[]>([])

  async function ler(file: File) {
    setErro('')
    setResultados([])
    setAbas([])
    setArquivo(file.name)
    setLendo(true)
    try {
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.load(await file.arrayBuffer())
      const basesVistas = new Set<BaseId>()
      const encontradas: Aba[] = lerAbas(wb).map((aba) => {
        const selecionada = !basesVistas.has(aba.base)
        basesVistas.add(aba.base)
        return { ...aba, selecionada }
      })
      if (!encontradas.length) setErro('Não reconheci nenhuma planilha. Confira se o cabeçalho é o mesmo exportado do SAP (ex.: "Ordem", "Nº reserva", "Status do item").')
      setAbas(encontradas)
    } catch (e) {
      console.error(e)
      setErro('Não foi possível ler o arquivo. Salve como .xlsx e tente de novo.')
    } finally {
      setLendo(false)
    }
  }

  async function chamar(corpo: unknown) {
    const resposta = await fetch('/api/importar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) })
    const json = await resposta.json()
    if (!resposta.ok) throw new Error(json.erro ?? 'Falha na importação.')
    return json
  }

  async function importar() {
    setEnviando(true)
    setErro('')
    const feitos: Resultado[] = []
    try {
      for (const aba of abas.filter((a) => a.selecionada)) {
        const { importacaoId } = await chamar({ acao: 'iniciar', base: aba.base, arquivo: `${arquivo} › ${aba.nome}` })
        for (let i = 0; i < aba.linhas.length; i += LOTE) {
          setProgresso(`${BASES[aba.base].nome}: ${numero(Math.min(i + LOTE, aba.linhas.length))} de ${numero(aba.linhas.length)} linhas`)
          await chamar({ acao: 'lote', importacaoId, linhas: aba.linhas.slice(i, i + LOTE) })
        }
        setProgresso(`${BASES[aba.base].nome}: finalizando…`)
        feitos.push(await chamar({ acao: 'concluir', importacaoId, carteiraCompleta }))
      }
      setResultados(feitos)
      setAbas([])
      router.refresh()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha na importação.')
    } finally {
      setEnviando(false)
      setProgresso('')
    }
  }

  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-surface px-4 py-10 text-center transition-colors hover:border-accent">
        {lendo ? <LoaderCircle className="size-7 animate-spin text-accent" /> : <Upload className="size-7 text-muted" />}
        <span className="text-sm font-medium">{lendo ? `Lendo ${arquivo}…` : 'Selecionar planilha (.xlsx, .xltx)'}</span>
        <span className="text-xs text-muted">Ordens, IW38, Grupos de planejamento, Follow-up (FUP), Ativação ou Reservas. O tipo é detectado pelo cabeçalho.</span>
        <input
          type="file"
          accept=".xlsx,.xltx,.xlsm"
          className="sr-only"
          disabled={lendo || enviando}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) ler(f)
            e.target.value = ''
          }}
        />
      </label>

      {abas.length > 0 && (
        <div className="card divide-y divide-line">
          {abas.map((a, i) => (
            <label key={`${a.nome}-${i}`} className="flex items-center gap-3 p-4">
              <input
                type="checkbox"
                className="size-4 accent-[var(--brand)]"
                checked={a.selecionada}
                onChange={(e) => setAbas((atual) => atual.map((x, j) => (j === i ? { ...x, selecionada: e.target.checked } : x)))}
              />
              <FileSpreadsheet className="size-5 shrink-0 text-good" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{BASES[a.base].nome}</div>
                <div className="text-xs text-muted">
                  Aba “{a.nome}” · {numero(a.linhas.length)} linhas · {a.colunasReconhecidas} colunas reconhecidas
                </div>
              </div>
            </label>
          ))}
          <div className="space-y-3 p-4">
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5 size-4" checked={carteiraCompleta} onChange={(e) => setCarteiraCompleta(e.target.checked)} />
              <span>
                Arquivo contém a carteira completa
                <span className="block text-xs text-muted">Registros que não vierem no arquivo serão marcados como “fora do relatório”. Desmarque se for um recorte parcial.</span>
              </span>
            </label>
            <button className="btn btn-primary w-full sm:w-auto" onClick={importar} disabled={enviando || !abas.some((a) => a.selecionada)}>
              {enviando ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {enviando ? 'Importando…' : 'Importar selecionadas'}
            </button>
            {progresso && <p className="text-xs text-muted">{progresso}</p>}
          </div>
        </div>
      )}

      {erro && <p className="rounded-lg bg-crit-soft px-3 py-2 text-sm text-crit-ink">{erro}</p>}

      {resultados.map((r) => (
        <div key={r.base} className="flex items-start gap-3 rounded-lg bg-good-soft px-4 py-3 text-sm">
          <CircleCheckBig className="mt-0.5 size-4 shrink-0 text-good-ink" />
          <div>
            <div className="font-medium">{BASES[r.base].nome} atualizada</div>
            <div className="text-xs text-ink-2">
              {numero(r.linhas)} linhas · {numero(r.novas)} novas · {numero(r.alteradas)} com mudança · {numero(r.removidas)} fora do relatório
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

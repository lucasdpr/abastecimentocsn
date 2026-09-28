'use client'

import Link from 'next/link'
import { Fragment, useEffect, useRef, useState } from 'react'
import { ArrowUp, Bot, LoaderCircle } from 'lucide-react'

type Msg = { role: 'user' | 'assistant'; content: string; modo?: 'ia' | 'direto' }

const SUGESTOES = ['O que preciso cobrar hoje?', 'Resumo da carteira', 'Situação da OM 80008117069', 'Como está o PO 4504791859?']

/** Markdown mínimo: **negrito**, listas com "-", links para OM. */
function Texto({ texto }: { texto: string }) {
  const inline = (linha: string) =>
    linha.split(/(\*\*[^*]+\*\*|\bOM \d{8,12}\b)/g).map((parte, indice) => {
      if (parte.startsWith('**') && parte.endsWith('**')) {
        const interno = parte.slice(2, -2)
        const om = interno.match(/^OM (\d{8,12})/)
        return om ? <Link key={indice} href={`/ordens/${om[1]}`} className="font-semibold text-accent hover:underline">{interno}</Link> : <strong key={indice}>{interno}</strong>
      }
      const om = parte.match(/^OM (\d{8,12})$/)
      if (om) return <Link key={indice} href={`/ordens/${om[1]}`} className="text-accent hover:underline">{parte}</Link>
      return <Fragment key={indice}>{parte}</Fragment>
    })
  const blocos: React.ReactNode[] = []
  let lista: string[] = []
  const fecharLista = () => {
    if (lista.length) blocos.push(<ul key={blocos.length} className="my-1 list-disc space-y-1 pl-5">{lista.map((l, indice) => <li key={indice}>{inline(l)}</li>)}</ul>)
    lista = []
  }
  for (const linha of texto.split('\n')) {
    if (/^\s*[-•*]\s+/.test(linha)) lista.push(linha.replace(/^\s*[-•*]\s+/, ''))
    else if (/^\s{2,}\S/.test(linha) && lista.length) lista[lista.length - 1] += ` — ${linha.trim()}`
    else {
      fecharLista()
      if (linha.trim()) blocos.push(<p key={blocos.length}>{inline(linha.replace(/^#+\s*/, ''))}</p>)
    }
  }
  fecharLista()
  return <div className="space-y-2">{blocos}</div>
}

export function Chat({ nome }: { nome: string }) {
  const [mensagens, setMensagens] = useState<Msg[]>([])
  const [entrada, setEntrada] = useState('')
  const [pensando, setPensando] = useState(false)
  const fim = useRef<HTMLDivElement>(null)
  useEffect(() => fim.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), [mensagens, pensando])

  async function enviar(texto: string) {
    const pergunta = texto.trim()
    if (!pergunta || pensando) return
    const novas: Msg[] = [...mensagens, { role: 'user', content: pergunta }]
    setMensagens(novas)
    setEntrada('')
    setPensando(true)
    try {
      const r = await fetch('/api/assistente', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mensagens: novas.map(({ role, content }) => ({ role, content })) }),
      })
      const json = await r.json()
      setMensagens([...novas, { role: 'assistant', content: json.texto ?? json.erro ?? 'Sem resposta.', modo: json.modo }])
    } catch {
      setMensagens([...novas, { role: 'assistant', content: 'Falha de conexão. Tente novamente.' }])
    } finally {
      setPensando(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-13rem)] flex-col lg:min-h-[calc(100dvh-9rem)]">
      <div className="flex-1 space-y-4">
        {!mensagens.length && (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand"><Bot className="size-6" /></div>
            <h2 className="text-lg font-semibold">Olá, {nome.split(' ')[0]}. O que você quer saber?</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted">Pergunte pelo número da OM, do PO, por um material ou fornecedor. As respostas vêm dos dados importados do SAP.</p>
            <div className="mx-auto mt-6 grid max-w-lg gap-2 sm:grid-cols-2">
              {SUGESTOES.map((s) => (
                <button key={s} className="card px-3 py-2.5 text-left text-sm hover:border-line-strong" onClick={() => enviar(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {mensagens.map((m, indice) =>
          m.role === 'user' ? (
            <div key={indice} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-sm text-brand-ink">{m.content}</div>
            </div>
          ) : (
            <div key={indice} className="flex gap-3">
              <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"><Bot className="size-4" /></div>
              <div className="card min-w-0 max-w-[90%] px-4 py-3 text-sm leading-relaxed">
                <Texto texto={m.content} />
                {m.modo === 'direto' && <p className="mt-2 text-[11px] text-muted">Consultei direto nos dados importados (sem modelo de IA generativa configurado).</p>}
              </div>
            </div>
          ),
        )}
        {pensando && (
          <div className="flex items-center gap-2 pl-11 text-sm text-muted"><LoaderCircle className="size-4 animate-spin" /> Consultando…</div>
        )}
        <div ref={fim} />
      </div>
      <form
        className="sticky bottom-20 mt-4 lg:bottom-4"
        onSubmit={(e) => {
          e.preventDefault()
          enviar(entrada)
        }}
      >
        <div className="card flex items-end gap-2 p-2 shadow-sm">
          <textarea
            className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted"
            rows={1}
            value={entrada}
            placeholder="Ex.: situação da OM 80008117069"
            onChange={(e) => setEntrada(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                enviar(entrada)
              }
            }}
          />
          <button className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-brand-ink disabled:opacity-40" disabled={!entrada.trim() || pensando} aria-label="Enviar">
            <ArrowUp className="size-4" />
          </button>
        </div>
      </form>
    </div>
  )
}

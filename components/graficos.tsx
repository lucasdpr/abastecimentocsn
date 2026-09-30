'use client'

import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { moeda, moedaCurta, numero } from '@/lib/formato'

/** Grupos de cor das colunas: atraso é estado (vermelho), a vencer é a série padrão, sem data é contexto (cinza). */
const GRUPOS = {
  atraso: { cor: 'var(--crit)', nome: 'Atrasado' },
  prazo: { cor: 'var(--series-1)', nome: 'A vencer' },
  sem: { cor: 'var(--deemph-1)', nome: 'Sem data' },
} as const

type Coluna = { rotulo: string; grupo: keyof typeof GRUPOS; valor: number; itens: number }

function DicaColuna({ active, payload, legendas }: { active?: boolean; payload?: Array<{ payload?: Coluna }>; legendas: Partial<Record<keyof typeof GRUPOS, string>> }) {
  const c = payload?.[0]?.payload
  if (!active || !c) return null
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-alta">
      <p className="mb-1 flex items-center gap-1.5 font-medium text-ink">
        <span className="size-2 rounded-[3px]" style={{ background: GRUPOS[c.grupo].cor }} aria-hidden />
        {legendas[c.grupo] ?? GRUPOS[c.grupo].nome} · {c.rotulo}
      </p>
      <p className="num text-ink-2">
        <span className="font-semibold text-ink">{moeda(c.valor)}</span> · {numero(c.itens)} itens
      </p>
    </div>
  )
}

/**
 * Colunas de valor (R$) por faixa, coloridas pelo grupo (atrasado / a vencer / sem data).
 * Uma medida só, um eixo só; itens aparecem na dica e na tabela.
 */
export function GraficoColunas({
  dados,
  legendas = {},
  descricao,
  preencher,
}: {
  dados: Coluna[]
  /** Cresce para ocupar a altura do cartão (quando o vizinho no grid é mais alto). */
  preencher?: boolean
  /** Nome de cada grupo na legenda (ex.: "Atrasado há", "Vence em"). */
  legendas?: Partial<Record<keyof typeof GRUPOS, string>>
  descricao: string
}) {
  const grupos = (Object.keys(GRUPOS) as Array<keyof typeof GRUPOS>).filter((g) => dados.some((d) => d.grupo === g))
  // Com pouca largura por coluna (celular), os rótulos do eixo se sobrepõem: inclina.
  const [largura, setLargura] = useState(0)
  const inclinar = largura > 0 && (largura - 48) / dados.length < 52
  if (!dados.some((d) => d.valor || d.itens)) return <p className="py-8 text-center text-sm text-muted">Nada neste recorte.</p>
  return (
    <div className={preencher ? 'flex flex-1 flex-col' : undefined}>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
        {grupos.map((g) => (
          <span key={g} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px]" style={{ background: GRUPOS[g].cor }} aria-hidden /> {legendas[g] ?? GRUPOS[g].nome}
          </span>
        ))}
      </div>
      <div className={preencher ? 'min-h-60 flex-1' : 'h-60'} role="img" aria-label={descricao}>
        <ResponsiveContainer width="100%" height="100%" onResize={(w) => setLargura(w)}>
          <BarChart data={dados} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis
              dataKey="rotulo"
              tickLine={false}
              axisLine={{ stroke: 'var(--line-strong)' }}
              tick={{ fontSize: 11, fill: 'var(--muted)' }}
              interval={0}
              angle={inclinar ? -40 : 0}
              textAnchor={inclinar ? 'end' : 'middle'}
              height={inclinar ? 46 : 30}
            />
            <YAxis tickLine={false} axisLine={false} width={48} tick={{ fontSize: 11, fill: 'var(--muted)' }} tickFormatter={(v) => moedaCurta(v).replace('R$ ', '')} />
            <Tooltip cursor={{ fill: 'var(--grid)', opacity: 0.6 }} content={<DicaColuna legendas={legendas} />} />
            <Bar dataKey="valor" radius={[4, 4, 0, 0]} maxBarSize={44}>
              {dados.map((d, i) => (
                <Cell key={i} fill={GRUPOS[d.grupo].cor} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-muted hover:text-ink">Ver como tabela</summary>
        <div className="mt-2 overflow-auto rounded-xl border border-line">
          <table className="tabela">
            <thead>
              <tr>
                <th>Faixa</th>
                <th className="text-right">Itens</th>
                <th className="text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {dados.map((d, i) => (
                <tr key={i}>
                  <td>
                    {legendas[d.grupo] ?? GRUPOS[d.grupo].nome} · {d.rotulo}
                  </td>
                  <td className="num text-right">{numero(d.itens)}</td>
                  <td className="num text-right">{moeda(d.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}

type Semana = { semana: string; com_retorno: number; sem_retorno: number }

const SERIES = [
  { chave: 'com_retorno', nome: 'Com retorno', cor: 'var(--series-1)' },
  { chave: 'sem_retorno', nome: 'Sem retorno', cor: 'var(--series-2)' },
] as const

function Dica({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey?: string | number; value?: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-alta">
      <p className="mb-1.5 font-medium text-ink">Semana {label}</p>
      {SERIES.map((s) => {
        const v = payload.find((p) => p.dataKey === s.chave)?.value ?? 0
        return (
          <p key={s.chave} className="flex items-center gap-2 text-ink-2">
            <span className="h-0.5 w-3 rounded-full" style={{ background: s.cor }} aria-hidden />
            <span className="num font-semibold text-ink">{moeda(v)}</span> {s.nome}
          </p>
        )
      })}
    </div>
  )
}

/** Valor ativado por semana, dividido em com/sem retorno do fornecedor. */
export function GraficoRetornoSemanal({ dados }: { dados: Semana[] }) {
  return (
    <div>
      <div className="mb-3 flex gap-4 text-xs text-ink-2">
        {SERIES.map((s) => (
          <span key={s.chave} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px]" style={{ background: s.cor }} aria-hidden /> {s.nome}
          </span>
        ))}
      </div>
      <div className="h-64" role="img" aria-label="Gráfico de barras empilhadas: valor com e sem retorno por semana de ativação">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="semana" tickLine={false} axisLine={{ stroke: 'var(--line-strong)' }} tick={{ fontSize: 11, fill: 'var(--muted)' }} />
            <YAxis tickLine={false} axisLine={false} width={52} tick={{ fontSize: 11, fill: 'var(--muted)' }} tickFormatter={(v) => moedaCurta(v).replace('R$ ', '')} />
            <Tooltip cursor={{ fill: 'var(--grid)', opacity: 0.6 }} content={<Dica />} />
            <Bar dataKey="com_retorno" stackId="a" fill="var(--series-1)" stroke="var(--surface)" strokeWidth={2} maxBarSize={24} />
            <Bar dataKey="sem_retorno" stackId="a" fill="var(--series-2)" stroke="var(--surface)" strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-muted hover:text-ink">Ver como tabela</summary>
        <div className="mt-2 max-h-64 overflow-auto rounded-xl border border-line">
          <table className="tabela">
            <thead>
              <tr>
                <th>Semana</th>
                <th className="text-right">Com retorno</th>
                <th className="text-right">Sem retorno</th>
              </tr>
            </thead>
            <tbody>
              {dados.map((s) => (
                <tr key={s.semana}>
                  <td>{s.semana}</td>
                  <td className="num text-right">{moeda(s.com_retorno)}</td>
                  <td className="num text-right">{moeda(s.sem_retorno)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}

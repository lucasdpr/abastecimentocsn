'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { moeda, moedaCurta } from '@/lib/formato'

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

'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { moeda, moedaCurta } from '@/lib/formato'

type Semana = { semana: string; com_retorno: number; sem_retorno: number }

/** Valor ativado por semana, dividido em com/sem retorno do fornecedor. */
export function GraficoRetornoSemanal({ dados }: { dados: Semana[] }) {
  return (
    <div>
      <div className="mb-3 flex gap-4 text-xs text-ink-2">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: 'var(--series-1)' }} /> Com retorno
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: 'var(--series-2)' }} /> Sem retorno
        </span>
      </div>
      <div className="h-60" role="img" aria-label="Gráfico de barras empilhadas: valor com e sem retorno por semana de ativação">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="semana" tickLine={false} axisLine={{ stroke: 'var(--line-strong)' }} tick={{ fontSize: 11, fill: 'var(--muted)' }} />
            <YAxis tickLine={false} axisLine={false} width={48} tick={{ fontSize: 11, fill: 'var(--muted)' }} tickFormatter={(v) => moedaCurta(v).replace('R$ ', '')} />
            <Tooltip
              cursor={{ fill: 'var(--grid)' }}
              contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12, color: 'var(--ink)' }}
              formatter={(v, nome) => [moeda(v), nome === 'com_retorno' ? 'Com retorno' : 'Sem retorno']}
            />
            <Bar dataKey="com_retorno" stackId="a" fill="var(--series-1)" stroke="var(--surface)" strokeWidth={2} />
            <Bar dataKey="sem_retorno" stackId="a" fill="var(--series-2)" stroke="var(--surface)" strokeWidth={2} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

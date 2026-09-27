const nf = new Intl.NumberFormat('pt-BR')
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

export const numero = (v: unknown) => nf.format(Number(v ?? 0))

export function moeda(v: unknown) {
  return brl.format(Number(v ?? 0))
}

/** R$ 251,1 mi — para KPIs e gráficos. */
export function moedaCurta(v: unknown) {
  const n = Number(v ?? 0)
  const abs = Math.abs(n)
  if (abs >= 1e9) return `R$ ${(n / 1e9).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} bi`
  if (abs >= 1e6) return `R$ ${(n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  if (abs >= 1e3) return `R$ ${(n / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`
  return brl.format(n)
}

export function data(v: unknown) {
  if (!v) return '—'
  const texto = v instanceof Date ? v.toISOString() : String(v)
  const m = texto.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[3]}/${m[2]}/${m[1]}`
  const d = new Date(texto)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR')
}

export function dataHora(v: unknown) {
  if (!v) return '—'
  const d = new Date(v instanceof Date ? v : String(v))
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
}

export function dias(n: number | null | undefined) {
  if (n == null) return '—'
  return n === 1 ? '1 dia' : `${nf.format(n)} dias`
}

export function pct(parte: unknown, total: unknown) {
  const t = Number(total ?? 0)
  return t ? Math.round((Number(parte ?? 0) / t) * 1000) / 10 : 0
}

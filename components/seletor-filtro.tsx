'use client'

import { useRouter } from 'next/navigation'

/** Select que aplica o filtro na URL ao mudar (preserva os demais parâmetros). */
export function SeletorFiltro({
  base,
  parametros,
  chave,
  rotulo,
  opcoes,
}: {
  base: string
  parametros: Record<string, string | undefined>
  chave: string
  rotulo: string
  opcoes: Array<{ valor: string; rotulo: string }>
}) {
  const router = useRouter()
  return (
    <label className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
      <span className="shrink-0 text-xs text-muted">{rotulo}</span>
      <select
        className="input h-8 min-w-0 rounded-lg py-0 text-xs sm:w-48"
        value={parametros[chave] ?? ''}
        onChange={(e) => {
          const p = new URLSearchParams(Object.entries(parametros).filter(([k, v]) => v && k !== chave && k !== 'pagina') as [string, string][])
          if (e.target.value) p.set(chave, e.target.value)
          router.push(`${base}${p.size ? `?${p}` : ''}`)
        }}
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>{o.rotulo}</option>
        ))}
      </select>
    </label>
  )
}

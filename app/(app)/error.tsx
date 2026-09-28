'use client'

import { useEffect } from 'react'

// Depois de uma publicação nova, um app aberto há horas ainda pede arquivos da
// versão antiga, que não existem mais no servidor. Recarregar resolve.
const VERSAO_ANTIGA = /ChunkLoadError|Loading (CSS )?chunk|dynamically imported module|Importing a module script failed|Failed to fetch/i

export default function Erro({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error)
    if (!VERSAO_ANTIGA.test(`${error.name} ${error.message}`)) return
    try {
      // No máximo uma recarga por minuto, para nunca entrar em loop.
      if (Date.now() - Number(sessionStorage.getItem('recarregou-versao') ?? 0) < 60_000) return
      sessionStorage.setItem('recarregou-versao', String(Date.now()))
    } catch {}
    window.location.reload()
  }, [error])

  return (
    <div className="py-20 text-center">
      <h1 className="text-lg font-semibold">Algo deu errado</h1>
      <p className="mt-1 text-sm text-muted">Não foi possível carregar esta tela. Tente de novo em alguns segundos.</p>
      <div className="mt-4 flex justify-center gap-2">
        <button className="btn" onClick={() => retry()}>
          Tentar de novo
        </button>
        <button className="btn" onClick={() => window.location.reload()}>
          Recarregar o app
        </button>
      </div>
      <p className="mx-auto mt-6 max-w-md text-[11px] break-words text-muted">
        {error.digest ? `Código: ${error.digest}` : `Detalhe: ${error.name}: ${error.message}`.slice(0, 240)}
      </p>
    </div>
  )
}

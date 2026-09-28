'use client'

import { useEffect } from 'react'

export default function Erro({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="py-20 text-center">
      <h1 className="text-lg font-semibold">Algo deu errado</h1>
      <p className="mt-1 text-sm text-muted">Não foi possível carregar os dados. Tente de novo em alguns segundos.</p>
      {/* retry() busca os dados de novo no servidor; reset() só redesenhava o mesmo erro. */}
      <button className="btn mt-4" onClick={() => retry()}>
        Tentar de novo
      </button>
      {error.digest && <p className="mt-6 text-[11px] text-muted">Código: {error.digest}</p>}
    </div>
  )
}

'use client'

import { useEffect } from 'react'

export default function Erro({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error)
    // Erros sem "digest" nunca vêm do nosso código no servidor (que sempre trata
    // seus próprios erros com try/catch) — só sobram bugs reais e, o mais comum,
    // JS de uma versão antiga do app (aberto há horas) chocando com a versão
    // nova publicada no meio do caminho. Recarregar resolve os dois: no bug
    // real o usuário vê o erro de novo; na versão antiga, resolve na hora.
    if (error.digest) return
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

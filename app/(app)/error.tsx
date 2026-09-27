'use client'

export default function Erro({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="py-20 text-center">
      <h1 className="text-lg font-semibold">Algo deu errado</h1>
      <p className="mt-1 text-sm text-muted">Não foi possível carregar os dados. Verifique a conexão com o banco.</p>
      <button className="btn mt-4" onClick={reset}>Tentar de novo</button>
    </div>
  )
}

/**
 * Sem este arquivo, o Next.js não mostra nada durante a navegação: a tela
 * anterior fica parada até os dados da página seguinte chegarem do banco —
 * o que parece um travamento. Com ele, a troca é imediata.
 */
export default function Carregando() {
  return (
    <div aria-busy="true" aria-label="Carregando">
      <div className="mb-6 space-y-2.5">
        <div className="esqueleto h-3 w-24" />
        <div className="esqueleto h-8 w-64" />
        <div className="esqueleto h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="card space-y-3 p-5">
            <div className="esqueleto h-3 w-24" />
            <div className="esqueleto h-7 w-20" />
            <div className="esqueleto h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="card space-y-3 p-5 lg:col-span-2">
          <div className="esqueleto h-4 w-48" />
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="esqueleto h-9 w-full" />
          ))}
        </div>
        <div className="card space-y-3 p-5">
          <div className="esqueleto h-4 w-40" />
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="esqueleto h-6 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

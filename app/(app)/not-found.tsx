import Link from 'next/link'

export default function NaoEncontrado() {
  return (
    <div className="py-20 text-center">
      <h1 className="text-lg font-semibold">Não encontrado</h1>
      <p className="mt-1 text-sm text-muted">Essa ordem ou página não existe nos dados importados.</p>
      <Link href="/ordens" className="btn mt-4">Voltar para ordens</Link>
    </div>
  )
}

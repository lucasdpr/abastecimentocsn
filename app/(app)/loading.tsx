import { Loader2 } from 'lucide-react'

/**
 * Sem este arquivo, o Next.js não mostra nada durante a navegação: a tela
 * anterior fica parada até os dados da página seguinte chegarem do banco —
 * o que parece um travamento (ex.: sair da tela da IA "não sai de lugar").
 * Com isso, toda navegação dentro do app troca pra este esqueleto na hora.
 */
export default function Carregando() {
  return (
    <div className="grid min-h-[50vh] place-items-center text-muted">
      <Loader2 className="size-6 animate-spin" />
    </div>
  )
}

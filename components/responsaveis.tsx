import { Painel } from '@/components/ui'
import type { ResponsavelGrupo } from '@/lib/consultas'

const PAPEIS = [
  ['gerencia', 'Gerência'],
  ['supervisor', 'Supervisor'],
  ['inspetor', 'Inspetor'],
  ['abastecimento', 'Abastecimento'],
] as const

/** Quem responde pelo grupo de planejamento da ordem (vem da planilha "Grupo de Planejamento"). */
export function PainelResponsaveis({ gpm, grupo }: { gpm: string | null; grupo?: ResponsavelGrupo }) {
  if (!gpm || !grupo) return null
  return (
    <Painel titulo="Responsáveis do grupo" descricao={`Grupo ${gpm}${grupo.equipamento ? ` · ${grupo.equipamento}` : ''}`}>
      <dl className="space-y-2.5 text-sm">
        {PAPEIS.map(([campo, rotulo]) => {
          const nome = grupo[campo]
          if (!nome) return null
          const mat = campo === 'gerencia' ? null : grupo[`matricula_${campo}` as 'matricula_supervisor']
          return (
            <div key={campo}>
              <dt className="text-xs text-muted">{rotulo}</dt>
              <dd className="font-medium">
                {nome}
                {mat && <span className="num ml-1.5 text-xs font-normal text-muted">{mat}</span>}
              </dd>
            </div>
          )
        })}
      </dl>
    </Painel>
  )
}

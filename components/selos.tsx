import { Selo } from './ui'
import { dias } from '@/lib/formato'

export const NOME_SITUACAO: Record<string, string> = {
  sem_acao: 'Sem ação',
  cobrado: 'Cobrado',
  aguardando: 'Aguardando retorno',
  resolvido: 'Resolvido',
}

export function SeloSituacao({ situacao }: { situacao: string | null }) {
  const s = situacao ?? 'sem_acao'
  const tom = s === 'resolvido' ? 'bom' : s === 'cobrado' || s === 'aguardando' ? 'info' : 'neutro'
  return <Selo tom={tom} icone={s !== 'sem_acao'}>{NOME_SITUACAO[s]}</Selo>
}

export function SeloParada({ diasParada, limite, abertos }: { diasParada: number; limite: number; abertos: number }) {
  if (!abertos) return <Selo tom="bom">Atendida</Selo>
  if (diasParada >= limite) return <Selo tom="critico">Parada há {dias(diasParada)}</Selo>
  if (diasParada >= limite / 2) return <Selo tom="alerta">{dias(diasParada)} sem mudança</Selo>
  return <Selo tom="neutro" icone={false}>{dias(diasParada)} sem mudança</Selo>
}

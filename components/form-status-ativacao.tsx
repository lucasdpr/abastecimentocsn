'use client'

import { useActionState } from 'react'
import { salvarStatusAtivacao } from '@/app/acoes'

export function FormStatusAtivacao({ chave, status }: { chave: string; status: string | null }) {
  const [estado, acao, pendente] = useActionState(salvarStatusAtivacao, null)
  return (
    <form action={acao} className="mt-3 flex gap-2">
      <input type="hidden" name="chave" value={chave} />
      <input className="input" name="status_po" defaultValue={status ?? ''} placeholder="Status do PO (ex.: PREVISTO PARA 23/09)" list="status-ativacao" />
      <button className="btn btn-primary shrink-0" disabled={pendente}>{estado?.ok && !pendente ? 'Salvo' : 'Salvar'}</button>
    </form>
  )
}

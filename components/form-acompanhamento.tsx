'use client'

import { useActionState, useEffect, useRef } from 'react'
import { Megaphone } from 'lucide-react'
import { registrarCobranca, salvarAcompanhamento } from '@/app/acoes'

type Props = { ordem: string; situacao: string | null; setor: string | null; observacao: string | null }

export function FormAcompanhamento({ ordem, situacao, setor, observacao }: Props) {
  const [estadoCobranca, cobrar, cobrando] = useActionState(registrarCobranca, null)
  const [estado, salvar, salvando] = useActionState(salvarAcompanhamento, null)
  const formCobranca = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (estadoCobranca?.ok) formCobranca.current?.reset()
  }, [estadoCobranca])

  return (
    <div className="space-y-5">
      <form ref={formCobranca} action={cobrar} className="space-y-3 rounded-lg border border-line bg-surface-2 p-3">
        <input type="hidden" name="ordem" value={ordem} />
        <div className="text-sm font-medium">Registrar cobrança</div>
        <input className="input" name="setor" placeholder="Setor cobrado (ex.: GPMA, Suprimentos)" defaultValue={setor ?? ''} />
        <textarea className="input" name="observacao" rows={2} placeholder="O que foi cobrado / resposta (opcional)" />
        <button className="btn btn-primary w-full" disabled={cobrando}>
          <Megaphone className="size-4" /> {cobrando ? 'Registrando…' : 'Registrar cobrança'}
        </button>
        {estadoCobranca?.ok && <p className="text-xs text-good-ink">Cobrança registrada.</p>}
        {estadoCobranca?.erro && <p className="text-xs text-crit-ink">{estadoCobranca.erro}</p>}
      </form>

      <form action={salvar} className="space-y-3">
        <input type="hidden" name="ordem" value={ordem} />
        <div>
          <label className="label" htmlFor="situacao">Situação</label>
          <select className="input" id="situacao" name="situacao" defaultValue={situacao ?? 'sem_acao'}>
            <option value="sem_acao">Sem ação</option>
            <option value="cobrado">Cobrado</option>
            <option value="aguardando">Aguardando retorno</option>
            <option value="resolvido">Resolvido</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="setor">Setor responsável</label>
          <input className="input" id="setor" name="setor" defaultValue={setor ?? ''} />
        </div>
        <div>
          <label className="label" htmlFor="observacao">Observação</label>
          <textarea className="input" id="observacao" name="observacao" rows={3} defaultValue={observacao ?? ''} />
        </div>
        <button className="btn w-full" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar acompanhamento'}</button>
        {estado?.ok && <p className="text-xs text-good-ink">Salvo.</p>}
        {estado?.erro && <p className="text-xs text-crit-ink">{estado.erro}</p>}
      </form>
    </div>
  )
}

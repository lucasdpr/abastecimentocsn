'use client'

import { useActionState, useEffect, useRef } from 'react'
import { salvarAntec } from '@/app/acoes'
import type { Antec } from '@/lib/consultas'

export function FormAntec({ antec }: { antec?: Antec }) {
  const [estado, acao, pendente] = useActionState(salvarAntec, null)
  const form = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (estado?.ok && !antec) form.current?.reset()
  }, [estado, antec])
  const v = (k: keyof Antec) => (antec?.[k] as string | null | undefined) ?? ''
  return (
    <form ref={form} action={acao} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {antec && <input type="hidden" name="id" value={antec.id} />}
      <Campo rotulo="Número da ANTEC *"><input className="input" name="numero" required defaultValue={v('numero')} /></Campo>
      <Campo rotulo="Ordem (OM)"><input className="input" name="ordem" inputMode="numeric" defaultValue={v('ordem')} /></Campo>
      <Campo rotulo="PO"><input className="input" name="po" inputMode="numeric" defaultValue={v('po')} /></Campo>
      <Campo rotulo="Área"><input className="input" name="area" defaultValue={v('area')} placeholder="Ex.: GGLD" /></Campo>
      <Campo rotulo="Ponto focal"><input className="input" name="ponto_focal" defaultValue={v('ponto_focal')} /></Campo>
      <Campo rotulo="Status">
        <select className="input" name="status" defaultValue={v('status') || 'recebida'}>
          <option value="recebida">Recebida pela Central</option>
          <option value="com_area">Com a área</option>
          <option value="em_aprovacao">Em aprovação</option>
          <option value="concluida">Concluída</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </Campo>
      <Campo rotulo="Recebida em"><input className="input" type="date" name="recebida_em" defaultValue={v('recebida_em').slice(0, 10) || new Date().toISOString().slice(0, 10)} /></Campo>
      <Campo rotulo="Enviada à área em"><input className="input" type="date" name="enviada_area_em" defaultValue={v('enviada_area_em').slice(0, 10)} /></Campo>
      <Campo rotulo="Retorno da área em"><input className="input" type="date" name="retorno_area_em" defaultValue={v('retorno_area_em').slice(0, 10)} /></Campo>
      <div className="sm:col-span-2 lg:col-span-3">
        <Campo rotulo="Descrição / observação">
          <textarea className="input" name="descricao" rows={2} defaultValue={v('descricao')} />
        </Campo>
      </div>
      <input type="hidden" name="observacao" value={v('observacao')} />
      <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
        <button className="btn btn-primary" disabled={pendente}>{pendente ? 'Salvando…' : antec ? 'Salvar' : 'Registrar ANTEC'}</button>
        {estado?.ok && <span className="text-xs text-good-ink">Salvo.</span>}
        {estado?.erro && <span className="text-xs text-crit-ink">{estado.erro}</span>}
      </div>
    </form>
  )
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{rotulo}</span>
      {children}
    </label>
  )
}

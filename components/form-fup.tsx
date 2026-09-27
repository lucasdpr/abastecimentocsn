'use client'

import { useActionState } from 'react'
import { salvarFup } from '@/app/acoes'

const MOTIVOS = ['Sem retorno', 'Faturado e coletado', 'Novo prazo de entrega', 'Manter Data', 'Rejeitado', 'Duvida no Pedido', 'Pedido não recebido pelo fornecedor', 'Coleta agendada', 'Problema na entrega', 'Regularização de Valor']
const DINAMICA = ['Sem retorno', 'Entregue', 'Em tratativa', 'Manter Data', 'Eliminado', 'Faturado']
const RESPONSAVEIS = ['Fornecedor', 'Tratado', 'GPMA', 'Central', 'Logística (FAT/COL)', 'Suprimentos', 'GDOP']

type Props = {
  poItem: string
  motivo: string | null
  novaData: string | null
  obs: string | null
  motivoDinamica: string | null
  responsavel: string | null
  retorno: boolean | null
}

function Opcoes({ lista, atual }: { lista: string[]; atual: string | null }) {
  const todas = atual && !lista.includes(atual) ? [atual, ...lista] : lista
  return (
    <>
      <option value="">—</option>
      {todas.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </>
  )
}

export function FormFup(p: Props) {
  const [estado, acao, pendente] = useActionState(salvarFup, null)
  return (
    <form action={acao} className="grid gap-3 pt-3 sm:grid-cols-2">
      <input type="hidden" name="po_item" value={p.poItem} />
      <div>
        <label className="label">Retorno do fornecedor</label>
        <select className="input" name="retorno" defaultValue={p.retorno == null ? '' : p.retorno ? 'sim' : 'nao'}>
          <option value="">—</option>
          <option value="sim">Sim</option>
          <option value="nao">Não</option>
        </select>
      </div>
      <div>
        <label className="label">Nova data</label>
        <input className="input" type="date" name="nova_data" defaultValue={p.novaData?.slice(0, 10) ?? ''} />
      </div>
      <div>
        <label className="label">Motivo consolidado</label>
        <select className="input" name="motivo" defaultValue={p.motivo ?? ''}>
          <Opcoes lista={MOTIVOS} atual={p.motivo} />
        </select>
      </div>
      <div>
        <label className="label">Motivo dinâmica</label>
        <select className="input" name="motivo_dinamica" defaultValue={p.motivoDinamica ?? ''}>
          <Opcoes lista={DINAMICA} atual={p.motivoDinamica} />
        </select>
      </div>
      <div>
        <label className="label">Responsável</label>
        <select className="input" name="responsavel" defaultValue={p.responsavel ?? ''}>
          <Opcoes lista={RESPONSAVEIS} atual={p.responsavel} />
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="label">Observação do fornecedor</label>
        <textarea className="input" name="obs_fornecedor" rows={2} defaultValue={p.obs ?? ''} />
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button className="btn btn-primary" disabled={pendente}>{pendente ? 'Salvando…' : 'Salvar tratativa'}</button>
        {estado?.ok && <span className="text-xs text-good-ink">Salvo.</span>}
        {estado?.erro && <span className="text-xs text-crit-ink">{estado.erro}</span>}
      </div>
    </form>
  )
}

'use client'

import { useActionState } from 'react'
import { alterarMinhaSenha, salvarConfiguracoes, salvarUsuario, type Resultado } from '@/app/acoes'

function Mensagem({ estado }: { estado: Resultado }) {
  if (estado?.ok) return <span className="text-xs text-good-ink">Salvo.</span>
  if (estado?.erro) return <span className="text-xs text-crit-ink">{estado.erro}</span>
  return null
}

export function FormSenha() {
  const [estado, acao, pendente] = useActionState(alterarMinhaSenha, null)
  return (
    <form action={acao} className="space-y-3">
      <input className="input" type="password" name="atual" placeholder="Senha atual" autoComplete="current-password" required />
      <input className="input" type="password" name="nova" placeholder="Nova senha (mín. 8)" autoComplete="new-password" minLength={8} required />
      <div className="flex items-center gap-3">
        <button className="btn" disabled={pendente}>Alterar senha</button>
        <Mensagem estado={estado} />
      </div>
    </form>
  )
}

export function FormParametros({ dias, recobranca }: { dias: number; recobranca: number }) {
  const [estado, acao, pendente] = useActionState(salvarConfiguracoes, null)
  return (
    <form action={acao} className="space-y-3">
      <label className="block">
        <span className="label">Alertar ordem sem movimentação após (dias)</span>
        <input className="input" type="number" name="dias_sem_movimentacao" min={1} max={365} defaultValue={dias} />
      </label>
      <label className="block">
        <span className="label">Voltar a cobrar após (dias da última cobrança)</span>
        <input className="input" type="number" name="dias_recobranca" min={1} max={90} defaultValue={recobranca} />
      </label>
      <div className="flex items-center gap-3">
        <button className="btn" disabled={pendente}>Salvar</button>
        <Mensagem estado={estado} />
      </div>
    </form>
  )
}

type Usuario = { id: number; nome: string; email: string; matricula: string | null; perfil: string; ativo: boolean }

export function FormUsuario({ usuario }: { usuario?: Usuario }) {
  const [estado, acao, pendente] = useActionState(salvarUsuario, null)
  return (
    <form action={acao} className="grid gap-2 sm:grid-cols-2">
      {usuario && <input type="hidden" name="id" value={usuario.id} />}
      <input className="input" name="nome" placeholder="Nome" defaultValue={usuario?.nome} required />
      <input
        className="input uppercase placeholder:normal-case"
        name="matricula"
        placeholder="Matrícula"
        defaultValue={usuario?.matricula ?? ''}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        required
      />
      <input className="input" type="email" name="email" placeholder="E-mail" defaultValue={usuario?.email} required />
      <select className="input" name="perfil" defaultValue={usuario?.perfil ?? 'consulta'}>
        <option value="admin">Administrador</option>
        <option value="abastecimento">Abastecimento (edita)</option>
        <option value="gerencia">Gerência (visualiza tudo)</option>
        <option value="consulta">Consulta (ordens + IA)</option>
      </select>
      <input className="input" type="password" name="senha" placeholder={usuario ? 'Nova senha (opcional)' : 'Senha inicial (mín. 8)'} autoComplete="new-password" />
      {usuario && (
        <select className="input" name="ativo" defaultValue={usuario.ativo ? 'sim' : 'nao'}>
          <option value="sim">Ativo</option>
          <option value="nao">Bloqueado</option>
        </select>
      )}
      <div className="flex items-center gap-3 sm:col-span-2">
        <button className="btn btn-primary btn-sm" disabled={pendente}>{usuario ? 'Salvar' : 'Criar usuário'}</button>
        <Mensagem estado={estado} />
      </div>
    </form>
  )
}

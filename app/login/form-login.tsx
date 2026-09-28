'use client'

import { useActionState } from 'react'
import { entrar } from '@/app/acoes'

export function FormLogin() {
  const [estado, acao, pendente] = useActionState(entrar, null)
  return (
    <form action={acao} className="space-y-4">
      <div>
        <label className="label" htmlFor="matricula">Matrícula</label>
        <input
          className="input h-11 uppercase placeholder:normal-case"
          id="matricula"
          name="matricula"
          autoComplete="username"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Ex.: CBK3574"
          required
          autoFocus
        />
      </div>
      <div>
        <label className="label" htmlFor="senha">Senha</label>
        <input className="input h-11" id="senha" name="senha" type="password" autoComplete="current-password" required />
      </div>
      {estado?.erro && <p className="rounded-lg bg-crit-soft px-3 py-2 text-sm text-crit-ink">{estado.erro}</p>}
      <button className="btn btn-primary h-11 w-full" disabled={pendente}>
        {pendente ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}

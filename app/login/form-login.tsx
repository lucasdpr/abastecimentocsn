'use client'

import { useActionState } from 'react'
import { entrar } from '@/app/acoes'

export function FormLogin() {
  const [estado, acao, pendente] = useActionState(entrar, null)
  return (
    <form action={acao} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input className="input h-11" id="email" name="email" type="email" autoComplete="username" required autoFocus />
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

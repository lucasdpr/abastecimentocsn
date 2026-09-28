'use client'

import { useActionState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { cadastrar } from '@/app/acoes'

// Mesmos rótulos de lib/auth.ts (PERFIS/PERFIS_AUTOCADASTRO) — não pode importar
// de lá porque o arquivo é "server-only". Nunca oferece Administrador aqui.
const CARGOS = [
  { valor: 'abastecimento', rotulo: 'Abastecimento', descricao: 'Edita ordens, FUP, ativação e ANTECs.' },
  { valor: 'gerencia', rotulo: 'Visualizador', descricao: 'Vê tudo, sem editar.' },
  { valor: 'consulta', rotulo: 'Técnico', descricao: 'Consulta ordens e usa o Assistente IA.' },
]

export function FormCadastro() {
  const [estado, acao, pendente] = useActionState(cadastrar, null)

  if (estado?.ok) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <CheckCircle2 className="size-10 text-good" />
        <p className="text-sm font-medium">Cadastro enviado.</p>
        <p className="text-sm text-muted">Um administrador precisa aprovar o seu acesso antes que você possa entrar.</p>
      </div>
    )
  }

  return (
    <form action={acao} className="space-y-4">
      <div>
        <label className="label" htmlFor="nome">Nome</label>
        <input className="input h-11" id="nome" name="nome" autoComplete="name" required autoFocus />
      </div>
      <div>
        <label className="label" htmlFor="matricula">Matrícula</label>
        <input
          className="input h-11 uppercase"
          id="matricula"
          name="matricula"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input className="input h-11" id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div>
        <label className="label" htmlFor="perfil">Cargo</label>
        <select className="input h-11" id="perfil" name="perfil" required defaultValue="">
          <option value="" disabled>
            Selecione…
          </option>
          {CARGOS.map((c) => (
            <option key={c.valor} value={c.valor}>
              {c.rotulo} — {c.descricao}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted">Um administrador ainda precisa aprovar o seu acesso.</p>
      </div>
      <div>
        <label className="label" htmlFor="senha">Senha</label>
        <input className="input h-11" id="senha" name="senha" type="password" autoComplete="new-password" required />
        <p className="mt-1 text-xs text-muted">Mínimo de 8 caracteres.</p>
      </div>
      {estado?.erro && <p className="rounded-lg bg-crit-soft px-3 py-2 text-sm text-crit-ink">{estado.erro}</p>}
      <button className="btn btn-primary h-11 w-full" disabled={pendente}>
        {pendente ? 'Enviando…' : 'Solicitar cadastro'}
      </button>
    </form>
  )
}

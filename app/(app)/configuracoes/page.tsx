import { FormParametros, FormSenha, FormUsuario } from '@/components/forms-config'
import { Cabecalho, Painel, Selo } from '@/components/ui'
import { exigirUsuario, PERFIS, pode, type Perfil } from '@/lib/auth'
import { configuracoes } from '@/lib/consultas'
import { query } from '@/lib/db'
import { dataHora } from '@/lib/formato'

export const metadata = { title: 'Configurações' }

export default async function PaginaConfiguracoes() {
  const usuario = await exigirUsuario()
  const admin = pode.administrar(usuario)
  const [cfg, usuarios] = await Promise.all([
    configuracoes(),
    admin
      ? query<{ id: number; nome: string; email: string; perfil: Perfil; ativo: boolean; ultimo_acesso: string | null }>(
          'select id, nome, email, perfil, ativo, ultimo_acesso from usuarios order by ativo desc, nome',
        )
      : Promise.resolve([]),
  ])

  return (
    <>
      <Cabecalho titulo="Configurações" descricao={`${usuario.nome} · ${usuario.email} · ${PERFIS[usuario.perfil]}`} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <Painel titulo="Minha senha">
            <FormSenha />
          </Painel>
          {admin && (
            <Painel titulo="Regras de alerta">
              <FormParametros dias={cfg.diasSemMovimentacao} recobranca={cfg.diasRecobranca} />
            </Painel>
          )}
        </div>
        {admin && (
          <Painel titulo="Usuários" descricao="Gerência visualiza; Abastecimento edita; Consulta vê ordens e usa a IA." className="lg:col-span-2">
            <details className="mb-4 rounded-lg border border-line">
              <summary className="cursor-pointer p-3 text-sm font-medium">+ Novo usuário</summary>
              <div className="border-t border-line p-3"><FormUsuario /></div>
            </details>
            <ul className="divide-y divide-line">
              {usuarios.map((u) => (
                <li key={u.id}>
                  <details>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 [&::-webkit-details-marker]:hidden">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{u.nome}</div>
                        <div className="truncate text-xs text-muted">{u.email} · último acesso {dataHora(u.ultimo_acesso)}</div>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        {!u.ativo && <Selo tom="critico">Bloqueado</Selo>}
                        <Selo tom="neutro" icone={false}>{PERFIS[u.perfil]}</Selo>
                      </div>
                    </summary>
                    <div className="pb-4"><FormUsuario usuario={u} /></div>
                  </details>
                </li>
              ))}
            </ul>
          </Painel>
        )}
      </div>
    </>
  )
}

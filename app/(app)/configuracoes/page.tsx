import { aprovarUsuario, recusarUsuario } from '@/app/acoes'
import { FormParametros, FormSenha, FormUsuario } from '@/components/forms-config'
import { NotificacoesPush } from '@/components/notificacoes-push'
import { Cabecalho, Painel, Selo, Vazio } from '@/components/ui'
import { exigirUsuario, PERFIS, pode, type Perfil } from '@/lib/auth'
import { configuracoes } from '@/lib/consultas'
import { query } from '@/lib/db'
import { dataHora } from '@/lib/formato'

export const metadata = { title: 'Configurações' }

type LinhaUsuario = {
  id: number
  nome: string
  email: string
  matricula: string | null
  perfil: Perfil
  ativo: boolean
  pendente_aprovacao: boolean
  ultimo_acesso: string | null
}

export default async function PaginaConfiguracoes() {
  const usuario = await exigirUsuario()
  const admin = pode.administrar(usuario)
  const [cfg, usuarios] = await Promise.all([
    configuracoes(),
    admin
      ? query<LinhaUsuario>(
          'select id, nome, email, matricula, perfil, ativo, pendente_aprovacao, ultimo_acesso from usuarios order by pendente_aprovacao desc, ativo desc, nome',
        )
      : Promise.resolve([]),
  ])
  const pendentes = usuarios.filter((u) => u.pendente_aprovacao)
  const demais = usuarios.filter((u) => !u.pendente_aprovacao)

  return (
    <>
      <Cabecalho titulo="Configurações" descricao={`${usuario.nome} · Matrícula ${usuario.matricula ?? '—'} · ${PERFIS[usuario.perfil]}`} />
      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-4">
          <Painel titulo="Minha senha">
            <FormSenha />
          </Painel>
          <Painel titulo="Notificações" descricao="Avisos direto neste aparelho, mesmo com o app fechado.">
            <NotificacoesPush />
          </Painel>
          {admin && (
            <Painel titulo="Regras de alerta">
              <FormParametros dias={cfg.diasSemMovimentacao} recobranca={cfg.diasRecobranca} />
            </Painel>
          )}
        </div>
        {admin && (
          <div className="min-w-0 space-y-4 lg:col-span-2">
            {pendentes.length > 0 && (
              <Painel titulo="Cadastros aguardando aprovação" descricao="Vieram do autocadastro; entram como Consulta." acao={<Selo tom="alerta">{pendentes.length}</Selo>}>
                <ul className="divide-y divide-line">
                  {pendentes.map((u) => (
                    <li key={u.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{u.nome}</div>
                        <div className="truncate text-xs text-muted">
                          Matrícula {u.matricula ?? '—'} · {u.email}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <form action={recusarUsuario.bind(null, u.id)}>
                          <button className="btn btn-sm">Recusar</button>
                        </form>
                        <form action={aprovarUsuario.bind(null, u.id)}>
                          <button className="btn btn-primary btn-sm">Aprovar</button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              </Painel>
            )}

            <Painel titulo="Usuários" descricao="Gerência visualiza; Abastecimento edita; Consulta vê ordens e usa a IA.">
              <details className="mb-4 rounded-lg border border-line">
                <summary className="cursor-pointer p-3 text-sm font-medium">+ Novo usuário</summary>
                <div className="border-t border-line p-3"><FormUsuario /></div>
              </details>
              {demais.length ? (
                <ul className="divide-y divide-line">
                  {demais.map((u) => (
                    <li key={u.id}>
                      <details>
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 [&::-webkit-details-marker]:hidden">
                          <div className="min-w-0">
                            <div className="text-sm font-medium">{u.nome}</div>
                            <div className="truncate text-xs text-muted">
                              Matrícula {u.matricula ?? '—'} · {u.email} · último acesso {dataHora(u.ultimo_acesso)}
                            </div>
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
              ) : (
                <Vazio texto="Nenhum outro usuário ainda." />
              )}
            </Painel>
          </div>
        )}
      </div>
    </>
  )
}

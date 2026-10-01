import Link from 'next/link'
import { headers } from 'next/headers'
import { Download } from 'lucide-react'
import { Importador } from '@/components/importador'
import { AvisoAtualizacao, Cabecalho, Painel, Selo } from '@/components/ui'
import { exigirUsuario, pode } from '@/lib/auth'
import { LISTA_BASES, BASES, type BaseId } from '@/lib/bases'
import { query } from '@/lib/db'
import { statusAtualizacao } from '@/lib/consultas'
import { PREFIXO_ROBO, tokenRobo } from '@/lib/robo'
import { dataHora, numero } from '@/lib/formato'

export const metadata = { title: 'Importar / Excel' }

export default async function PaginaImportar() {
  const usuario = await exigirUsuario(pode.editar)
  const roboLigado = !!tokenRobo()
  const historico = await query<{
    id: number; base: BaseId; arquivo: string; iniciado_em: string; linhas: number; novas: number; alteradas: number; removidas: number; status: string; usuario: string | null
  }>(
    `select i.*, u.nome as usuario from importacoes i left join usuarios u on u.id = i.usuario_id order by i.iniciado_em desc limit 20`,
  )
  const status = await statusAtualizacao()
  const h = await headers()
  const origem = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`
  const temToken = (process.env.EXPORT_TOKEN ?? '').length >= 16

  return (
    <>
      <Cabecalho titulo="Importar e exportar" descricao="Atualize o app com as exportações do SAP e leve os dados de volta para o Excel." />
      <AvisoAtualizacao
        bases={status.filter((x) => x.atrasada).map((x) => ({ nome: BASES[x.base as BaseId]?.nome ?? x.base, atualizadoEm: dataHora(x.concluido_em), diasUteis: x.diasUteis }))}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <Painel titulo="1. Importar planilha do SAP" descricao="Cole a exportação do SAP na planilha padrão (ou use o arquivo direto) e envie aqui. A tratativa feita no app é preservada.">
            <Importador />
          </Painel>

          <Painel titulo="Histórico de importações" descricao="Clique na data para ver o que mudou em cada importação." corpo="tabela">
            {historico.length ? (
              <div className="overflow-x-auto">
                <table className="tabela">
                  <thead>
                    <tr><th>Quando</th><th>Base</th><th className="text-right">Linhas</th><th className="text-right">Novas</th><th className="text-right">Mudaram</th><th className="text-right">Saíram</th><th>Por</th></tr>
                  </thead>
                  <tbody>
                    {historico.map((i) => (
                      <tr key={i.id}>
                        <td className="whitespace-nowrap">
                          <Link href={`/importar/${i.id}`} className="font-medium text-accent hover:underline" title="Ver o que mudou nesta importação">
                            {dataHora(i.iniciado_em)}
                          </Link>{' '}
                          {i.status !== 'concluida' && <Selo tom="alerta">incompleta</Selo>}
                        </td>
                        <td className="whitespace-nowrap" title={i.arquivo}>{BASES[i.base]?.nome ?? i.base}</td>
                        <td className="num text-right">{numero(i.linhas)}</td>
                        <td className="num text-right">{numero(i.novas)}</td>
                        <td className="num text-right">{numero(i.alteradas)}</td>
                        <td className="num text-right">{numero(i.removidas)}</td>
                        <td className="whitespace-nowrap text-muted">{i.usuario ?? (i.arquivo?.startsWith(PREFIXO_ROBO) ? 'Robô SAP' : '—')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-4 py-4 text-sm text-muted md:px-5">Nenhuma importação ainda.</p>
            )}
          </Painel>
        </div>

        <div className="min-w-0 space-y-4">
          <Painel titulo="2. Baixar para o Excel" descricao="Mesmas colunas da planilha original + colunas “APP” com o acompanhamento. Pode editar e reimportar.">
            <ul className="space-y-2">
              {LISTA_BASES.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2 rounded-lg border border-line p-2.5">
                  <span className="text-sm">{b.nome}</span>
                  <span className="flex gap-1.5">
                    <a className="btn btn-sm" href={`/api/exportar/${b.id}`}><Download className="size-3.5" /> xlsx</a>
                    <a className="btn btn-sm" href={`/api/exportar/${b.id}?formato=csv`}>csv</a>
                  </span>
                </li>
              ))}
            </ul>
          </Painel>

          <Painel titulo="3. Excel conectado (atualização automática)" descricao="Para o Excel puxar os dados do app sem baixar arquivo.">
            {temToken ? (
              <ol className="list-decimal space-y-2 pl-4 text-sm text-ink-2">
                <li>No Excel: <b>Dados › Obter Dados › Da Web</b>.</li>
                <li>
                  Cole o endereço (troque <code>ordens</code> pela base desejada):
                  <code className="mt-1 block rounded bg-surface-2 p-2 text-xs break-all">{origem}/api/exportar/ordens?formato=csv&amp;token=SEU_TOKEN</code>
                </li>
                <li>O token é o valor de <code>EXPORT_TOKEN</code> configurado no Vercel. Trate como senha.</li>
                <li>Depois é só clicar em <b>Atualizar tudo</b> para trazer a versão mais recente.</li>
              </ol>
            ) : (
              <p className="text-sm text-muted">Configure a variável <code>EXPORT_TOKEN</code> (mínimo 16 caracteres) no Vercel para habilitar.</p>
            )}
          </Painel>

          <Painel titulo="4. Robô do SAP" descricao="Exporta do SAP no PC da equipe e envia direto para cá. Cada envio aparece no histórico como “Robô SAP”.">
            {!roboLigado ? (
              <p className="text-sm text-muted">
                Desligado. Para ligar, crie a variável <code>ROBO_TOKEN</code> na Vercel (uma senha longa, 24+ caracteres) e publique de novo.
              </p>
            ) : pode.administrar(usuario) ? (
              <div className="space-y-3 text-sm text-ink-2">
                <p>Ligado. Robôs disponíveis:</p>
                <a className="btn w-full justify-between" href="/api/robo/script">
                  <span>IW38 (cadastro das ordens)</span>
                  <Download className="size-4" />
                </a>
                <p className="text-xs text-muted">O arquivo baixado já vem com a chave do robô: guarde só no PC que roda o SAP.</p>
              </div>
            ) : (
              <p className="text-sm text-muted">Ligado. Só o administrador baixa o robô.</p>
            )}
          </Painel>
        </div>
      </div>
    </>
  )
}

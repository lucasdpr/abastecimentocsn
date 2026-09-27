import Link from 'next/link'
import { ArrowRight, Plus } from 'lucide-react'
import { avancarAntec } from '@/app/acoes'
import { FormAntec } from '@/components/form-antec'
import { Cabecalho, Kpi, Selo, Vazio } from '@/components/ui'
import { exigirUsuario, pode } from '@/lib/auth'
import { listarAntecs, prazoAntec, type Antec } from '@/lib/consultas'
import { data, numero } from '@/lib/formato'

export const metadata = { title: 'ANTECs' }

const STATUS: Record<Antec['status'], string> = {
  recebida: 'Recebida pela Central',
  com_area: 'Com a área',
  em_aprovacao: 'Em aprovação',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
}
const PROXIMA: Partial<Record<Antec['status'], string>> = {
  recebida: 'Enviar à área',
  com_area: 'Área retornou',
  em_aprovacao: 'Concluir',
}

export default async function PaginaAntec() {
  const usuario = await exigirUsuario(pode.verGestao)
  const antecs = await listarAntecs()
  const editar = pode.editar(usuario)
  const abertas = antecs.filter((a) => a.status !== 'concluida' && a.status !== 'cancelada')
  const atrasadas = abertas.filter((a) => prazoAntec(a)?.atrasada)

  return (
    <>
      <Cabecalho titulo="ANTECs" descricao="Central tem 1 dia útil para encaminhar ao ponto focal; a área tem 4 dias úteis para analisar e retornar." />
      <div className="mb-4 grid grid-cols-3 gap-3">
        <Kpi rotulo="Em andamento" valor={numero(abertas.length)} />
        <Kpi rotulo="Fora do prazo" valor={numero(atrasadas.length)} tom={atrasadas.length ? 'critico' : undefined} />
        <Kpi rotulo="Com a área" valor={numero(abertas.filter((a) => a.status === 'com_area').length)} />
      </div>

      {editar && (
        <details className="card mb-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 p-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
            <Plus className="size-4" /> Nova ANTEC
          </summary>
          <div className="border-t border-line p-4">
            <FormAntec />
          </div>
        </details>
      )}

      {!antecs.length ? (
        <Vazio texto="Nenhuma ANTEC registrada." />
      ) : (
        <ul className="space-y-2">
          {antecs.map((a) => {
            const prazo = prazoAntec(a)
            return (
              <li key={a.id} className="card">
                <details>
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-2 p-3.5 md:p-4 [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="num text-sm font-semibold">ANTEC {a.numero}</span>
                        <Selo tom={a.status === 'concluida' ? 'bom' : a.status === 'cancelada' ? 'neutro' : 'info'} icone={false}>{STATUS[a.status]}</Selo>
                        {prazo && (
                          <Selo tom={prazo.atrasada ? 'critico' : prazo.usados >= prazo.limite ? 'alerta' : 'neutro'}>
                            {prazo.etapa}: {prazo.usados}/{prazo.limite} dia(s) útil(eis)
                          </Selo>
                        )}
                      </div>
                      <div className="num mt-1 flex flex-wrap gap-x-3 text-xs text-muted">
                        {a.ordem && <Link className="text-accent hover:underline" href={`/ordens/${a.ordem}`}>OM {a.ordem}</Link>}
                        {a.po && <span>PO {a.po}</span>}
                        {a.area && <span>{a.area}</span>}
                        {a.ponto_focal && <span>{a.ponto_focal}</span>}
                        <span>Recebida {data(a.recebida_em)}</span>
                      </div>
                      {a.descricao && <p className="mt-1 truncate text-sm text-ink-2">{a.descricao}</p>}
                    </div>
                  </summary>
                  {editar && (
                    <div className="border-t border-line p-4">
                      {PROXIMA[a.status] && (
                        <form action={avancarAntec.bind(null, a.id)} className="mb-4">
                          <button className="btn btn-primary btn-sm">{PROXIMA[a.status]} <ArrowRight className="size-3.5" /></button>
                        </form>
                      )}
                      <FormAntec antec={a} />
                    </div>
                  )}
                </details>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

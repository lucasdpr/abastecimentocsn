import Link from 'next/link'
import { ArrowRight, CalendarX, CircleCheckBig, FileClock, Hourglass, PackageX, Repeat } from 'lucide-react'
import { SeloSituacao, StatusSap } from '@/components/selos'
import { Cabecalho, Kpi, Painel } from '@/components/ui'
import { exigirUsuario, pode } from '@/lib/auth'
import { alertas, prazoAntec, responsaveisGrupos, type OrdemResumo, type ResponsavelGrupo } from '@/lib/consultas'
import { data, dataHora, dias, moedaCurta, nomeCurto, numero } from '@/lib/formato'

export const metadata = { title: 'Cobranças' }

/** Cada lista mostra só o topo (o mais urgente); o resto fica no filtro correspondente. */
const LIMITE = 10

/** O filtro de destino pode ter critério mais amplo que a lista (ex.: vencidas sem a folga de 7 dias), então não promete o mesmo número. */
function VerTodas({ href, total, destino }: { href: string; total: number; destino: string }) {
  if (total <= LIMITE) return null
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs md:px-5">
      <span className="text-muted">
        Mostrando {LIMITE} de {numero(total)}, as mais urgentes primeiro
      </span>
      <Link href={href} className="inline-flex items-center gap-1 font-medium text-accent hover:underline">
        Abrir em {destino} <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </div>
  )
}

function TabelaOrdens({ ordens, detalhe, cabecalhoDetalhe, resp }: { resp: Map<string, ResponsavelGrupo>; ordens: OrdemResumo[]; detalhe: (o: OrdemResumo) => React.ReactNode; cabecalhoDetalhe: string }) {
  return (
    <>
      {/* Mobile */}
      <ul className="divide-y divide-line md:hidden">
        {ordens.slice(0, LIMITE).map((o) => (
          <li key={o.ordem}>
            <Link href={`/ordens/${o.ordem}`} className="block px-4 py-3 active:bg-surface-2">
              <div className="flex items-center justify-between gap-2">
                <span className="codigo text-sm font-semibold">{o.ordem}</span>
                <SeloSituacao situacao={o.situacao} />
              </div>
              <div className="truncate text-sm text-ink-2">{o.texto_ordem ?? '—'}</div>
              <div className="mt-1 text-xs text-muted">{detalhe(o)}</div>
            </Link>
          </li>
        ))}
      </ul>
      {/* Desktop */}
      <div className="hidden overflow-x-auto md:block">
        <table className="tabela">
          <thead>
            <tr>
              <th>Ordem</th>
              <th>Descrição</th>
              <th>Status SAP</th>
              <th>{cabecalhoDetalhe}</th>
              <th className="text-right" title="Itens abertos / total">Itens</th>
              <th>Acompanhamento</th>
            </tr>
          </thead>
          <tbody>
            {ordens.slice(0, LIMITE).map((o) => (
              <tr key={o.ordem}>
                <td>
                  <Link href={`/ordens/${o.ordem}`} className="codigo font-medium text-accent hover:underline">
                    {o.ordem}
                  </Link>
                  <div className="mt-0.5 text-xs text-muted">
                    {o.grp_planejamento}
                    {resp.get(o.grp_planejamento ?? '')?.abastecimento && <> · {nomeCurto(resp.get(o.grp_planejamento ?? '')?.abastecimento)}</>}
                  </div>
                </td>
                <td className="w-full max-w-0 min-w-40">
                  <div className="truncate" title={o.texto_ordem ?? undefined}>{o.texto_ordem ?? '—'}</div>
                  <div className="truncate text-xs text-muted">{o.local_instalacao}</div>
                </td>
                <td>
                  <StatusSap usuario={o.status_usuario} sistema={o.status_sistema} />
                </td>
                <td className="num text-sm whitespace-nowrap text-ink-2">{detalhe(o)}</td>
                <td className="num text-right">
                  {o.itens_abertos}
                  <span className="text-muted">/{o.itens}</span>
                </td>
                <td>
                  <SeloSituacao situacao={o.situacao} />
                  {o.setor_responsavel && <div className="mt-1 text-xs text-muted">{o.setor_responsavel}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default async function PaginaAlertas() {
  await exigirUsuario(pode.verGestao)
  const [a, resp] = await Promise.all([alertas(), responsaveisGrupos()])

  const secoes = [
    { id: 'paradas', titulo: `Sem movimentação há ${a.cfg.diasSemMovimentacao}+ dias`, total: a.paradas.length, tom: 'critico' as const, icone: Hourglass },
    { id: 'recobrar', titulo: 'Cobradas sem resposta', total: a.recobrar.length, tom: 'alerta' as const, icone: Repeat },
    { id: 'vencidas', titulo: 'Necessidade vencida há 7+ dias', total: a.vencidas.length, tom: 'alerta' as const, icone: CalendarX },
    { id: 'antecs', titulo: 'ANTECs fora do prazo', total: a.antecsAtrasadas.length, tom: 'critico' as const, icone: FileClock },
    { id: 'cancelaveis', titulo: 'Pedidos para cancelar/prorrogar', total: a.totalCancelaveis, tom: 'alerta' as const, icone: PackageX },
  ]
  const emDia = secoes.filter((s) => !s.total)
  const temAlgo = secoes.some((s) => s.total)

  return (
    <>
      <Cabecalho
        titulo="Cobranças"
        descricao={`O que precisa ser cobrado hoje. Uma ordem volta para esta lista ${a.cfg.diasRecobranca} dias após a última cobrança se nada mudar.`}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {secoes.map((s) => (
          <Kpi
            key={s.id}
            rotulo={s.titulo}
            valor={numero(s.total)}
            icone={s.icone}
            tom={s.total ? s.tom : undefined}
            href={s.total ? `#${s.id}` : undefined}
            detalhe={s.total ? 'Ver lista' : <span className="inline-flex items-center gap-1 text-good-ink"><CircleCheckBig className="size-3" aria-hidden /> Em dia</span>}
            // No celular, o que está em dia vira uma linha só (abaixo) em vez de ocupar a tela inteira.
            className={s.total ? undefined : 'hidden md:block'}
          />
        ))}
      </div>

      {temAlgo && emDia.length > 0 && (
        <p className="-mt-3 mb-5 flex items-start gap-2 px-1 text-xs text-muted md:hidden">
          <CircleCheckBig className="mt-px size-3.5 shrink-0 text-good-ink" aria-hidden />
          <span>Em dia: {emDia.map((s) => s.titulo).join(' · ')}</span>
        </p>
      )}

      {!temAlgo && (
        <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-good-soft text-good-ink">
            <CircleCheckBig className="size-6" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-semibold">Nada para cobrar hoje</h2>
            <p className="mt-1 text-sm text-muted">Todas as ordens, ANTECs e pedidos estão dentro das regras de alerta.</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {a.paradas.length > 0 && (
          <Painel
            id="paradas"
            corpo="tabela"
            titulo={`Sem movimentação há ${a.cfg.diasSemMovimentacao}+ dias`}
            descricao={`${numero(a.paradas.length)} ordens sem nenhuma mudança no SAP. Cobre o setor responsável — as mais antigas primeiro.`}
          >
            <TabelaOrdens
              resp={resp}
              ordens={a.paradas}
              cabecalhoDetalhe="Parada há"
              detalhe={(o) => `${dias(o.dias_parada)}${o.cobrancas ? ` · ${o.cobrancas} cobrança(s)` : ''}`}
            />
            <VerTodas href="/ordens?filtro=paradas" total={a.paradas.length} destino="Ordens" />
          </Painel>
        )}

        {a.recobrar.length > 0 && (
          <Painel id="recobrar" corpo="tabela" titulo="Cobradas sem resposta" descricao={`Cobradas há mais de ${a.cfg.diasRecobranca} dias e ainda abertas.`}>
            <TabelaOrdens resp={resp} ordens={a.recobrar} cabecalhoDetalhe="Última cobrança" detalhe={(o) => dataHora(o.ultima_cobranca_em)} />
            <VerTodas href="/ordens?filtro=cobradas" total={a.recobrar.length} destino="Ordens" />
          </Painel>
        )}

        {a.vencidas.length > 0 && (
          <Painel id="vencidas" corpo="tabela" titulo="Necessidade vencida há mais de 7 dias" descricao={`${numero(a.vencidas.length)} ordens com itens abertos e data de necessidade no passado.`}>
            <TabelaOrdens resp={resp} ordens={a.vencidas} cabecalhoDetalhe="Necessidade" detalhe={(o) => data(o.necessidade_mais_antiga)} />
            <VerTodas href="/ordens?filtro=vencidas" total={a.vencidas.length} destino="Ordens" />
          </Painel>
        )}

        {a.antecsAtrasadas.length > 0 && (
          <Painel id="antecs" corpo="tabela" titulo="ANTECs fora do prazo" descricao="Central: 1 dia útil para enviar · Área: 4 dias úteis para retornar.">
            <ul className="divide-y divide-line">
              {a.antecsAtrasadas.map((x) => {
                const p = prazoAntec(x)!
                return (
                  <li key={x.id} className="px-4 py-3 text-sm md:px-5">
                    <Link href="/antec" className="font-semibold hover:underline">ANTEC {x.numero}</Link>
                    <div className="text-xs text-muted">
                      Com {p.etapa === 'Central' ? 'a Central' : `a área${x.area ? ` (${x.area})` : ''}`} há {p.usados} dias úteis (limite {p.limite})
                      {x.ordem ? ` · OM ${x.ordem}` : ''}
                    </div>
                  </li>
                )
              })}
            </ul>
          </Painel>
        )}

        {a.cancelaveis.length > 0 && (
          <Painel id="cancelaveis" corpo="tabela" titulo="Pedidos elegíveis a cancelar/prorrogar" descricao="FUP cobrado 3+ vezes sem resposta do fornecedor (acima de R$ 500 mil só com de acordo).">
            <ul className="divide-y divide-line">
              {a.cancelaveis.slice(0, LIMITE).map((f) => (
                <li key={f.po_item} className="px-4 py-3 text-sm md:px-5">
                  <div className="flex justify-between gap-3">
                    <span className="codigo font-semibold">PO {f.po}/{f.item_po}</span>
                    <span className="num font-medium">{moedaCurta(f.valor)}</span>
                  </div>
                  <div className="truncate text-ink-2">{f.descricao}</div>
                  <div className="text-xs text-muted">{f.fornecedor} · {f.cobrancas} cobranças{Number(f.valor) > 500000 ? ' · exige de acordo do fornecedor' : ''}</div>
                </li>
              ))}
            </ul>
            <VerTodas href="/fup?retorno=cancelavel" total={a.totalCancelaveis} destino="Follow-up" />
          </Painel>
        )}
      </div>
    </>
  )
}

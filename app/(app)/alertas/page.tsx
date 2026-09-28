import Link from 'next/link'
import { SeloSituacao } from '@/components/selos'
import { Cabecalho, Painel, Selo, Vazio } from '@/components/ui'
import { exigirUsuario, pode } from '@/lib/auth'
import { alertas, prazoAntec, type OrdemResumo } from '@/lib/consultas'
import { data, dataHora, dias, moedaCurta, numero } from '@/lib/formato'

export const metadata = { title: 'Cobranças' }

function ListaOrdens({ ordens, detalhe }: { ordens: OrdemResumo[]; detalhe: (o: OrdemResumo) => React.ReactNode }) {
  if (!ordens.length) return <Vazio texto="Nada pendente aqui. 👍" />
  return (
    <ul className="divide-y divide-line">
      {ordens.map((o) => (
        <li key={o.ordem}>
          <Link href={`/ordens/${o.ordem}`} className="-mx-2 flex items-start justify-between gap-3 rounded-lg px-2 py-3 hover:bg-surface-2">
            <div className="min-w-0">
              <div className="num text-sm font-semibold">OM {o.ordem}</div>
              <div className="truncate text-sm text-ink-2">{o.texto_ordem ?? '—'}</div>
              <div className="mt-1 text-xs text-muted">{detalhe(o)}</div>
            </div>
            <SeloSituacao situacao={o.situacao} />
          </Link>
        </li>
      ))}
    </ul>
  )
}

export default async function PaginaAlertas() {
  await exigirUsuario(pode.verGestao)
  const a = await alertas()
  return (
    <>
      <Cabecalho
        titulo="Cobranças"
        descricao={`O que precisa ser cobrado hoje. Uma ordem volta para esta lista ${a.cfg.diasRecobranca} dias após a última cobrança se nada mudar.`}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Painel
          titulo={`Sem movimentação há ${a.cfg.diasSemMovimentacao}+ dias`}
          descricao="Nenhuma mudança no SAP desde então. Cobre o setor responsável."
          acao={<Selo tom={a.paradas.length ? 'critico' : 'bom'}>{numero(a.paradas.length)}</Selo>}
        >
          <ListaOrdens
            ordens={a.paradas}
            detalhe={(o) => `Parada há ${dias(o.dias_parada)} · ${o.itens_abertos} itens abertos${o.cobrancas ? ` · ${o.cobrancas} cobrança(s)` : ''}`}
          />
        </Painel>

        <div className="space-y-4">
          <Painel titulo="Cobradas sem resposta" descricao={`Cobradas há mais de ${a.cfg.diasRecobranca} dias e ainda abertas.`} acao={<Selo tom={a.recobrar.length ? 'alerta' : 'bom'}>{numero(a.recobrar.length)}</Selo>}>
            <ListaOrdens ordens={a.recobrar} detalhe={(o) => `Última cobrança ${dataHora(o.ultima_cobranca_em)}${o.setor_responsavel ? ` · ${o.setor_responsavel}` : ''}`} />
          </Painel>

          <Painel titulo="ANTECs fora do prazo" descricao="Central: 1 dia útil para enviar · Área: 4 dias úteis para retornar." acao={<Selo tom={a.antecsAtrasadas.length ? 'critico' : 'bom'}>{numero(a.antecsAtrasadas.length)}</Selo>}>
            {a.antecsAtrasadas.length ? (
              <ul className="divide-y divide-line">
                {a.antecsAtrasadas.map((x) => {
                  const p = prazoAntec(x)!
                  return (
                    <li key={x.id} className="py-3 text-sm">
                      <Link href="/antec" className="font-semibold hover:underline">ANTEC {x.numero}</Link>
                      <div className="text-xs text-muted">
                        Com {p.etapa === 'Central' ? 'a Central' : `a área${x.area ? ` (${x.area})` : ''}`} há {p.usados} dias úteis (limite {p.limite})
                        {x.ordem ? ` · OM ${x.ordem}` : ''}
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <Vazio texto="Todas as ANTECs dentro do prazo." />
            )}
          </Painel>
        </div>

        <Painel titulo="Necessidade vencida há mais de 7 dias" descricao="Itens ainda abertos com data de necessidade no passado." acao={<Selo tom={a.vencidas.length ? 'alerta' : 'bom'}>{numero(a.vencidas.length)}</Selo>}>
          <ListaOrdens ordens={a.vencidas} detalhe={(o) => `Necessidade ${data(o.necessidade_mais_antiga)} · ${o.itens_abertos} itens abertos`} />
        </Painel>

        <Painel titulo="Pedidos elegíveis a cancelar/prorrogar" descricao="FUP cobrado 3+ vezes sem resposta do fornecedor (acima de R$ 500 mil só com de acordo)." acao={<Selo tom="info">{numero(a.cancelaveis.length)}</Selo>}>
          {a.cancelaveis.length ? (
            <ul className="divide-y divide-line">
              {a.cancelaveis.map((f) => (
                <li key={f.po_item} className="py-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="codigo font-semibold">PO {f.po}/{f.item_po}</span>
                    <span className="num font-medium">{moedaCurta(f.valor)}</span>
                  </div>
                  <div className="truncate text-ink-2">{f.descricao}</div>
                  <div className="text-xs text-muted">{f.fornecedor} · {f.cobrancas} cobranças{Number(f.valor) > 500000 ? ' · exige de acordo do fornecedor' : ''}</div>
                </li>
              ))}
            </ul>
          ) : (
            <Vazio texto="Nenhum pedido com 3+ cobranças sem retorno." />
          )}
        </Painel>
      </div>
    </>
  )
}

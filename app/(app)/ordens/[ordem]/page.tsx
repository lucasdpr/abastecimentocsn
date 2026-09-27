import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { FormAcompanhamento } from '@/components/form-acompanhamento'
import { SeloParada, SeloSituacao } from '@/components/selos'
import { Painel, Selo, Vazio } from '@/components/ui'
import { exigirUsuario, pode } from '@/lib/auth'
import { configuracoes, detalheOrdem } from '@/lib/consultas'
import { data, dataHora, moeda, numero } from '@/lib/formato'

type Item = {
  reserva: string
  item: string
  material: string | null
  descricao: string | null
  qtd: string | null
  unidade: string | null
  qtd_retirada: string | null
  data_necessidade: string | null
  status_item: string | null
  status_aprovacao: string | null
  eliminado: boolean
  preco_medio: string | null
  removido_em: string | null
}

function seloItem(i: Item) {
  if (i.eliminado || i.status_item === 'ELIMINADO') return <Selo tom="neutro" icone={false}>Eliminado</Selo>
  if (i.status_item === 'RETIRADO') return <Selo tom="bom">Retirado</Selo>
  if (i.status_item === 'PARCIAL') return <Selo tom="alerta">Parcial</Selo>
  return <Selo tom="info">{i.status_item ?? 'Em aberto'}</Selo>
}

export async function generateMetadata({ params }: { params: Promise<{ ordem: string }> }) {
  return { title: `OM ${(await params).ordem}` }
}

export default async function PaginaOrdem({ params }: { params: Promise<{ ordem: string }> }) {
  const usuario = await exigirUsuario()
  const { ordem } = await params
  const [d, cfg] = await Promise.all([detalheOrdem(decodeURIComponent(ordem)), configuracoes()])
  if (!d.resumo) notFound()
  const o = d.resumo
  const itens = d.itens as Item[]

  return (
    <>
      <Link href="/ordens" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Ordens
      </Link>
      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="num text-xl font-semibold md:text-2xl">OM {o.ordem}</h1>
          <SeloParada diasParada={o.dias_parada} limite={cfg.diasSemMovimentacao} abertos={o.itens_abertos} />
          <SeloSituacao situacao={o.situacao} />
        </div>
        <p className="mt-1 text-sm text-ink-2">{o.texto_ordem}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="card grid grid-cols-2 gap-4 p-4 text-sm md:grid-cols-4">
            <Info rotulo="Itens abertos" valor={`${o.itens_abertos} de ${o.itens}`} />
            <Info rotulo="Valor (preço médio)" valor={moeda(o.valor)} />
            <Info rotulo="Necessidade mais antiga" valor={data(o.necessidade_mais_antiga)} />
            <Info rotulo="Última mudança no SAP" valor={data(o.ultima_mudanca_em)} />
            <Info rotulo="Grupo planejamento" valor={o.grp_planejamento ?? '—'} />
            <Info rotulo="Local de instalação" valor={o.local_instalacao ?? '—'} className="col-span-2 md:col-span-3" />
            <Info rotulo="Status usuário" valor={o.status_usuario ?? '—'} className="col-span-2" />
            <Info rotulo="Status sistema" valor={o.status_sistema ?? '—'} className="col-span-2" />
          </section>

          <Painel titulo="Itens de material" descricao={`${itens.length} itens na reserva`}>
            <ul className="divide-y divide-line">
              {itens.map((i) => (
                <li key={`${i.reserva}-${i.item}`} className={`py-3 ${i.eliminado ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{i.descricao ?? '—'}</div>
                      <div className="num mt-0.5 text-xs text-muted">
                        Mat. {i.material} · Reserva {i.reserva}/{i.item} · Nec. {data(i.data_necessidade)}
                      </div>
                    </div>
                    {seloItem(i)}
                  </div>
                  <div className="num mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
                    <span>Qtd {numero(i.qtd)} {i.unidade}</span>
                    <span>Retirado {numero(i.qtd_retirada)}</span>
                    {i.status_aprovacao && <span>Aprovação: {i.status_aprovacao}</span>}
                    {i.preco_medio && <span>{moeda(Number(i.preco_medio) * Number(i.qtd ?? 0))}</span>}
                    {i.removido_em && <span className="text-warn-ink">Fora do último relatório</span>}
                  </div>
                </li>
              ))}
            </ul>
          </Painel>

          {d.pedidos.length > 0 && (
            <Painel titulo="Pedidos de compra (ativação)">
              <ul className="divide-y divide-line">
                {d.pedidos.map((p, idx) => (
                  <li key={idx} className="py-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium">{p.descricao}</div>
                        <div className="num text-xs text-muted">PO {p.po}/{p.item_po} · RM {p.rm}/{p.item_rm} · {p.fornecedor}</div>
                      </div>
                      <Selo tom={/atraso/i.test(p.status_po ?? '') ? 'critico' : /entregue/i.test(p.status_po ?? '') ? 'bom' : 'neutro'}>{p.status_po ?? 'Sem status'}</Selo>
                    </div>
                    <div className="mt-1 text-xs text-ink-2">Remessa {data(p.data_remessa)}{p.email ? ` · ${p.email}` : ''}</div>
                  </li>
                ))}
              </ul>
            </Painel>
          )}
        </div>

        <div className="space-y-4">
          {pode.editar(usuario) ? (
            <Painel titulo="Acompanhamento da Central" descricao={o.cobrancas ? `${o.cobrancas} cobrança(s) · última em ${dataHora(o.ultima_cobranca_em)}` : 'Nenhuma cobrança registrada.'}>
              <FormAcompanhamento ordem={o.ordem} situacao={o.situacao} setor={o.setor_responsavel} observacao={o.observacao} />
            </Painel>
          ) : (
            <Painel titulo="Acompanhamento da Central">
              <div className="space-y-2 text-sm">
                <SeloSituacao situacao={o.situacao} />
                {o.setor_responsavel && <p>Setor: {o.setor_responsavel}</p>}
                {o.observacao && <p className="text-ink-2">{o.observacao}</p>}
                {o.ultima_cobranca_em && <p className="text-xs text-muted">Última cobrança: {dataHora(o.ultima_cobranca_em)}</p>}
              </div>
            </Painel>
          )}

          <Painel titulo="Histórico">
            {d.eventos.length ? (
              <ol className="space-y-3">
                {d.eventos.map((e, idx) => (
                  <li key={idx} className="border-l-2 border-line pl-3 text-sm">
                    <div>{e.descricao}</div>
                    <div className="text-xs text-muted">{dataHora(e.criado_em)}{e.usuario ? ` · ${e.usuario}` : ' · importação SAP'}</div>
                  </li>
                ))}
              </ol>
            ) : (
              <Vazio texto="Sem eventos ainda. Mudanças aparecem aqui a cada importação." />
            )}
          </Painel>
        </div>
      </div>
    </>
  )
}

function Info({ rotulo, valor, className }: { rotulo: string; valor: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="text-xs text-muted">{rotulo}</div>
      <div className="num mt-0.5 font-medium break-words">{valor}</div>
    </div>
  )
}

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, Upload } from 'lucide-react'
import { GraficoRetornoSemanal } from '@/components/graficos'
import { Barras, Cabecalho, Kpi, Painel, Vazio } from '@/components/ui'
import { exigirUsuario, pode } from '@/lib/auth'
import { painel } from '@/lib/consultas'
import { dataHora, moedaCurta, numero, pct } from '@/lib/formato'

export const metadata = { title: 'Painel' }

const NOME_BASE: Record<string, string> = { ordens: 'Ordens', fup: 'Follow-up', ativacao: 'Ativação', reservas: 'Reservas' }

export default async function PaginaPainel() {
  const usuario = await exigirUsuario()
  if (!pode.verGestao(usuario)) redirect('/ordens')
  const d = await painel()
  const o = d.ordensResumo!
  const f = d.fupResumo!
  const semDados = o.total === 0 && f.itens === 0

  return (
    <>
      <Cabecalho
        titulo="Painel"
        descricao="Visão geral da carteira de manutenção acompanhada pela Central."
        acoes={
          pode.editar(usuario) && (
            <Link href="/importar" className="btn">
              <Upload className="size-4" /> Atualizar dados
            </Link>
          )
        }
      />

      {semDados && (
        <div className="mb-5">
          <Vazio
            texto="Nenhuma planilha importada ainda. Importe as exportações do SAP para ver o painel."
            acao={pode.editar(usuario) && <Link href="/importar" className="btn btn-primary">Importar planilhas</Link>}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi rotulo="Ordens em aberto" valor={numero(o.abertas)} detalhe={`${numero(o.itens_abertos)} itens pendentes`} href="/ordens" />
        <Kpi
          rotulo={`Sem movimentação ≥ ${d.cfg.diasSemMovimentacao}d`}
          valor={numero(o.paradas)}
          detalhe="Precisam de cobrança"
          tom={o.paradas ? 'critico' : undefined}
          href="/alertas"
        />
        <Kpi rotulo="Necessidade vencida" valor={numero(o.vencidas)} detalhe="Ordens com data passada" tom={o.vencidas ? 'alerta' : undefined} href="/ordens?filtro=vencidas" />
        <Kpi
          rotulo="Carteira em FUP"
          valor={moedaCurta(f.total)}
          detalhe={`${pct(f.com_retorno, f.total).toLocaleString('pt-BR')}% com retorno`}
          href="/fup"
        />
        <Kpi
          rotulo="ANTECs fora do prazo"
          valor={numero(d.antecs.atrasadas)}
          detalhe={`${numero(d.antecs.abertas)} em andamento`}
          tom={d.antecs.atrasadas ? 'critico' : undefined}
          href="/antec"
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Painel className="lg:col-span-2" titulo="Retorno dos fornecedores por semana de ativação" descricao="Valor corrigido dos pedidos ativados no follow-up.">
          {d.fupSemanas.length ? (
            <GraficoRetornoSemanal dados={d.fupSemanas.map((s) => ({ semana: s.semana, com_retorno: Number(s.com_retorno), sem_retorno: Number(s.sem_retorno) }))} />
          ) : (
            <Vazio texto="Importe a planilha de FUP para ver este gráfico." />
          )}
        </Painel>
        <Painel titulo="FUP por responsável" descricao="Com quem está a pendência (valor).">
          <Barras
            itens={d.fupResponsavel.map((r) => ({ rotulo: r.responsavel, valor: Number(r.valor), detalhe: `${r.itens} itens`, href: `/fup?responsavel=${encodeURIComponent(r.responsavel)}` }))}
            formatar={moedaCurta}
          />
        </Painel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Painel titulo="Ordens abertas por tempo parado" descricao="Dias desde a última mudança detectada no SAP.">
          <Barras
            itens={['0–14 dias', '15–29 dias', '30–59 dias', '60+ dias'].map((faixa) => ({
              rotulo: faixa,
              valor: d.faixas.find((x) => x.faixa === faixa)?.ordens ?? 0,
            }))}
            formatar={(v) => `${numero(v)} ordens`}
          />
        </Painel>
        <Painel titulo="Ordens abertas por grupo de planejamento">
          <Barras itens={d.grupos.map((g) => ({ rotulo: g.grupo, valor: g.abertas, href: `/ordens?grupo=${encodeURIComponent(g.grupo)}` }))} formatar={(v) => numero(v)} />
        </Painel>
        <Painel titulo="Follow-up em números">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-muted">Itens em atraso</dt>
              <dd className="mt-1 text-lg font-semibold">{numero(f.atraso)}</dd>
              <dd className="text-xs text-muted">{moedaCurta(f.valor_atraso)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Sem retorno</dt>
              <dd className="mt-1 text-lg font-semibold">{moedaCurta(Number(f.total) - Number(f.com_retorno))}</dd>
              <dd className="text-xs text-muted">{pct(Number(f.total) - Number(f.com_retorno), f.total).toLocaleString('pt-BR')}% da carteira</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-muted">Elegíveis a cancelar/prorrogar</dt>
              <dd className="mt-1 flex items-center justify-between">
                <span className="text-lg font-semibold">{numero(f.eleg_cancelamento)}</span>
                <Link href="/fup?retorno=cancelavel" className="flex items-center gap-1 text-xs font-medium text-accent">
                  Ver lista <ArrowRight className="size-3" />
                </Link>
              </dd>
              <dd className="text-xs text-muted">3 ou mais cobranças sem resposta do fornecedor.</dd>
            </div>
          </dl>
        </Painel>
      </div>

      <p className="mt-6 text-xs text-muted">
        Última atualização:{' '}
        {d.importacoes.length
          ? d.importacoes.map((i) => `${NOME_BASE[i.base] ?? i.base} ${dataHora(i.concluido_em)}`).join(' · ')
          : 'nenhuma importação'}
      </p>
    </>
  )
}

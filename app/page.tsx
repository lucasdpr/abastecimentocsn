'use client'

import { useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bell,
  Bot,
  Boxes,
  Check,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  FileText,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  PackageCheck,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Truck,
  Wrench,
  X,
} from 'lucide-react'

type View = 'Visão geral' | 'Assistente OMS' | 'Solicitações' | 'Estoque' | 'Aprovações' | 'Relatórios'

const nav: { label: View; icon: typeof LayoutDashboard }[] = [
  { label: 'Visão geral', icon: LayoutDashboard },
  { label: 'Assistente OMS', icon: MessageSquareText },
  { label: 'Solicitações', icon: ClipboardCheck },
  { label: 'Estoque', icon: Boxes },
  { label: 'Aprovações', icon: ShieldCheck },
  { label: 'Relatórios', icon: FileText },
]

const initialMessages = [
  { role: 'assistant', text: 'Olá, Rafael. Sou o Assistente da Central de Abastecimento OMS. Para iniciar, informe a **OM** e o equipamento relacionado à demanda.' },
  { role: 'user', text: 'Preciso de um jogo de vedações para o molde de lingotamento.' },
  { role: 'assistant', text: 'Entendido. Para manter o fluxo oficial, preciso da **OM ou equipamento** antes de levantar os itens. Qual é o número da OM?' },
]

const requests = [
  { id: 'REQ-24091', om: 'OM 45021876', item: 'Jogo de vedações hidráulicas', qty: '2 CJ', status: 'Aguardando aprovação', tone: 'amber', age: 'Hoje, 08:42' },
  { id: 'REQ-24087', om: 'OM 45021734', item: 'Parafuso sextavado M24', qty: '16 UN', status: 'Disponível para retirada', tone: 'green', age: 'Ontem, 16:20' },
  { id: 'REQ-24081', om: 'OM 45021698', item: 'Óleo hidráulico ISO 68', qty: '60 L', status: 'Em compra', tone: 'blue', age: 'Ontem, 14:05' },
  { id: 'REQ-24074', om: 'OM 45021602', item: 'Segmento de molde CC-04', qty: '1 UN', status: 'Em reparo', tone: 'purple', age: '12/09/2026' },
]

const stock = [
  { code: 'MOL-VD-084', name: 'Vedação hidráulica 84 mm', className: 'Sobressalente', pl33: 18, area: 2, state: 'Seguro' },
  { code: 'FER-CH-024', name: 'Chave combinada 24 mm', className: 'Ferramenta', pl33: 4, area: 0, state: 'Atenção' },
  { code: 'INS-OH-068', name: 'Óleo hidráulico ISO 68', className: 'Insumo', pl33: 120, area: 32, state: 'Seguro' },
  { code: 'MOL-SG-004', name: 'Segmento de molde CC-04', className: 'Reparável', pl33: 0, area: 0, state: 'Reparo geral' },
]

function StatusBadge({ children, tone = 'gray' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`status-badge ${tone}`}><span className="status-dot" />{children}</span>
}

function MetricCard({ label, value, detail, icon: Icon, tone }: { label: string; value: string; detail: string; icon: typeof Activity; tone: string }) {
  return <div className="metric-card">
    <div className={`metric-icon ${tone}`}><Icon /></div>
    <div className="metric-copy"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
    <ArrowUpRight className="metric-arrow" />
  </div>
}

export default function Page() {
  const [view, setView] = useState<View>('Visão geral')
  const [messages, setMessages] = useState(initialMessages)
  const [draft, setDraft] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [filter, setFilter] = useState('Todos')

  const filteredRequests = useMemo(() => filter === 'Todos' ? requests : requests.filter((item) => item.status.includes(filter)), [filter])

  function sendMessage() {
    const value = draft.trim()
    if (!value) return
    setMessages((current) => [...current, { role: 'user', text: value }, { role: 'assistant', text: 'Vou validar essa demanda no fluxo oficial. Primeiro, confirme o número da **OM** e o equipamento para que eu possa continuar.' }])
    setDraft('')
  }

  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Wrench /></div><div><strong>OMS<span>•</span>Central</strong><small>Abastecimento de Manutenção</small></div><button className="mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Fechar menu"><X /></button></div>
      <div className="scope"><span className="scope-dot" /><div><b>Oficina de Moldes e Segmentos</b><small>Unidade Volta Redonda · PL33</small></div><ChevronDown /></div>
      <nav className="nav-list" aria-label="Navegação principal">
        <span className="nav-label">OPERAÇÃO</span>
        {nav.slice(0, 4).map(({ label, icon: Icon }) => <button key={label} onClick={() => { setView(label); setSidebarOpen(false) }} className={`nav-item ${view === label ? 'active' : ''}`}><Icon /><span>{label}</span>{label === 'Solicitações' && <em>12</em>}</button>)}
        <span className="nav-label second">GOVERNANÇA</span>
        {nav.slice(4).map(({ label, icon: Icon }) => <button key={label} onClick={() => { setView(label); setSidebarOpen(false) }} className={`nav-item ${view === label ? 'active' : ''}`}><Icon /><span>{label}</span>{label === 'Aprovações' && <em className="alert-count">4</em>}</button>)}
      </nav>
      <div className="sidebar-foot"><div className="central-status"><span className="pulse" /><div><b>Central operacional</b><small>Última atualização há 2 min</small></div></div><div className="user-mini"><div className="avatar">RS</div><div><b>Rafael Santos</b><small>Mecânico · OMS</small></div><Settings /></div></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu"><Menu /></button><div className="breadcrumb"><span>OMS Central</span><span>/</span><b>{view}</b></div><div className="top-actions"><button className="icon-button" aria-label="Buscar"><Search /></button><button className="icon-button notification" aria-label="Notificações"><Bell /><i /></button><div className="top-avatar">RS</div></div></header>
      {view === 'Assistente OMS' ? <ChatView messages={messages} draft={draft} setDraft={setDraft} sendMessage={sendMessage} /> : <>
        <div className="page-heading"><div><p className="eyebrow">Quarta-feira, 25 de setembro de 2026</p><h1>{view === 'Visão geral' ? 'Bom dia, Rafael.' : view}</h1><p className="subtitle">{view === 'Visão geral' ? 'Acompanhe o abastecimento e as demandas da sua oficina.' : 'Acompanhe e gerencie o fluxo oficial da Central de Abastecimento.'}</p></div><button className="primary-button" onClick={() => setView('Assistente OMS')}><MessageSquareText /> Nova solicitação</button></div>
        {view === 'Visão geral' && <Dashboard filter={filter} setFilter={setFilter} filteredRequests={filteredRequests} setView={setView} />}
        {view === 'Solicitações' && <RequestsView filter={filter} setFilter={setFilter} filteredRequests={filteredRequests} />}
        {view === 'Estoque' && <StockView />}
        {view === 'Aprovações' && <ApprovalsView />}
        {view === 'Relatórios' && <ReportsView />}
      </>}
    </main>
  </div>
}

function Dashboard({ filter, setFilter, filteredRequests, setView }: { filter: string; setFilter: (v: string) => void; filteredRequests: typeof requests; setView: (v: View) => void }) {
  return <div className="content-grid">
    <section className="metrics"><MetricCard label="Valor em aberto" value="R$ 284,6 mil" detail="↑ 8,4% vs. mês anterior" icon={BarChart3} tone="navy" /><MetricCard label="Carteira em atraso" value="18,7%" detail="↓ 2,1 p.p. nos últimos 30 dias" icon={Clock3} tone="amber" /><MetricCard label="Solicitações ativas" value="42" detail="12 aguardando aprovação" icon={ClipboardCheck} tone="blue" /><MetricCard label="ANTEC em andamento" value="08" detail="Prazo médio: 2,4 dias" icon={Activity} tone="green" /></section>
    <section className="panel portfolio-panel"><div className="panel-head"><div><h2>Carteira de abastecimento</h2><p>RM / RC / PO por status do processo</p></div><button className="text-button">Ver carteira completa <ArrowUpRight /></button></div><div className="portfolio-body"><div className="donut-wrap"><div className="donut"><div><strong>R$ 284,6k</strong><span>total aberto</span></div></div><div className="legend"><span><i className="dot navy" />RM <b>54%</b></span><span><i className="dot blue" />RC <b>31%</b></span><span><i className="dot yellow" />PO <b>15%</b></span></div></div><div className="bars"><div className="bar-row"><span>RM · Requisição de material</span><b>R$ 153,8k</b><div className="bar-track"><i style={{ width: '78%' }} /></div><small>24 processos</small></div><div className="bar-row"><span>RC · Requisição de compra</span><b>R$ 88,2k</b><div className="bar-track"><i className="blue-bar" style={{ width: '54%' }} /></div><small>11 processos</small></div><div className="bar-row"><span>PO · Pedido de compra</span><b>R$ 42,6k</b><div className="bar-track"><i className="yellow-bar" style={{ width: '31%' }} /></div><small>07 processos</small></div></div></div></section>
    <section className="panel requests-panel"><div className="panel-head"><div><h2>Solicitações recentes</h2><p>Últimas movimentações da OMS</p></div><div className="panel-actions"><div className="filter-tabs">{['Todos', 'Aguardando', 'Em compra'].map((item) => <button key={item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div><button className="text-button" onClick={() => setView('Solicitações')}>Ver todas <ArrowUpRight /></button></div></div><RequestTable rows={filteredRequests} /></section>
    <aside className="right-column"><section className="panel alerts-panel"><div className="panel-head"><div><h2>Pontos de atenção</h2><p>Requerem acompanhamento</p></div><AlertTriangle className="warning-icon" /></div><div className="alert-list"><div className="alert-row"><div className="alert-symbol amber"><Clock3 /></div><div><b>4 aprovações pendentes</b><span>Fluxo GDOP / G / GG / D</span></div><ArrowUpRight /></div><div className="alert-row"><div className="alert-symbol red"><AlertTriangle /></div><div><b>2 itens em ruptura</b><span>Sem saldo na PL33 ou área</span></div><ArrowUpRight /></div><div className="alert-row"><div className="alert-symbol blue"><Truck /></div><div><b>3 ANTEC vencendo</b><span>Retorno da área até amanhã</span></div><ArrowUpRight /></div></div></section><section className="panel shortcut-panel"><div className="shortcut-icon"><Bot /></div><div><h2>Precisa solicitar um material?</h2><p>O Assistente OMS orienta você em cada etapa.</p><button className="text-button" onClick={() => setView('Assistente OMS')}>Iniciar conversa <ArrowUpRight /></button></div></section></aside>
  </div>
}

function RequestTable({ rows }: { rows: typeof requests }) { return <div className="table-wrap"><table><thead><tr><th>Solicitação</th><th>Item principal</th><th>Quantidade</th><th>Status</th><th>Atualização</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><b>{row.id}</b><span>{row.om}</span></td><td>{row.item}</td><td>{row.qty}</td><td><StatusBadge tone={row.tone}>{row.status}</StatusBadge></td><td className="muted">{row.age}</td><td><button className="row-action" aria-label={`Abrir ${row.id}`}><ArrowUpRight /></button></td></tr>)}</tbody></table></div> }
function RequestsView({ filter, setFilter, filteredRequests }: { filter: string; setFilter: (v: string) => void; filteredRequests: typeof requests }) { return <section className="panel full-panel"><div className="panel-head"><div><h2>Carteira de solicitações</h2><p>Fluxo centralizado de materiais, ferramentas e insumos.</p></div><div className="filter-tabs">{['Todos', 'Aguardando', 'Em compra'].map((item) => <button key={item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div></div><RequestTable rows={filteredRequests} /></section> }
function StockView() { return <section className="panel full-panel"><div className="panel-head"><div><h2>Consulta de estoque</h2><p>Saldos oficiais PL33 e área · atualização em tempo real</p></div><button className="secondary-button"><Plus /> Registrar movimentação</button></div><div className="stock-summary"><div><span>Itens cadastrados</span><b>1.284</b></div><div><span>Saldo comprometido</span><b>R$ 96,4k</b></div><div><span>Itens em atenção</span><b className="amber-text">17</b></div></div><div className="table-wrap"><table><thead><tr><th>Código</th><th>Descrição</th><th>Classe</th><th>PL33</th><th>Área</th><th>Situação</th></tr></thead><tbody>{stock.map((item) => <tr key={item.code}><td><b>{item.code}</b></td><td>{item.name}</td><td>{item.className}</td><td>{item.pl33} {item.pl33 === 0 && <span className="critical">crítico</span>}</td><td>{item.area}</td><td><StatusBadge tone={item.state === 'Seguro' ? 'green' : item.state === 'Atenção' ? 'amber' : 'purple'}>{item.state}</StatusBadge></td></tr>)}</tbody></table></div></section> }
function ApprovalsView() { return <section className="panel full-panel"><div className="panel-head"><div><h2>Aprovações pendentes</h2><p>Valide as solicitações conforme o fluxo de governança.</p></div><span className="approval-progress">12 de 16 concluídas</span></div><div className="approval-list">{[['REQ-24091', 'Jogo de vedações hidráulicas', 'OM 45021876', 'GG'], ['REQ-24083', 'Bucha de bronze especial', 'OM 45021710', 'GDOP'], ['REQ-24078', 'Segmento de molde CC-04', 'OM 45021698', 'D']].map(([id, item, om, level]) => <div className="approval-row" key={id}><div className="approval-level">{level}</div><div className="approval-info"><b>{id} · {item}</b><span>{om} · Solicitado pela OMS em 24/09</span></div><StatusBadge tone="amber">Aguardando {level}</StatusBadge><div className="approval-buttons"><button className="approve"><Check /> Aprovar</button><button className="reject"><X /> Rejeitar</button></div></div>)}</div></section> }
function ReportsView() { return <section className="panel full-panel"><div className="panel-head"><div><h2>Relatórios operacionais</h2><p>Extraia informações para DEPRO, GMPA e acompanhamento da Central.</p></div><button className="primary-button"><FileText /> Novo relatório</button></div><div className="report-grid">{[['Report DEPRO', 'Reparo Geral · materiais em atraso', 'Atualizado hoje, 08:00'], ['Lista de RG', 'Itens enviados pela área usuária', 'Atualizado ontem, 16:40'], ['FUP da carteira', 'Atrasos, retornos e status por unidade', 'Atualizado hoje, 07:30']].map(([title, desc, date]) => <div className="report-card" key={title}><div className="report-icon"><FileText /></div><div><b>{title}</b><p>{desc}</p><small>{date}</small></div><button aria-label={`Exportar ${title}`}><ArrowUpRight /></button></div>)}</div></section> }

function ChatView({ messages, draft, setDraft, sendMessage }: { messages: typeof initialMessages; draft: string; setDraft: (v: string) => void; sendMessage: () => void }) { return <div className="chat-layout"><section className="chat-panel"><div className="chat-header"><div className="bot-avatar"><Bot /></div><div><h2>Assistente OMS</h2><p><span className="online-dot" /> Central de Abastecimento · online</p></div><button className="icon-button"><Settings /></button></div><div className="stepper"><div className="step active"><b>1</b><span>Identificação</span></div><div className="step"><b>2</b><span>Itens</span></div><div className="step"><b>3</b><span>Direcionamento</span></div><div className="step"><b>4</b><span>Confirmação</span></div></div><div className="messages">{messages.map((message, index) => <div className={`message-row ${message.role}`} key={index}>{message.role === 'assistant' && <div className="message-avatar"><Bot /></div>}<div className="message-bubble">{message.text.split('**').map((part, i) => i % 2 ? <strong key={i}>{part}</strong> : part)}</div><small>{index === messages.length - 1 ? 'agora' : '09:1' + index}</small></div>)}</div><div className="chat-composer"><textarea value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) { e.preventDefault(); sendMessage() } }} placeholder="Descreva o material que você precisa..." aria-label="Mensagem para o Assistente OMS" /><button className="send-button" onClick={sendMessage} aria-label="Enviar mensagem"><Send /></button><div className="composer-hint">Enter para enviar · Shift + Enter para nova linha</div></div></section><aside className="chat-side"><div className="panel context-card"><div className="panel-head"><div><h2>Regras do fluxo</h2><p>O assistente sempre valida</p></div><ShieldCheck className="shield-icon" /></div><ul><li><Check /> OM ou equipamento válido</li><li><Check /> Item da classe de manutenção</li><li><Check /> Saldo oficial PL33 e área</li><li><Check /> Aprovações GDOP / G / GG / D</li></ul></div><div className="panel context-card"><div className="panel-head"><div><h2>Atalhos rápidos</h2><p>Comece por uma opção</p></div></div><button className="quick-action" onClick={() => setDraft('Quero consultar uma OM')}><Search /> Consultar uma OM</button><button className="quick-action" onClick={() => setDraft('Preciso solicitar um material')}><PackageCheck /> Solicitar material</button><button className="quick-action" onClick={() => setDraft('Quero consultar o estoque')}><Boxes /> Consultar estoque</button></div></aside></div> }


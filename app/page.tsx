'use client'

import { useMemo, useState } from 'react'
import type { ChatMessage } from '@/lib/oms-system-prompt'
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  UserRound,
  User,
  Shield,
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
  LogIn,
  Menu,
  MessageSquareText,
  PackageCheck,
  Plus,
  Search,
  Send,
  CircleDollarSign,
  Download,
  Filter,
  TrendingUp,
  Users,
  LogOut,
  Settings,
  ShieldCheck,
  Truck,
  Wrench,
  X,
} from 'lucide-react'

type View = 'Visão geral' | 'Assistente OMS' | 'Ordens de Manutenção' | 'Solicitações' | 'Follow-Up (FUP)' | 'Estoque' | 'Aprovações' | 'Relatórios'

type UserProfile = { name: string; email: string; role: string }

const fupOrders = [
  { material: '8019764', description: 'RESFRIADOR KAWASAKI 3114621031', po: '4500098214', item: '10', supplier: 'Kawasaki Heavy Industries', date: '18/09/2026', owner: 'Fornecedor', return: 'Não', status: 'Atraso', value: 1562705.03 },
  { material: '1671352', description: 'PLACA NIPPON STEEL B354714 01 ATE 03', po: '4500097988', item: '20', supplier: 'Nippon Steel', date: '25/09/2026', owner: 'Tratado', return: 'Sim', status: 'No Prazo', value: 1715081.58 },
  { material: '9412785', description: 'MANIPULADOR BARDELLA CSNVAI7002', po: '4500097551', item: '10', supplier: 'Bardella S.A.', date: '12/08/2026', owner: 'Fornecedor', return: 'Não', status: 'Atraso', value: 822500 },
  { material: '8127604', description: 'COMPRESSOR NITROGENIO 203 M3/H', po: '4500097440', item: '30', supplier: 'Atlas Copco', date: '30/09/2026', owner: 'GPMA', return: 'Sim', status: 'No Prazo', value: 1117456.30 },
  { material: '8614519', description: 'ROTOR KAWASAKI 3112561021', po: '4500097312', item: '10', supplier: 'Kawasaki Heavy Industries', date: '05/09/2026', owner: 'Central', return: 'Sim', status: 'Atraso', value: 1155383.54 },
]

const nav: { label: View; icon: typeof LayoutDashboard }[] = [
  { label: 'Visão geral', icon: LayoutDashboard },
  { label: 'Assistente OMS', icon: MessageSquareText },
  { label: 'Ordens de Manutenção', icon: Wrench },
  { label: 'Solicitações', icon: ClipboardCheck },
  { label: 'Follow-Up (FUP)', icon: TrendingUp },
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

const portfolioItems = [
  { code: '8019764', description: 'RESFRIADOR KAWASAKI 3114621031 1 ATE 5', location: 'OG CONVERSOR A', stage: 'Pedido', value: 1562705.03 },
  { code: '8019764', description: 'RESFRIADOR KAWASAKI 3114621031 1 ATE 5', location: 'OG CONVERSOR A', stage: 'Tratar reserva', value: 776664.40 },
  { code: '1671352', description: 'PLACA NIPPON STEEL B354714 01 ATE 03', location: 'Sem identificação', stage: 'Pedido', value: 1715081.58 },
  { code: '9412785', description: 'MANIPULADOR BARDELLA CSNVAI7002', location: 'CARRO DISTRIBUIDOR # 1 MCC # 4', stage: 'Pedido', value: 822500.00 },
  { code: '9412785', description: 'MANIPULADOR BARDELLA CSNVAI7002', location: 'CARRO DISTRIBUIDOR # 2 MCC # 4', stage: 'Pedido', value: 822500.00 },
  { code: '8127604', description: 'COMPRESSOR NITROGENIO 203 M3/H SEM MOTOR', location: 'INJECAO NITROGENIO E ARGONIO (KGC)', stage: 'Pedido', value: 1117456.30 },
  { code: '8127604', description: 'COMPRESSOR NITROGENIO 203 M3/H SEM MOTOR', location: 'INJECAO NITROGENIO E ARGONIO (KGC)', stage: 'Requisição', value: 429520.46 },
  { code: '8614519', description: 'ROTOR KAWASAKI 3112561021 11, 20', location: 'EXAUSTÃO DE PÓ - BAG HOUSE 1', stage: 'Em estoque', value: 1155383.54 },
  { code: '8008938', description: 'COMPRESSOR ARGONIO 144,7M3/H 125HP', location: 'INJECAO NITROGENIO E ARGONIO (KGC)', stage: 'Requisição', value: 1124114.42 },
  { code: '1223082', description: 'SAIA KAWASAKI 3114611001', location: 'OG CONVERSOR C', stage: 'Pedido', value: 1018750.00 },
  { code: '8518447', description: 'FREIO ELETROM 2 SAP 250VCC 1245,00KGF.M', location: 'PONTE ROLANTE 183-ALA VAZAM', stage: 'Pedido', value: 802853.54 },
  { code: '9575750', description: 'BLOCO REXROTH 054306001 60 ATE 136', location: 'ESCUMADOR LESTE', stage: 'Requisição', value: 400000.00 },
  { code: '9575750', description: 'BLOCO REXROTH 054306001 60 ATE 136', location: 'ESCUMADOR OESTE', stage: 'Requisição', value: 400000.00 },
  { code: '1728871', description: 'PLACA NIPPON STEEL B354715 01, 02', location: 'Sem identificação', stage: 'Pedido', value: 738827.44 },
]

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

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
  const [isAuthenticated, setIsAuthenticated] = useState(() => typeof window !== 'undefined' && window.localStorage.getItem('oms_session') === 'active')
  const [user, setUser] = useState<UserProfile>(() => { if (typeof window !== 'undefined') { try { return JSON.parse(window.localStorage.getItem('oms_user') || '') } catch {} } return { name: 'Rafael', email: '', role: 'Mecânico' } })
  const profile = user.role
  const [view, setView] = useState<View>('Visão geral')
  const [messages, setMessages] = useState(initialMessages)
  const [draft, setDraft] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [filter, setFilter] = useState('Todos')

  const filteredRequests = useMemo(() => filter === 'Todos' ? requests : requests.filter((item) => item.status.includes(filter)), [filter])

  function enterSystem(nextUser: UserProfile = user) {
    document.cookie = 'oms_session=active; path=/; max-age=86400'
    window.localStorage.setItem('oms_session', 'active')
    window.localStorage.setItem('oms_user', JSON.stringify(nextUser))
    setUser(nextUser)
    setIsAuthenticated(true)
  }

  function leaveSystem() {
    document.cookie = 'oms_session=; path=/; max-age=0'
    window.localStorage.removeItem('oms_session')
    window.localStorage.removeItem('oms_user')
    setIsAuthenticated(false)
  }

  async function sendMessage() {
    const value = draft.trim()
    if (!value) return
    const nextMessages = [...messages, { role: 'user', text: value }]
    setMessages([...nextMessages, { role: 'assistant', text: 'Validando no fluxo oficial da Central...' }])
    setDraft('')
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: nextMessages.map((item) => ({ role: item.role, content: item.text })) satisfies ChatMessage[] }) })
      const data = await response.json()
      setMessages([...nextMessages, { role: 'assistant', text: data.message ?? 'Não foi possível validar a demanda.' }])
    } catch {
      setMessages([...nextMessages, { role: 'assistant', text: 'Não foi possível conectar ao Assistente. Confirme a **OM** e tente novamente.' }])
    }
  }

  if (!isAuthenticated) return <LoginGate onEnter={enterSystem} />

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
      <div className="sidebar-foot"><div className="central-status"><span className="pulse" /><div><b>Central operacional</b><small>Última atualização há 2 min</small></div></div><div className="user-mini"><div className="avatar">{(user?.name || 'R').slice(0, 1).toUpperCase()}</div><div><b>{user?.name || 'Rafael'}</b><small>{profile} · OMS</small></div><button className="logout-button" onClick={leaveSystem} aria-label="Trocar de conta ou sair">Trocar conta / Sair</button><Settings /></div></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu"><Menu /></button><div className="breadcrumb"><span>OMS Central</span><span>/</span><b>{view}</b></div><div className="top-actions"><button className="switch-button" onClick={leaveSystem}><LogIn /> Ir para Login</button><button className="icon-button" aria-label="Buscar"><Search /></button><button className="icon-button notification" aria-label="Notificações"><Bell /><i /></button><div className="top-avatar">{(user?.name || 'R').slice(0, 1).toUpperCase()}</div></div></header>
      {view === 'Assistente OMS' ? <ChatView messages={messages} draft={draft} setDraft={setDraft} sendMessage={sendMessage} /> : <>
        <div className="page-heading"><div><p className="eyebrow">Quarta-feira, 25 de setembro de 2026</p><h1>{view === 'Visão geral' ? `Bom dia, ${user?.name || 'Rafael'}.` : view}</h1><p className="subtitle">{view === 'Visão geral' ? 'Acompanhe o abastecimento e as demandas da sua oficina.' : 'Acompanhe e gerencie o fluxo oficial da Central de Abastecimento.'}</p></div><button className="primary-button" onClick={() => setView('Assistente OMS')}><MessageSquareText /> Nova solicitação</button></div>
        {view === 'Visão geral' && <Dashboard filter={filter} setFilter={setFilter} filteredRequests={filteredRequests} setView={setView} />}
        {view === 'Solicitações' && <RequestsView filter={filter} setFilter={setFilter} filteredRequests={filteredRequests} />}
        {view === 'Follow-Up (FUP)' && <FupView />}
        {view === 'Estoque' && <StockView />}
        {view === 'Aprovações' && <ApprovalsView />}
        {view === 'Relatórios' && <ReportsView />}
      </>}
    </main>
  </div>
}

function LoginGate({ onEnter }: { onEnter: (value?: UserProfile) => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [profile, setProfile] = useState('Mecânico')
  const profiles = [{ label: 'Mecânico', icon: Wrench }, { label: 'Analista', icon: UserRound }, { label: 'Admin', icon: Shield }]

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const displayName = name.trim() || 'Rafael'
    onEnter({ name: displayName, email: '', role: profile })
  }

  return <main className="auth-page">
    <section className="auth-visual">
      <div className="auth-visual-top"><div className="brand-mark"><Wrench /></div><div><strong>OMS<span>•</span>Central</strong><small>Abastecimento de Manutenção</small></div></div>
      <div className="auth-visual-copy"><span className="auth-badge"><span /> Sistema de Abastecimento Industrial</span><h1>Decisões críticas.<br /><em>Fluxo sob controle.</em></h1><p>A central única para materiais, aprovações e rastreabilidade da Oficina de Moldes e Segmentos.</p></div>
      <div className="auth-stat-card"><div className="stat-orb"><TrendingUp /></div><div><small>Carteira FUP monitorada</small><strong>R$ 251,1M</strong><span><ArrowUpRight /> +12,8% este mês</span></div></div>
      <div className="auth-grid-lines" />
      <small className="auth-visual-foot">CSN · UNIDADE VOLTA REDONDA · PL33</small>
    </section>
    <section className="auth-form-side"><button className="auth-quick-nav" onClick={() => onEnter({ name: 'Demonstração', email: '', role: 'Mecânico' })}><LayoutDashboard /> Ir para Dashboard</button><div className="auth-card"><div className="auth-card-head"><div className="auth-icon"><ShieldCheck /></div><p className="eyebrow">Central de Abastecimento · OMS</p><h2>{mode === 'login' ? 'Acesso ao sistema' : 'Crie seu acesso'}</h2><p>{mode === 'login' ? 'Entre para acompanhar o abastecimento da sua oficina.' : 'Configure seu perfil para começar a operar.'}</p></div><div className="auth-tabs"><button type="button" className={mode === 'login' ? 'selected' : ''} onClick={() => setMode('login')}>Entrar</button><button type="button" className={mode === 'signup' ? 'selected' : ''} onClick={() => setMode('signup')}>Criar conta</button></div><form onSubmit={submit}>{mode === 'signup' && <label><span>Seu nome completo</span><div className="input-icon"><User /><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Rafael Silva" required /></div></label>}<label><span>E-mail corporativo</span><input type="email" placeholder="seu.nome@csn.com.br" required /></label><label><span>Senha</span><input type="password" placeholder="••••••••" minLength={6} required /></label><div><span className="field-caption">Perfil de acesso</span><div className="profile-chips">{profiles.map(({ label, icon: Icon }) => <button type="button" key={label} className={profile === label ? 'selected' : ''} onClick={() => setProfile(label)}><Icon />{label}</button>)}</div></div><button className="auth-submit" type="submit">Entrar no Sistema <ArrowUpRight /></button></form><button className="guest-link" onClick={() => onEnter({ name: 'Demonstração', email: '', role: 'Mecânico' })}>Acessar como Convidado / Modos de Demonstração</button><small className="auth-note">Acesso protegido · Oficina de Moldes e Segmentos · PL33</small></div></section>
  </main>
}

function Dashboard({ filter, setFilter, filteredRequests, setView }: { filter: string; setFilter: (v: string) => void; filteredRequests: typeof requests; setView: (v: View) => void }) {
  return <div className="content-grid">
    <section className="metrics"><MetricCard label="Valor total em aberto" value="R$ 12,89 mi" detail="Carteira real CSN · 14 itens" icon={BarChart3} tone="navy" /><MetricCard label="Itens na carteira" value="14" detail="8 em Pedido · 4 em Requisição" icon={ClipboardCheck} tone="amber" /><MetricCard label="Maior concentração" value="Pedido" detail="R$ 8,60 mi · 66,7% da carteira" icon={Activity} tone="blue" /><MetricCard label="Em estoque" value="R$ 1,15 mi" detail="1 item disponível" icon={PackageCheck} tone="green" /></section>
    <section className="analytics-grid"><div className="panel chart-panel"><div className="panel-head"><div><h2>Evolução mensal da carteira</h2><p>RM / RC / PO · valores em milhares de R$</p></div><span className="chart-period">2026</span></div><div className="stacked-chart"><div className="y-axis"><span>2.000</span><span>1.500</span><span>1.000</span><span>500</span><span>0</span></div><div className="chart-area"><div className="grid-lines"><i /><i /><i /><i /><i /></div><div className="chart-bars">{[['Abr', '54', '30', '16'], ['Mai', '48', '34', '18'], ['Jun', '62', '23', '15'], ['Jul', '57', '27', '16'], ['Ago', '68', '21', '11'], ['Set', '67', '18', '15']].map(([month, rm, rc, po]) => <div className="month-bar" key={month}><div className="stack"><i style={{ height: `${rm}%` }} /><i className="bar-rc" style={{ height: `${rc}%` }} /><i className="bar-po" style={{ height: `${po}%` }} /></div><span>{month}</span></div>)}</div></div></div><div className="chart-legend"><span><i className="dot navy" />RM</span><span><i className="dot blue" />RC</span><span><i className="dot yellow" />PO</span></div></div><div className="panel chart-panel status-chart"><div className="panel-head"><div><h2>Distribuição por status</h2><p>Itens ativos na carteira</p></div></div><div className="status-chart-body"><div className="donut pro-donut"><div><strong>14</strong><span>itens</span></div></div><div className="chart-legend vertical"><span><i className="dot navy" />Pedido <b>8</b></span><span><i className="dot blue" />Requisição <b>4</b></span><span><i className="dot green-dot" />Em estoque <b>1</b></span><span><i className="dot yellow" />Tratar reserva <b>1</b></span></div></div></div><div className="panel chart-panel trend-chart"><div className="panel-head"><div><h2>Aprovações e lead time</h2><p>Tendência semanal de atendimento</p></div><span className="trend-value">2,4 dias</span></div><div className="line-chart"><svg viewBox="0 0 500 120" role="img" aria-label="Tendência de aprovações e lead time"><path className="line-fill" d="M0 92 C55 75 70 82 105 65 S170 70 210 48 S275 65 315 35 S390 42 430 24 S470 32 500 10 V120 H0 Z" /><path className="line-path" d="M0 92 C55 75 70 82 105 65 S170 70 210 48 S275 65 315 35 S390 42 430 24 S470 32 500 10" /></svg><div className="line-labels"><span>Sem 1</span><span>Sem 2</span><span>Sem 3</span><span>Sem 4</span><span>Sem 5</span><span>Sem 6</span></div></div></div></section>
    <section className="panel portfolio-panel"><div className="panel-head"><div><h2>Carteira de abastecimento</h2><p>R$ 12.886.356,71 distribuídos por etapa do processo</p></div><button className="text-button">14 itens registrados <ArrowUpRight /></button></div><div className="portfolio-body"><div className="donut-wrap"><div className="donut"><div><strong>R$ 12,89 mi</strong><span>total em aberto</span></div></div><div className="legend"><span><i className="dot navy" />Pedido <b>66,7%</b></span><span><i className="dot blue" />Requisição <b>18,3%</b></span><span><i className="dot yellow" />Estoque / reserva <b>15,0%</b></span></div></div><div className="bars"><div className="bar-row"><span>Pedido</span><b>R$ 8.600.673,89</b><div className="bar-track"><i style={{ width: '100%' }} /></div><small>8 itens</small></div><div className="bar-row"><span>Requisição</span><b>R$ 2.353.634,88</b><div className="bar-track"><i className="blue-bar" style={{ width: '27%' }} /></div><small>4 itens</small></div><div className="bar-row"><span>Em estoque</span><b>R$ 1.155.383,54</b><div className="bar-track"><i className="yellow-bar" style={{ width: '13%' }} /></div><small>1 item</small></div><div className="bar-row"><span>Tratar reserva</span><b>R$ 776.664,40</b><div className="bar-track"><i className="yellow-bar" style={{ width: '9%' }} /></div><small>1 item</small></div></div></div></section>
    <section className="panel requests-panel"><div className="panel-head"><div><h2>Itens da carteira</h2><p>Materiais reais carregados da carteira CSN · valores em aberto</p></div><span className="approval-progress">14 registros</span></div><div className="table-wrap"><table><thead><tr><th>Material</th><th>Descrição</th><th>Local</th><th>Etapa</th><th>Valor</th></tr></thead><tbody>{portfolioItems.map((item, index) => <tr key={`${item.code}-${item.stage}-${index}`}><td><b>{item.code}</b></td><td>{item.description}</td><td className="muted">{item.location}</td><td><StatusBadge tone={item.stage === 'Pedido' ? 'blue' : item.stage === 'Requisição' ? 'amber' : item.stage === 'Em estoque' ? 'green' : 'purple'}>{item.stage}</StatusBadge></td><td><b>{currency.format(item.value)}</b></td></tr>)}</tbody></table></div></section>
    <section className="panel requests-panel"><div className="panel-head"><div><h2>Solicitações recentes</h2><p>Últimas movimentações da OMS</p></div><div className="panel-actions"><div className="filter-tabs">{['Todos', 'Aguardando', 'Em compra'].map((item) => <button key={item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div><button className="text-button" onClick={() => setView('Solicitações')}>Ver todas <ArrowUpRight /></button></div></div><RequestTable rows={filteredRequests} /></section>
    <aside className="right-column"><section className="panel alerts-panel"><div className="panel-head"><div><h2>Pontos de atenção</h2><p>Requerem acompanhamento</p></div><AlertTriangle className="warning-icon" /></div><div className="alert-list"><div className="alert-row"><div className="alert-symbol amber"><Clock3 /></div><div><b>4 aprovações pendentes</b><span>Fluxo GDOP / G / GG / D</span></div><ArrowUpRight /></div><div className="alert-row"><div className="alert-symbol red"><AlertTriangle /></div><div><b>2 itens em ruptura</b><span>Sem saldo na PL33 ou área</span></div><ArrowUpRight /></div><div className="alert-row"><div className="alert-symbol blue"><Truck /></div><div><b>3 ANTEC vencendo</b><span>Retorno da área até amanhã</span></div><ArrowUpRight /></div></div></section><section className="panel shortcut-panel"><div className="shortcut-icon"><Bot /></div><div><h2>Precisa solicitar um material?</h2><p>O Assistente OMS orienta você em cada etapa.</p><button className="text-button" onClick={() => setView('Assistente OMS')}>Iniciar conversa <ArrowUpRight /></button></div></section></aside>
  </div>
}

function RequestTable({ rows }: { rows: typeof requests }) { return <div className="table-wrap"><table><thead><tr><th>Solicitação</th><th>Item principal</th><th>Quantidade</th><th>Status</th><th>Atualização</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><b>{row.id}</b><span>{row.om}</span></td><td>{row.item}</td><td>{row.qty}</td><td><StatusBadge tone={row.tone}>{row.status}</StatusBadge></td><td className="muted">{row.age}</td><td><button className="row-action" aria-label={`Abrir ${row.id}`}><ArrowUpRight /></button></td></tr>)}</tbody></table></div> }
function FupView() {
  const total = fupOrders.reduce((sum, item) => sum + item.value, 0)
  const withReturn = fupOrders.filter((item) => item.return === 'Sim').reduce((sum, item) => sum + item.value, 0)
  const overdue = fupOrders.filter((item) => item.status === 'Atraso').reduce((sum, item) => sum + item.value, 0)
  return <section className="fup-view">
    <div className="fup-kpis"><MetricCard label="Carteira FUP" value={currency.format(total)} detail="Ordens de compra acompanhadas" icon={BarChart3} tone="navy" /><MetricCard label="Com retorno" value={currency.format(withReturn)} detail="Fornecedores com retorno registrado" icon={Check} tone="green" /><MetricCard label="Em atraso" value={currency.format(overdue)} detail={`${Math.round((overdue / total) * 100)}% do valor acompanhado`} icon={AlertTriangle} tone="amber" /></div>
    <section className="panel full-panel"><div className="panel-head"><div><h2>Follow-Up de materiais</h2><p>Carteira carregada do Dashboard FUP · atualização em 16/09/2026</p></div><div className="panel-actions"><StatusBadge tone="blue">6 ordens acompanhadas</StatusBadge><button className="secondary-button"><Download /> Exportar CSV</button></div></div><div className="fup-summary"><div><span>Total</span><b>{currency.format(total)}</b></div><div><span>Com retorno</span><b className="green-text">{currency.format(withReturn)}</b></div><div><span>Sem retorno</span><b className="amber-text">{currency.format(total - withReturn)}</b></div></div><div className="table-wrap"><table><thead><tr><th>Material</th><th>Descrição</th><th>Pedido</th><th>Fornecedor</th><th>Prazo</th><th>Retorno</th><th>Valor</th></tr></thead><tbody>{fupOrders.map((item) => <tr key={item.po}><td><b>{item.material}</b><span>Item {item.item}</span></td><td>{item.description}</td><td>{item.po}</td><td>{item.supplier}</td><td>{item.date}</td><td><StatusBadge tone={item.return === 'Sim' ? 'green' : 'amber'}>{item.status}</StatusBadge></td><td><b>{currency.format(item.value)}</b></td></tr>)}</tbody></table></div></section>
  </section>
}

function RequestsView({ filter, setFilter, filteredRequests }: { filter: string; setFilter: (v: string) => void; filteredRequests: typeof requests }) { return <section className="panel full-panel"><div className="panel-head"><div><h2>Carteira de solicitações</h2><p>Fluxo centralizado de materiais, ferramentas e insumos.</p></div><div className="filter-tabs">{['Todos', 'Aguardando', 'Em compra'].map((item) => <button key={item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div></div><RequestTable rows={filteredRequests} /></section> }
function StockView() { return <section className="panel full-panel"><div className="panel-head"><div><h2>Consulta de estoque</h2><p>Saldos oficiais PL33 e área · atualização em tempo real</p></div><button className="secondary-button"><Plus /> Registrar movimentação</button></div><div className="stock-summary"><div><span>Itens cadastrados</span><b>1.284</b></div><div><span>Saldo comprometido</span><b>R$ 96,4k</b></div><div><span>Itens em atenção</span><b className="amber-text">17</b></div></div><div className="table-wrap"><table><thead><tr><th>Código</th><th>Descrição</th><th>Classe</th><th>PL33</th><th>Área</th><th>Situação</th></tr></thead><tbody>{stock.map((item) => <tr key={item.code}><td><b>{item.code}</b></td><td>{item.name}</td><td>{item.className}</td><td>{item.pl33} {item.pl33 === 0 && <span className="critical">crítico</span>}</td><td>{item.area}</td><td><StatusBadge tone={item.state === 'Seguro' ? 'green' : item.state === 'Atenção' ? 'amber' : 'purple'}>{item.state}</StatusBadge></td></tr>)}</tbody></table></div></section> }
function ApprovalsView() { return <section className="panel full-panel"><div className="panel-head"><div><h2>Aprovações pendentes</h2><p>Valide as solicitações conforme o fluxo de governança.</p></div><span className="approval-progress">12 de 16 concluídas</span></div><div className="approval-list">{[['REQ-24091', 'Jogo de vedações hidráulicas', 'OM 45021876', 'GG'], ['REQ-24083', 'Bucha de bronze especial', 'OM 45021710', 'GDOP'], ['REQ-24078', 'Segmento de molde CC-04', 'OM 45021698', 'D']].map(([id, item, om, level]) => <div className="approval-row" key={id}><div className="approval-level">{level}</div><div className="approval-info"><b>{id} · {item}</b><span>{om} · Solicitado pela OMS em 24/09</span></div><StatusBadge tone="amber">Aguardando {level}</StatusBadge><div className="approval-buttons"><button className="approve"><Check /> Aprovar</button><button className="reject"><X /> Rejeitar</button></div></div>)}</div></section> }
function ReportsView() { return <section className="panel full-panel"><div className="panel-head"><div><h2>Relatórios operacionais</h2><p>Extraia informações para DEPRO, GMPA e acompanhamento da Central.</p></div><button className="primary-button"><FileText /> Novo relatório</button></div><div className="report-grid">{[['Report DEPRO', 'Reparo Geral · materiais em atraso', 'Atualizado hoje, 08:00'], ['Lista de RG', 'Itens enviados pela área usuária', 'Atualizado ontem, 16:40'], ['FUP da carteira', 'Atrasos, retornos e status por unidade', 'Atualizado hoje, 07:30']].map(([title, desc, date]) => <div className="report-card" key={title}><div className="report-icon"><FileText /></div><div><b>{title}</b><p>{desc}</p><small>{date}</small></div><button aria-label={`Exportar ${title}`}><ArrowUpRight /></button></div>)}</div></section> }

function ChatView({ messages, draft, setDraft, sendMessage }: { messages: typeof initialMessages; draft: string; setDraft: (v: string) => void; sendMessage: () => void }) { return <div className="chat-layout"><section className="chat-panel"><div className="chat-header"><div className="bot-avatar"><Bot /></div><div><h2>Assistente OMS</h2><p><span className="online-dot" /> Central de Abastecimento · online</p></div><button className="icon-button"><Settings /></button></div><div className="stepper"><div className="step active"><b>1</b><span>Identifica��ão</span></div><div className="step"><b>2</b><span>Itens</span></div><div className="step"><b>3</b><span>Direcionamento</span></div><div className="step"><b>4</b><span>Confirmação</span></div></div><div className="messages">{messages.map((message, index) => <div className={`message-row ${message.role}`} key={index}>{message.role === 'assistant' && <div className="message-avatar"><Bot /></div>}<div className="message-bubble">{message.text.split('**').map((part, i) => i % 2 ? <strong key={i}>{part}</strong> : part)}</div><small>{index === messages.length - 1 ? 'agora' : '09:1' + index}</small></div>)}</div><div className="chat-composer"><textarea value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) { e.preventDefault(); sendMessage() } }} placeholder="Descreva o material que você precisa..." aria-label="Mensagem para o Assistente OMS" /><button className="send-button" onClick={sendMessage} aria-label="Enviar mensagem"><Send /></button><div className="composer-hint">Enter para enviar · Shift + Enter para nova linha</div></div></section><aside className="chat-side"><div className="panel context-card"><div className="panel-head"><div><h2>Regras do fluxo</h2><p>O assistente sempre valida</p></div><ShieldCheck className="shield-icon" /></div><ul><li><Check /> OM ou equipamento válido</li><li><Check /> Item da classe de manutenção</li><li><Check /> Saldo oficial PL33 e área</li><li><Check /> Aprovações GDOP / G / GG / D</li></ul></div><div className="panel context-card"><div className="panel-head"><div><h2>Atalhos rápidos</h2><p>Comece por uma opção</p></div></div><button className="quick-action" onClick={() => setDraft('Quero consultar uma OM')}><Search /> Consultar uma OM</button><button className="quick-action" onClick={() => setDraft('Preciso solicitar um material')}><PackageCheck /> Solicitar material</button><button className="quick-action" onClick={() => setDraft('Quero consultar o estoque')}><Boxes /> Consultar estoque</button></div></aside></div> }


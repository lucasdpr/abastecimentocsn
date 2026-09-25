'use client'

import { useEffect, useMemo, useState } from 'react'
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
  Sun,
  Moon,
  ScanLine,
  Table2,
  Download,
  Filter,
  TrendingUp,
  Users,
  LogOut,
  Printer,
  SlidersHorizontal,
  History,
  ShieldAlert,
  FileSpreadsheet,
  ShieldCheck,
  Truck,
  Wrench,
  X,
} from 'lucide-react'

type View = 'Visão geral' | 'Assistente OMS' | 'Ordens de Manutenção' | 'Solicitações' | 'Follow-Up (FUP)' | 'Estoque' | 'Aprovações' | 'Relatórios'

type UserProfile = { name: string; email: string; role: string }

const fupOrders = [
  { material: '8019764', description: 'RESFRIADOR KAWASAKI 3114621031', po: '4500098214', item: '10', supplier: 'Kawasaki Heavy Industries', date: '18/09/2026', owner: 'Fornecedor', return: 'Não', status: 'Atraso', value: 20000000 },
  { material: '1671352', description: 'PLACA NIPPON STEEL B354714 01 ATE 03', po: '4500097988', item: '20', supplier: 'Nippon Steel', date: '25/09/2026', owner: 'Tratado', return: 'Sim', status: 'No Prazo', value: 15000000 },
  { material: '9412785', description: 'MANIPULADOR BARDELLA CSNVAI7002', po: '4500097551', item: '10', supplier: 'Bardella S.A.', date: '12/08/2026', owner: 'Fornecedor', return: 'Não', status: 'Atraso', value: 18000000 },
  { material: '8127604', description: 'COMPRESSOR NITROGENIO 203 M3/H', po: '4500097440', item: '30', supplier: 'Atlas Copco', date: '30/09/2026', owner: 'GPMA', return: 'Sim', status: 'No Prazo', value: 12000000 },
  { material: '8614519', description: 'ROTOR KAWASAKI 3112561021', po: '4500097312', item: '10', supplier: 'Kawasaki Heavy Industries', date: '05/09/2026', owner: 'Central', return: 'Sim', status: 'Atraso', value: 18000000 },
  { material: '8008938', description: 'COMPRESSOR ARGONIO 144,7M3/H 125HP', po: '4500097210', item: '10', supplier: 'Atlas Copco', date: '20/09/2026', owner: 'GPMA', return: 'Não', status: 'Atraso', value: 15000000 },
  { material: '9575750', description: 'BLOCO REXROTH 054306001 60 ATE 136', po: '4500097061', item: '20', supplier: 'Rexroth', date: '28/09/2026', owner: 'Tratado', return: 'Sim', status: 'No Prazo', value: 20000000 },
  { material: '1223082', description: 'SAIA KAWASAKI 3114611001', po: '4500096984', item: '10', supplier: 'Kawasaki Heavy Industries', date: '03/10/2026', owner: 'Fornecedor', return: 'Não', status: 'Atraso', value: 12000000 },
  { material: '8518447', description: 'FREIO ELETROM 2 SAP 250VCC', po: '4500096812', item: '10', supplier: 'Eletromecânica', date: '08/10/2026', owner: 'Central', return: 'Sim', status: 'No Prazo', value: 17110000 },
  { material: '1728871', description: 'PLACA NIPPON STEEL B354715 01, 02', po: '4500096704', item: '10', supplier: 'Nippon Steel', date: '15/10/2026', owner: 'Tratado', return: 'Sim', status: 'No Prazo', value: 10000000 },
  { material: '9001462', description: 'MANIPULADOR BARDELLA CONJUNTO DE GIRO', po: '4500096598', item: '10', supplier: 'Bardella S.A.', date: '21/10/2026', owner: 'Fornecedor', return: 'Não', status: 'Atraso', value: 14000000 },
  { material: '9348021', description: 'RESFRIADOR KAWASAKI LINHA DE ÁGUA', po: '4500096482', item: '20', supplier: 'Kawasaki Heavy Industries', date: '29/10/2026', owner: 'Fornecedor', return: 'Sim', status: 'No Prazo', value: 10000000 },
  { material: '9784105', description: 'BOMBA DE ÁGUA INDUSTRIAL KGC', po: '4500096377', item: '10', supplier: 'Sulzer', date: '05/11/2026', owner: 'Central', return: 'Não', status: 'Atraso', value: 20040000 },
  { material: '9903114', description: 'CONJUNTO DE VEDAÇÕES HIDRÁULICAS', po: '4500096260', item: '30', supplier: 'Parker Hannifin', date: '12/11/2026', owner: 'Fornecedor', return: 'Não', status: 'Atraso', value: 50000000 },
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
const auditLogs = [
  ['25/09/2026 08:42', 'Rafael', 'Aprovação de Pedido', 'REQ-24091 / OM 45021876', 'Aguardando', 'GG'],
  ['24/09/2026 16:20', 'Lucas Gabriel', 'Alteração de Status para GDOP', 'REQ-24083 / OM 45021710', 'G', 'GDOP'],
  ['24/09/2026 14:05', 'Rafael', 'Inclusão de OM', 'OM 45021698', '—', 'PLAN'],
  ['23/09/2026 11:37', 'Mariana', 'Liberação de material', 'MAT-8019764', 'Bloqueado', 'Liberado'],
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

function MetricCard({ label, value, detail, icon: Icon, tone, onClick }: { label: string; value: string; detail: string; icon: typeof Activity; tone: string; onClick: () => void }) {
  return <button className="metric-card" onClick={onClick} title={`Abrir ${label}`}>
    <div className={`metric-icon ${tone}`}><Icon /></div>
    <div className="metric-copy"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
    <ArrowUpRight className="metric-arrow" />
  </button>
}

export default function Page() {
  const [isMounted, setIsMounted] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<UserProfile>({ name: 'Rafael', email: '', role: 'Mecânico' })

  useEffect(() => {
    setIsMounted(true)
    const storedSession = window.localStorage.getItem('oms_session') === 'active'
    if (storedSession) {
      try {
        const storedUser = JSON.parse(window.localStorage.getItem('oms_user') || '') as UserProfile
        if (storedUser?.name && storedUser?.role) setUser(storedUser)
      } catch {
        // Mantém o perfil padrão quando a sessão armazenada está inválida.
      }
    }
    setIsAuthenticated(storedSession)
  }, [])
  const profile = user.role
  const [view, setView] = useState<View>('Visão geral')
  const [requestModal, setRequestModal] = useState(false)
  const [requestToast, setRequestToast] = useState('')
  const [messages, setMessages] = useState(initialMessages)
  const [draft, setDraft] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [filter, setFilter] = useState('Todos')
  const [isTyping, setIsTyping] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState(['Nova OM #80014873099 cadastrada para o Conversor B', 'Item MOL-SG-004 atingiu o limite crítico na PL33', 'Fornecedor atualizou a data do Pedido 4504791859'])
  const [unitOpen, setUnitOpen] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState('Oficina de Moldes e Segmentos')
  const [unitToast, setUnitToast] = useState('')
  const [fieldModeOpen, setFieldModeOpen] = useState(false)
  const [ganttMode, setGanttMode] = useState(false)

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setPaletteOpen(true) }
      if (event.key === 'Escape') { setPaletteOpen(false); setRequestModal(false); setNotificationsOpen(false); setUnitOpen(false); setFieldModeOpen(false) }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

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
    setIsTyping(true)
    setMessages([...nextMessages, { role: 'assistant', text: 'Assistente digitando...' }])
    setDraft('')
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: nextMessages.map((item) => ({ role: item.role, content: item.text })) satisfies ChatMessage[] }) })
      const data = await response.json()
      setIsTyping(false)
      setMessages([...nextMessages, { role: 'assistant', text: data.message ?? 'Não foi possível validar a demanda.' }])
    } catch {
      setIsTyping(false)
      setMessages([...nextMessages, { role: 'assistant', text: 'Não foi possível conectar ao Assistente. Confirme a **OM** e tente novamente.' }])
    }
  }

  if (!isMounted || !isAuthenticated) return <LoginGate onEnter={enterSystem} />

  return <div className={`app-shell ${darkMode ? 'dark-mode' : ''}`}>
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Wrench /></div><div><strong>OMS<span>•</span>Central</strong><small>Abastecimento de Manutenção</small></div><button className="mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Fechar menu"><X /></button></div>
      <div className="scope-wrap"><button className="scope" onClick={() => setUnitOpen(!unitOpen)} aria-expanded={unitOpen}><span className="scope-dot" /><div><b>{selectedUnit}</b><small>{selectedUnit === 'Oficina de Moldes e Segmentos' ? 'Unidade Volta Redonda · PL33' : 'Unidade operacional CSN'}</small></div><ChevronDown /></button>{unitOpen && <div className="unit-dropdown">{['Oficina de Moldes e Segmentos', 'Aciaria - Conversores', 'Laminação a Frio (CSN UPV)'].map((unit) => <button key={unit} onClick={() => { setSelectedUnit(unit); setUnitOpen(false); setUnitToast(`Visão alterada para: ${unit}`); setTimeout(() => setUnitToast(''), 2500) }}>{unit}{selectedUnit === unit && <Check />}</button>)}</div>}</div>
      <nav className="nav-list" aria-label="Navegação principal">
        <span className="nav-label">OPERAÇÃO</span>
        {nav.slice(0, 4).map(({ label, icon: Icon }) => <button key={label} onClick={() => { setView(label); setSidebarOpen(false) }} className={`nav-item ${view === label ? 'active' : ''}`}><Icon /><span>{label}</span>{label === 'Solicitações' && <em>12</em>}</button>)}
        <span className="nav-label second">GOVERNANÇA</span>
        {nav.slice(4).map(({ label, icon: Icon }) => <button key={label} onClick={() => { setView(label); setSidebarOpen(false) }} className={`nav-item ${view === label ? 'active' : ''}`}><Icon /><span>{label}</span>{label === 'Aprovações' && <em className="alert-count">4</em>}</button>)}
      </nav>

    </aside>
    <main className="main-content">
      <header className="topbar" suppressHydrationWarning><button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu"><Menu /></button><div className="breadcrumb"><span>OMS Central</span><span>/</span><b>{view}</b></div><div className="top-actions"><button className="field-mode-button" title="Abrir Visão de Campo / Leitor de QR Code" onClick={() => setFieldModeOpen(true)}><ScanLine /> Visão de Campo</button><button className="switch-button" onClick={leaveSystem}><LogIn /> Ir para Login</button><button className="icon-button" aria-label="Buscar" title="Busca global (Ctrl/⌘ K)" onClick={() => setPaletteOpen(true)}><Search /></button><div className="notification-wrap"><button className="icon-button notification" aria-label="Notificações" title="Abrir notificações" onClick={() => setNotificationsOpen(!notificationsOpen)}><Bell />{notifications.length > 0 && <i />}</button>{notificationsOpen && <div className="notification-dropdown"><div className="notification-head"><b>Notificações</b><span>{notifications.length} pendentes</span></div>{notifications.length > 0 ? notifications.map((notification) => <div className="notification-item" key={notification}><span className="notification-dot" /><p>{notification}</p></div>) : <p className="notification-empty">Tudo lido por aqui.</p>}<button className="notification-clear" onClick={() => setNotifications([])}>Marcar todas como lidas</button></div>}</div><button className="theme-toggle" title={darkMode ? 'Ativar tema claro' : 'Ativar tema escuro'} aria-label={darkMode ? 'Ativar tema claro' : 'Ativar tema escuro'} onClick={() => setDarkMode(!darkMode)}>{darkMode ? <Sun /> : <Moon />}</button><div className="header-status"><span className="pulse" /><span>Central operacional</span></div><div className="header-user"><div className="top-avatar">{(user?.name || 'R').slice(0, 1).toUpperCase()}</div><div><b>{user?.name || 'Rafael'}</b><small>{profile} · OMS</small></div><button className="logout-button" onClick={leaveSystem} aria-label="Trocar conta ou sair">Trocar conta / Sair</button></div></div></header>
      {fieldModeOpen && <FieldModeModal onClose={() => setFieldModeOpen(false)} onRequestPart={() => { setFieldModeOpen(false); setRequestModal(true) }} />}{paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} onNavigate={(nextView) => { setView(nextView); setPaletteOpen(false) }} />}
      {view === 'Assistente OMS' ? <ChatView messages={messages} draft={draft} setDraft={setDraft} sendMessage={sendMessage} /> : <>
        {view === 'Visão geral' && <SmartAlerts setView={setView} />}
        <div className="page-heading"><div><p className="eyebrow" suppressHydrationWarning>{isMounted ? 'Quarta-feira, 25 de setembro de 2026' : '\u00a0'}</p><h1>{view === 'Visão geral' ? `Bom dia, ${user?.name || 'Rafael'}.` : view}</h1><p className="subtitle">{view === 'Visão geral' ? 'Acompanhe o abastecimento e as demandas da sua oficina.' : 'Acompanhe e gerencie o fluxo oficial da Central de Abastecimento.'}</p></div><button className="primary-button" title="Abrir formulário de nova solicitação" onClick={() => setRequestModal(true)}><MessageSquareText /> Nova solicitação</button></div>{requestModal && <RequestModal onClose={() => setRequestModal(false)} onSaved={() => { setRequestModal(false); setRequestToast('Nova solicitação criada com sucesso!'); setTimeout(() => setRequestToast(''), 2500) }} />}{requestToast && <div className="toast success"><Check />{requestToast}</div>}
        {view === 'Visão geral' && <Dashboard filter={filter} setFilter={setFilter} filteredRequests={filteredRequests} setView={setView} />}
        {view === 'Ordens de Manutenção' && <OrdersView ganttMode={ganttMode} setGanttMode={setGanttMode} />}
        {view === 'Solicitações' && <RequestsView filter={filter} setFilter={setFilter} filteredRequests={filteredRequests} />}
        {view === 'Follow-Up (FUP)' && <FupView />}
        {view === 'Estoque' && <><FailureAnalysis /><StockView /></>}
        {view === 'Aprovações' && <ApprovalsView />}
        {view === 'Relatórios' && <ReportsView />}
      </>}
    </main>{unitToast && <div className="toast success"><Check />{unitToast}</div>}
  </div>
}

function FieldModeModal({ onClose, onRequestPart }: { onClose: () => void; onRequestPart: () => void }) { return <div className="modal-backdrop" onClick={onClose}><div className="field-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="Fechar"><X /></button><div className="field-modal-head"><div className="scan-icon"><ScanLine /></div><div><p className="eyebrow">Modo de campo · Leitor operacional</p><h2>Equipamento identificado</h2></div></div><div className="qr-scan"><ScanLine /><span>TAG-CC04-PL33</span></div><div className="field-equipment"><small>Equipamento</small><strong>Conversor B - Junta Hidráulica CC-04</strong><StatusBadge tone="green">Operacional</StatusBadge></div><div className="field-facts"><div><span>Última substituição</span><b>14/08/2026</b></div><div><span>Status na PL33</span><b>Disponível</b></div><div><span>OM associada</span><b>80014872941</b></div></div><button className="primary-button field-request" onClick={onRequestPart}><Plus /> Solicitar Peça de Reposição</button></div></div> }

function CommandPalette({ onClose, onNavigate }: { onClose: () => void; onNavigate: (view: View) => void }) { const [query, setQuery] = useState(''); const options: { label: string; view: View }[] = [{ label: 'Visão geral', view: 'Visão geral' }, { label: 'Ordens de Manutenção', view: 'Ordens de Manutenção' }, { label: 'Follow-Up (FUP)', view: 'Follow-Up (FUP)' }, { label: 'Estoque PL33', view: 'Estoque' }, { label: 'Assistente OMS', view: 'Assistente OMS' }]; const matches = options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase())); return <div className="modal-backdrop palette-backdrop" onClick={onClose}><div className="command-palette" role="dialog" aria-modal="true" aria-label="Busca global" onClick={(event) => event.stopPropagation()}><div className="palette-search"><Search /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar OMs, peças ou páginas..." /><kbd>ESC</kbd></div><div className="palette-results">{matches.map((option) => <button key={option.label} onClick={() => onNavigate(option.view)}><Search />{option.label}<span>Ir para página</span></button>)}{matches.length === 0 && <p>Nenhum resultado encontrado.</p>}</div></div></div> }

function RequestModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) { const [item, setItem] = useState(''); const [quantity, setQuantity] = useState('1'); return <div className="modal-backdrop" role="presentation" onClick={onClose}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="new-request-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="Fechar"><X /></button><p className="eyebrow">Solicitação de abastecimento</p><h2 id="new-request-title">Nova Solicitação</h2><p className="modal-description">Informe o material necessário e a quantidade desejada.</p><label>Material ou descrição<input autoFocus value={item} onChange={(event) => setItem(event.target.value)} placeholder="Ex.: Jogo de vedações hidráulicas" required /></label><label>Quantidade<input type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} required /></label><div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={!item.trim() || Number(quantity) < 1} onClick={onSaved}><Check /> Salvar solicitação</button></div></div></div> }

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
    <section className="auth-form-side"><button className="auth-quick-nav" onClick={() => onEnter({ name: 'Demonstração', email: '', role: 'Mecânico' })}><LayoutDashboard /> Ir para Dashboard</button><div className="auth-card"><div className="auth-card-head"><div className="auth-icon"><ShieldCheck /></div><p className="eyebrow">Central de Abastecimento · OMS</p><h2>{mode === 'login' ? 'Acesso ao sistema' : 'Crie seu acesso'}</h2><p>{mode === 'login' ? 'Entre para acompanhar o abastecimento da sua oficina.' : 'Configure seu perfil para começar a operar.'}</p></div><div className="auth-tabs"><button type="button" className={mode === 'login' ? 'selected' : ''} onClick={() => setMode('login')}>Entrar</button><button type="button" className={mode === 'signup' ? 'selected' : ''} onClick={() => setMode('signup')}>Criar conta</button></div><form onSubmit={submit}>{mode === 'signup' && <label><span>Seu nome completo</span><div className="input-icon"><User /><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Rafael Silva" required /></div></label>}<label><span>E-mail corporativo</span><input type="email" placeholder="seu.nome@csn.com.br" required /></label><label><span>Senha</span><input type="password" placeholder="••��•••••" minLength={6} required /></label><div><span className="field-caption">Perfil de acesso</span><div className="profile-chips">{profiles.map(({ label, icon: Icon }) => <button type="button" key={label} className={profile === label ? 'selected' : ''} onClick={() => setProfile(label)}><Icon />{label}</button>)}</div></div><button className="auth-submit" type="submit">Entrar no Sistema <ArrowUpRight /></button></form><button className="guest-link" onClick={() => onEnter({ name: 'Demonstração', email: '', role: 'Mecânico' })}>Acessar como Convidado / Modos de Demonstração</button><small className="auth-note">Acesso protegido · Oficina de Moldes e Segmentos · PL33</small></div></section>
  </main>
}

function AssetHealthMonitor() { const [assets, setAssets] = useState([{ name: 'Rolamento do Conversor B', temp: '72°C', vibration: '4.2 mm/s', status: 'Atenção' }, { name: 'Motor de Içamento MCC #4', temp: '88°C', vibration: '8.5 mm/s', status: 'Crítico' }, { name: 'Bomba de Água Industrial', temp: '61°C', vibration: '2.1 mm/s', status: 'Normal' }]); return <section className="panel asset-health"><div className="panel-head"><div><h2>Saúde dos Ativos Críticos da Usina</h2><p>Telemetria operacional · vibração e temperatura em tempo real</p></div><Activity /></div><div className="asset-list">{assets.map((asset) => <div className="asset-row" key={asset.name}><span className={`asset-pulse ${asset.status.toLowerCase()}`} /><div className="asset-name"><b>{asset.name}</b><small>{asset.status}</small></div><div className="asset-reading"><span>Temperatura <b>{asset.temp}</b></span><span>Vibração <b>{asset.vibration}</b></span></div>{asset.status !== 'Normal' && <button className="secondary-button" onClick={() => setAssets((current) => current.map((item) => item.name === asset.name ? { ...item, status: 'OM gerada' } : item))}><Plus /> Gerar OM Preditiva</button>}</div>)}</div></section> }

function ImpactSimulator() { const [reduction, setReduction] = useState(25); const overdueValue = 119320000; const released = overdueValue * reduction / 100; return <section className="panel impact-simulator"><div className="panel-head"><div><h2>Simulador de Redução de Atrasos</h2><p>Projete o valor liberado ao reduzir pedidos em atraso no FUP.</p></div><SlidersHorizontal /></div><div className="impact-body"><div className="impact-slider"><label>Redução estimada <b>{reduction}%</b></label><input type="range" min="0" max="100" value={reduction} onChange={(event) => setReduction(Number(event.target.value))} /><div><span>0%</span><span>100%</span></div></div><div className="impact-result"><small>Valor economizado / liberado</small><strong>{currency.format(released)}</strong><span>sobre R$ 119,32 mi em pedidos atrasados</span></div></div></section> }

function SmartAlerts({ setView }: { setView: (view: View) => void }) { return <section className="smart-alerts"><div className="smart-alert-title"><ShieldAlert /><div><b>Alertas críticos de abastecimento</b><span>Monitoramento automático da carteira e da PL33</span></div></div><div className="smart-alert-item critical-alert"><AlertTriangle /><div><b>Estoque de segurança abaixo do limite</b><span>MOL-SG-004 · Segmento de molde CC-04 · PL33: 0 UN</span></div><button onClick={() => setView('Estoque')}>Tratar alerta <ArrowUpRight /></button></div><div className="smart-alert-item warning-alert"><Clock3 /><div><b>FUP sem retorno há mais de 30 dias</b><span>8019764 · Resfriador Kawasaki · Fornecedor pendente</span></div><button onClick={() => setView('Follow-Up (FUP)')}>Tratar alerta <ArrowUpRight /></button></div></section> }

function Dashboard({ filter, setFilter, filteredRequests, setView }: { filter: string; setFilter: (v: string) => void; filteredRequests: typeof requests; setView: (v: View) => void }) {
  return <div className="content-grid">
    <section className="metrics"><MetricCard label="Valor total em aberto" value="R$ 12,89 mi" detail="Carteira real CSN · 14 itens" icon={BarChart3} tone="navy" onClick={() => setView('Follow-Up (FUP)')} /><MetricCard label="Itens na carteira" value="14" detail="8 em Pedido · 4 em Requisição" icon={ClipboardCheck} tone="amber" onClick={() => setView('Solicitações')} /><MetricCard label="Maior concentração" value="Pedido" detail="R$ 8,60 mi · 66,7% da carteira" icon={Activity} tone="blue" onClick={() => setView('Ordens de Manutenção')} /><MetricCard label="Em estoque" value="R$ 1,15 mi" detail="1 item disponível" icon={PackageCheck} tone="green" onClick={() => setView('Estoque')} /></section>
    <section className="analytics-grid"><div className="panel chart-panel"><div className="panel-head"><div><h2>Evolução mensal da carteira</h2><p>RM / RC / PO · valores em milhares de R$</p></div><span className="chart-period">2026</span></div><div className="stacked-chart"><div className="y-axis"><span>2.000</span><span>1.500</span><span>1.000</span><span>500</span><span>0</span></div><div className="chart-area"><div className="grid-lines"><i /><i /><i /><i /><i /></div><div className="chart-bars">{[['Abr', '54', '30', '16'], ['Mai', '48', '34', '18'], ['Jun', '62', '23', '15'], ['Jul', '57', '27', '16'], ['Ago', '68', '21', '11'], ['Set', '67', '18', '15']].map(([month, rm, rc, po]) => <div className="month-bar" key={month}><button className="stack" title={`${month}: filtrar carteira`} onClick={() => setView('Follow-Up (FUP)')}><i style={{ height: `${rm}%` }} /><i className="bar-rc" style={{ height: `${rc}%` }} /><i className="bar-po" style={{ height: `${po}%` }} /></button><span>{month}</span></div>)}</div></div></div><div className="chart-legend"><span><i className="dot navy" />RM</span><span><i className="dot blue" />RC</span><span><i className="dot yellow" />PO</span></div></div><div className="panel chart-panel status-chart"><div className="panel-head"><div><h2>Distribuição por status</h2><p>Itens ativos na carteira</p></div></div><div className="status-chart-body"><div className="donut pro-donut"><div><strong>14</strong><span>itens</span></div></div><div className="chart-legend vertical"><button title="Filtrar por Pedido" onClick={() => setView('Follow-Up (FUP)')}><i className="dot navy" />Pedido <b>8</b></button><button title="Filtrar por Requisição" onClick={() => setView('Solicitações')}><i className="dot blue" />Requisição <b>4</b></button><button title="Filtrar por Em estoque" onClick={() => setView('Estoque')}><i className="dot green-dot" />Em estoque <b>1</b></button><button title="Filtrar por Tratar reserva" onClick={() => setView('Follow-Up (FUP)')}><i className="dot yellow" />Tratar reserva <b>1</b></button></div></div></div><div className="panel chart-panel trend-chart"><div className="panel-head"><div><h2>Aprovações e lead time</h2><p>Tendência semanal de atendimento</p></div><span className="trend-value">2,4 dias</span></div><div className="line-chart"><svg viewBox="0 0 500 120" role="img" aria-label="Tendência de aprovações e lead time"><path className="line-fill" d="M0 92 C55 75 70 82 105 65 S170 70 210 48 S275 65 315 35 S390 42 430 24 S470 32 500 10 V120 H0 Z" /><path className="line-path" d="M0 92 C55 75 70 82 105 65 S170 70 210 48 S275 65 315 35 S390 42 430 24 S470 32 500 10" /></svg><div className="line-labels"><span>Sem 1</span><span>Sem 2</span><span>Sem 3</span><span>Sem 4</span><span>Sem 5</span><span>Sem 6</span></div></div></div></section>
    <section className="panel portfolio-panel"><div className="panel-head"><div><h2>Carteira de abastecimento</h2><p>R$ 12.886.356,71 distribuídos por etapa do processo</p></div><button className="text-button">14 itens registrados <ArrowUpRight /></button></div><div className="portfolio-body"><div className="donut-wrap"><div className="donut"><div><strong>R$ 12,89 mi</strong><span>total em aberto</span></div></div><div className="legend"><span><i className="dot navy" />Pedido <b>66,7%</b></span><span><i className="dot blue" />Requisição <b>18,3%</b></span><span><i className="dot yellow" />Estoque / reserva <b>15,0%</b></span></div></div><div className="bars"><div className="bar-row"><span>Pedido</span><b>R$ 8.600.673,89</b><div className="bar-track"><i style={{ width: '100%' }} /></div><small>8 itens</small></div><div className="bar-row"><span>Requisição</span><b>R$ 2.353.634,88</b><div className="bar-track"><i className="blue-bar" style={{ width: '27%' }} /></div><small>4 itens</small></div><div className="bar-row"><span>Em estoque</span><b>R$ 1.155.383,54</b><div className="bar-track"><i className="yellow-bar" style={{ width: '13%' }} /></div><small>1 item</small></div><div className="bar-row"><span>Tratar reserva</span><b>R$ 776.664,40</b><div className="bar-track"><i className="yellow-bar" style={{ width: '9%' }} /></div><small>1 item</small></div></div></div></section>
    <AssetHealthMonitor />
    <ImpactSimulator />
    <section className="panel requests-panel"><div className="panel-head"><div><h2>Itens da carteira</h2><p>Materiais reais carregados da carteira CSN · valores em aberto</p></div><span className="approval-progress">14 registros</span></div><div className="table-wrap"><table><thead><tr><th>Material</th><th>Descrição</th><th>Local</th><th>Etapa</th><th>Valor</th></tr></thead><tbody>{portfolioItems.map((item, index) => <tr key={`${item.code}-${item.stage}-${index}`}><td><b>{item.code}</b></td><td>{item.description}</td><td className="muted">{item.location}</td><td><StatusBadge tone={item.stage === 'Pedido' ? 'blue' : item.stage === 'Requisição' ? 'amber' : item.stage === 'Em estoque' ? 'green' : 'purple'}>{item.stage}</StatusBadge></td><td><b>{currency.format(item.value)}</b></td></tr>)}</tbody></table></div></section>
    <section className="panel requests-panel"><div className="panel-head"><div><h2>Solicitações recentes</h2><p>Últimas movimentações da OMS</p></div><div className="panel-actions"><div className="filter-tabs">{['Todos', 'Aguardando', 'Em compra'].map((item) => <button key={item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div><button className="text-button" onClick={() => setView('Solicitações')}>Ver todas <ArrowUpRight /></button></div></div><RequestTable rows={filteredRequests} /></section>
    <aside className="right-column"><section className="panel alerts-panel"><div className="panel-head"><div><h2>Pontos de atenção</h2><p>Requerem acompanhamento</p></div><AlertTriangle className="warning-icon" /></div><div className="alert-list"><div className="alert-row"><div className="alert-symbol amber"><Clock3 /></div><div><b>4 aprovações pendentes</b><span>Fluxo GDOP / G / GG / D</span></div><ArrowUpRight /></div><div className="alert-row"><div className="alert-symbol red"><AlertTriangle /></div><div><b>2 itens em ruptura</b><span>Sem saldo na PL33 ou área</span></div><ArrowUpRight /></div><div className="alert-row"><div className="alert-symbol blue"><Truck /></div><div><b>3 ANTEC vencendo</b><span>Retorno da área até amanhã</span></div><ArrowUpRight /></div></div></section><section className="panel shortcut-panel"><div className="shortcut-icon"><Bot /></div><div><h2>Precisa solicitar um material?</h2><p>O Assistente OMS orienta você em cada etapa.</p><button className="text-button" onClick={() => setView('Assistente OMS')}>Iniciar conversa <ArrowUpRight /></button></div></section></aside>
  </div>
}

function TableTools({ query, setQuery, page, setPage, total, pageSize = 5 }: { query: string; setQuery: (value: string) => void; page: number; setPage: (value: number) => void; total: number; pageSize?: number }) { const pages = Math.max(1, Math.ceil(total / pageSize)); return <div className="table-tools"><div className="search-field"><Search /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Pesquisar nesta tabela..." aria-label="Pesquisar nesta tabela" /></div><span>Exibindo {total ? ((page - 1) * pageSize) + 1 : 0}-{Math.min(page * pageSize, total)} de {total} itens</span><button disabled={page === 1} onClick={() => setPage(Math.max(1, page - 1))} aria-label="Página anterior">‹</button><button disabled={page >= pages} onClick={() => setPage(Math.min(pages, page + 1))} aria-label="Próxima página">›</button></div> }

function SortableHeader({ label, active, direction, onSort }: { label: string; active: boolean; direction: 'asc' | 'desc'; onSort: () => void }) { return <th><button className="sort-button" onClick={onSort}>{label} {active ? (direction === 'asc' ? '↑' : '↓') : '↕'}</button></th> }

function RequestTable({ rows }: { rows: typeof requests }) { const [query, setQuery] = useState(''); const [page, setPage] = useState(1); const [sort, setSort] = useState<'id' | 'status'>('id'); const [direction, setDirection] = useState<'asc' | 'desc'>('desc'); const filtered = rows.filter((row) => `${row.id} ${row.om} ${row.item} ${row.status}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => { const result = String(a[sort]).localeCompare(String(b[sort])); return direction === 'asc' ? result : -result }); const visible = filtered.slice((page - 1) * 5, page * 5); const changeSort = (value: 'id' | 'status') => { setSort(value); setDirection(sort === value && direction === 'asc' ? 'desc' : 'asc') }; return <><TableTools query={query} setQuery={setQuery} page={page} setPage={setPage} total={filtered.length} /><div className="table-wrap"><table><thead><tr><SortableHeader label="Solicitação" active={sort === 'id'} direction={direction} onSort={() => changeSort('id')} /><th>Item principal</th><th>Quantidade</th><SortableHeader label="Status" active={sort === 'status'} direction={direction} onSort={() => changeSort('status')} /><th>Atualização</th><th /></tr></thead><tbody>{visible.map((row) => <tr key={row.id}><td><b>{row.id}</b><span>{row.om}</span></td><td>{row.item}</td><td>{row.qty}</td><td><StatusBadge tone={row.tone}>{row.status}</StatusBadge></td><td className="muted">{row.age}</td><td><button className="row-action" title={`Abrir detalhes de ${row.id}`} aria-label={`Abrir ${row.id}`}><ArrowUpRight /></button></td></tr>)}</tbody></table></div></> }
function FupView() {
  const [query, setQuery] = useState(''); const [page, setPage] = useState(1); const [sortAsc, setSortAsc] = useState(false); const [toast, setToast] = useState(''); const [exportMode, setExportMode] = useState<'all' | 'overdue'>('all'); const [statusFilter, setStatusFilter] = useState<'Todos' | 'Atraso' | 'No Prazo'>('Todos');
  const total = fupOrders.reduce((sum, item) => sum + item.value, 0)
  const filtered = fupOrders.filter((item) => (statusFilter === 'Todos' || item.status === statusFilter) && `${item.material} ${item.description} ${item.po} ${item.supplier} ${item.status}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => sortAsc ? a.value - b.value : b.value - a.value); const visible = filtered.slice((page - 1) * 5, page * 5)
  function exportCsv() { const exportRows = exportMode === 'overdue' ? filtered.filter((item) => item.status === 'Atraso') : filtered; const escapeCsv = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`; const csv = ['Material,Descrição,Pedido,Fornecedor,Prazo,Status,Valor', ...exportRows.map((item) => [item.material, item.description, item.po, item.supplier, item.date, item.status, item.value].map(escapeCsv).join(','))].join('\\n'); const link = document.createElement('a'); const url = URL.createObjectURL(new Blob([`\\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })); link.href = url; link.download = 'oms-fup.csv'; link.click(); URL.revokeObjectURL(url); setToast(`${exportRows.length} linhas exportadas em CSV!`); setTimeout(() => setToast(''), 2200) }
  const withReturn = fupOrders.filter((item) => item.return === 'Sim').reduce((sum, item) => sum + item.value, 0)
  const overdue = fupOrders.filter((item) => item.status === 'Atraso').reduce((sum, item) => sum + item.value, 0)
  return <section className="fup-view">
    <div className="fup-kpis"><MetricCard label="Carteira FUP" value={currency.format(total)} detail="Ordens de compra acompanhadas" icon={BarChart3} tone="navy" /><MetricCard label="Com retorno" value={currency.format(withReturn)} detail="Fornecedores com retorno registrado" icon={Check} tone="green" /><MetricCard label="Em atraso" value={currency.format(overdue)} detail={`${Math.round((overdue / total) * 100)}% do valor acompanhado`} icon={AlertTriangle} tone="amber" /></div>
    <section className="panel full-panel"><div className="panel-head"><div><h2>Follow-Up de materiais</h2><p>Carteira carregada do Dashboard FUP · atualização em 16/09/2026</p></div><div className="panel-actions"><div className="filter-tabs"><button className={statusFilter === 'Todos' ? 'selected' : ''} onClick={() => { setStatusFilter('Todos'); setPage(1) }}>Todos</button><button className={statusFilter === 'Atraso' ? 'selected' : ''} onClick={() => { setStatusFilter('Atraso'); setPage(1) }}>Em Atraso</button><button className={statusFilter === 'No Prazo' ? 'selected' : ''} onClick={() => { setStatusFilter('No Prazo'); setPage(1) }}>No Prazo</button></div><StatusBadge tone="blue">14 itens acompanhados</StatusBadge><select className="export-select" value={exportMode} onChange={(event) => setExportMode(event.target.value as 'all' | 'overdue')} aria-label="Tipo de exportação"><option value="all">Visão completa · 8.150 itens</option><option value="overdue">Apenas itens em atraso</option></select><button className="secondary-button" title="Baixar os dados filtrados em CSV" onClick={exportCsv}><Download /> Exportar CSV</button></div></div><div className="fup-summary"><div><span>Total</span><b>{currency.format(total)}</b></div><div><span>Com retorno</span><b className="green-text">{currency.format(withReturn)}</b></div><div><span>Sem retorno</span><b className="amber-text">{currency.format(total - withReturn)}</b></div></div><TableTools query={query} setQuery={setQuery} page={page} setPage={setPage} total={filtered.length} /><div className="table-wrap"><table><thead><tr><SortableHeader label="Material" active={false} direction="asc" onSort={() => {}} /><th>Descrição</th><th>Pedido</th><th>Fornecedor</th><th>Prazo</th><th>Retorno</th><SortableHeader label="Valor" active={true} direction={sortAsc ? 'asc' : 'desc'} onSort={() => setSortAsc(!sortAsc)} /></tr></thead><tbody>{visible.map((item) => <tr key={item.po}><td><b>{item.material}</b><span>Item {item.item}</span></td><td>{item.description}</td><td>{item.po}</td><td>{item.supplier}</td><td>{item.date}</td><td><StatusBadge tone={item.return === 'Sim' ? 'green' : 'amber'}>{item.status}</StatusBadge></td><td><b>{currency.format(item.value)}</b></td></tr>)}</tbody></table></div>{toast && <div className="toast success"><Check />{toast}</div>}</section>
  </section>
}

function RequestsView({ filter, setFilter, filteredRequests }: { filter: string; setFilter: (v: string) => void; filteredRequests: typeof requests }) { return <section className="panel full-panel"><div className="panel-head"><div><h2>Carteira de solicitações</h2><p>Fluxo centralizado de materiais, ferramentas e insumos.</p></div><div className="filter-tabs">{['Todos', 'Aguardando', 'Em compra'].map((item) => <button key={item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div></div><RequestTable rows={filteredRequests} /></section> }
function FailureAnalysis() { const components = [{ name: 'Resfriador Kawasaki', mtbf: '184 dias', mttr: '11,4 h', life: 12 }, { name: 'Manipulador Bardella', mtbf: '126 dias', mttr: '18,7 h', life: 38 }, { name: 'Placas Nippon Steel', mtbf: '212 dias', mttr: '7,9 h', life: 9 }]; return <section className="panel full-panel failure-analysis"><div className="panel-head"><div><h2>Indicadores de Confiabilidade da Oficina</h2><p>MTBF, MTTR e vida útil dos componentes críticos · PL33</p></div><StatusBadge tone="blue">Confiabilidade</StatusBadge></div><div className="reliability-cards">{components.map((component) => <div className="reliability-card" key={component.name}><div className="reliability-title"><b>{component.name}</b>{component.life < 15 && <StatusBadge tone="amber">Vida útil crítica</StatusBadge>}</div><div className="reliability-metrics"><div><small>MTBF</small><strong>{component.mtbf}</strong></div><div><small>MTTR</small><strong>{component.mttr}</strong></div><div><small>Vida útil</small><strong className={component.life < 15 ? 'critical-value' : ''}>{component.life}%</strong></div></div><div className="life-track"><i style={{ width: `${component.life}%` }} /></div>{component.life < 15 && <p className="reliability-alert">Alerta automático: programar inspeção e reordenar peça.</p>}</div>)}</div></section> }

function StockView() { const [query, setQuery] = useState(''); const [page, setPage] = useState(1); const [sortAsc, setSortAsc] = useState(true); const filtered = stock.filter((item) => `${item.code} ${item.name} ${item.className} ${item.state}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => sortAsc ? a.code.localeCompare(b.code) : b.code.localeCompare(a.code)); const visible = filtered.slice((page - 1) * 5, page * 5); return <section className="panel full-panel"><div className="panel-head"><div><h2>Consulta de estoque</h2><p>Saldos oficiais PL33 e área · atualização em tempo real</p></div><button className="secondary-button"><Plus /> Registrar movimentação</button></div><div className="stock-summary"><div><span>Itens cadastrados</span><b>1.284</b></div><div><span>Saldo comprometido</span><b>R$ 96,4k</b></div><div><span>Itens em atenção</span><b className="amber-text">17</b></div></div><TableTools query={query} setQuery={setQuery} page={page} setPage={setPage} total={filtered.length} /><div className="table-wrap"><table><thead><tr><SortableHeader label="Código" active={true} direction={sortAsc ? 'asc' : 'desc'} onSort={() => setSortAsc(!sortAsc)} /><th>Descrição</th><th>Classe</th><th>PL33</th><th>Área</th><th>Situação</th></tr></thead><tbody>{visible.map((item) => <tr key={item.code}><td><b>{item.code}</b></td><td>{item.name}</td><td>{item.className}</td><td>{item.pl33} {item.pl33 === 0 && <span className="critical">crítico</span>}</td><td>{item.area}</td><td><StatusBadge tone={item.state === 'Seguro' ? 'green' : item.state === 'Atenção' ? 'amber' : 'purple'}>{item.state}</StatusBadge></td></tr>)}</tbody></table></div></section> }
function ApprovalsView() { const [tab, setTab] = useState<'approvals' | 'audit'>('approvals'); return <section className="panel full-panel"><div className="panel-head"><div><h2>{tab === 'approvals' ? 'Aprovações pendentes' : 'Histórico de Auditoria / Log de Ações'}</h2><p>{tab === 'approvals' ? 'Valide as solicitações conforme o fluxo de governança.' : 'Rastreabilidade das alterações no histórico ordens_historico.'}</p></div><div className="filter-tabs"><button className={tab === 'approvals' ? 'selected' : ''} onClick={() => setTab('approvals')}>Aprovações</button><button className={tab === 'audit' ? 'selected' : ''} onClick={() => setTab('audit')}><History /> Auditoria</button></div></div>{tab === 'approvals' ? <div className="approval-list">{[['REQ-24091', 'Jogo de vedações hidráulicas', 'OM 45021876', 'GG'], ['REQ-24083', 'Bucha de bronze especial', 'OM 45021710', 'GDOP'], ['REQ-24078', 'Segmento de molde CC-04', 'OM 45021698', 'D']].map(([id, item, om, level]) => <div className="approval-row" key={id}><div className="approval-level">{level}</div><div className="approval-info"><b>{id} · {item}</b><span>{om} · Solicitado pela OMS em 24/09</span></div><StatusBadge tone="amber">Aguardando {level}</StatusBadge><div className="approval-buttons"><button className="approve"><Check /> Aprovar</button><button className="reject"><X /> Rejeitar</button></div></div>)}</div> : <AuditTable />}</section> }

function AuditTable() { return <div className="audit-wrap"><div className="audit-summary"><span><History /> 4.892 eventos registrados</span><span>Última sincronização: agora</span></div><div className="table-wrap"><table><thead><tr><th>Data / Hora</th><th>Usuário</th><th>Ação realizada</th><th>Item / OM</th><th>Status anterior</th><th>Status novo</th></tr></thead><tbody>{auditLogs.map((log) => <tr key={`${log[0]}-${log[2]}`}><td>{log[0]}</td><td><b>{log[1]}</b></td><td>{log[2]}</td><td>{log[3]}</td><td><StatusBadge tone="gray">{log[4]}</StatusBadge></td><td><StatusBadge tone="blue">{log[5]}</StatusBadge></td></tr>)}</tbody></table></div></div> }
function ReportsView() { const [period, setPeriod] = useState('Setembro/2026'); const [center, setCenter] = useState('Todos os centros'); const [account, setAccount] = useState('Todas as contas'); const [toast, setToast] = useState(''); function printReport() { window.print(); setToast('Relatório pronto para impressão em formato A4'); setTimeout(() => setToast(''), 2500) } return <section className="executive-report full-panel"><div className="report-toolbar"><div><p className="eyebrow">Governança · Inteligência de negócios</p><h2>Gerador de Relatórios Executivos</h2><p>Consolide custos, abastecimento e performance para a gerência.</p></div><button className="primary-button" onClick={printReport}><Printer /> Exportar PDF / Imprimir</button></div><div className="report-filters"><label>Período<select value={period} onChange={(event) => setPeriod(event.target.value)}><option>Setembro/2026</option><option>3º Trimestre/2026</option><option>Agosto/2026</option></select></label><label>Centro de custo / equipamento<select value={center} onChange={(event) => setCenter(event.target.value)}><option>Todos os centros</option><option>Conversor A</option><option>Conversor B</option><option>Conversor C</option><option>MCC #4</option></select></label><label>Conta contábil<select value={account} onChange={(event) => setAccount(event.target.value)}><option>Todas as contas</option><option>51004102</option><option>51004106</option></select></label></div><div className="report-paper"><div className="paper-header"><div className="brand-mark"><Wrench /></div><div><b>CSN · OMS CENTRAL</b><span>Relatório Executivo de Abastecimento</span></div><small>{period}</small></div><div className="report-kpis"><div><span>Carteira em aberto</span><b>R$ 12,89 mi</b></div><div><span>Pedidos em atraso</span><b>R$ 8,60 mi</b></div><div><span>Lead time médio</span><b>2,4 dias</b></div></div><div className="report-chart"><div><h3>Resumo financeiro por etapa</h3><p>Centro: {center} · Conta: {account}</p></div><div className="report-bars"><i style={{height:'100%'}} /><i style={{height:'38%'}} /><i style={{height:'22%'}} /><i style={{height:'12%'}} /></div><div className="report-bar-labels"><span>Pedido</span><span>Requisição</span><span>Estoque</span><span>Reserva</span></div></div><table className="report-cost-table"><thead><tr><th>Categoria</th><th>Itens</th><th>Valor consolidado</th><th>Status</th></tr></thead><tbody><tr><td>Pedido</td><td>8</td><td>R$ 8.600.673,89</td><td>Em acompanhamento</td></tr><tr><td>Requisição</td><td>4</td><td>R$ 2.353.634,88</td><td>Em aprovação</td></tr><tr><td>Estoque / reserva</td><td>2</td><td>R$ 1.932.047,94</td><td>Disponível</td></tr></tbody></table></div>{toast && <div className="toast success"><Check />{toast}</div>}</section> }

const maintenanceOrders = [
  { number: '80014873076', equipment: 'Motor hidráulico de içamento', sector: 'Conversor A', status: 'PLAN', priority: 'Alta', value: 185000 },
  { number: '80014872941', equipment: 'Segmento de molde CC-04', sector: 'Oficina OMS', status: 'Aprovada', priority: 'Crítica', value: 96200 },
  { number: '80014872618', equipment: 'Bomba de água industrial', sector: 'MCC #4', status: 'Em Execução', priority: 'Média', value: 44800 },
  { number: '80014872109', equipment: 'Carro distribuidor #2', sector: 'Conversor C', status: 'Concluída', priority: 'Baixa', value: 12600 },
]

function OmPrintSheet({ order, onClose }: { order: typeof maintenanceOrders[number]; onClose: () => void }) { return <div className="modal-backdrop print-backdrop"><div className="om-sheet" role="dialog" aria-modal="true"><div className="om-sheet-head"><div><b>CSN · OMS CENTRAL</b><span>FOLHA TÉCNICA DE ORDEM DE MANUTENÇÃO</span></div><button className="modal-close no-print" onClick={onClose} aria-label="Fechar"><X /></button></div><div className="om-sheet-title"><span>OM</span><strong>{order.number}</strong><StatusBadge tone="blue">{order.status}</StatusBadge></div><div className="om-sheet-grid"><div><small>Equipamento</small><b>{order.equipment}</b></div><div><small>Setor / Área</small><b>{order.sector}</b></div><div><small>Prioridade</small><b>{order.priority}</b></div><div><small>Valor alocado</small><b>{currency.format(order.value)}</b></div></div><div className="om-sheet-notes"><b>Orientações para a oficina de campo</b><p>Confirmar isolamento da área, registrar materiais utilizados e atualizar o status da OM após a execução.</p></div><div className="apr-panel"><div className="apr-head"><b>Análise Preliminar de Risco (APR / SMS)</b><StatusBadge tone="green">Segurança aprovada</StatusBadge></div><div className="apr-columns"><div><small>EPIs obrigatórios</small><span>Avental de raspa</span><span>Luvas de vaqueta</span><span>Óculos de proteção</span></div><div><small>Permissões exigidas</small><span>Trabalho em Altura · NR35</span><span>Espaço Confinado · NR33</span><span>Bloqueio LOTO</span></div></div><div className="sms-release"><Check /> Liberado para Execução pelo TST</div></div><button className="primary-button no-print" onClick={() => window.print()}><Printer /> Imprimir OM</button></div></div> }

function OrdersView({ ganttMode, setGanttMode }: { ganttMode: boolean; setGanttMode: (value: boolean) => void }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('Todos')
  const [modal, setModal] = useState(false); const [printOrder, setPrintOrder] = useState<typeof maintenanceOrders[number] | null>(null); const [page, setPage] = useState(1); const [toast, setToast] = useState(''); const [sortAsc, setSortAsc] = useState(false); const [orders, setOrders] = useState(maintenanceOrders); const [newNumber, setNewNumber] = useState(''); const [newEquipment, setNewEquipment] = useState(''); const [newPriority, setNewPriority] = useState('Alta')
  const filteredRows = orders.filter((item) => `${item.number} ${item.equipment} ${item.sector} ${item.status}`.toLowerCase().includes(query.toLowerCase()) && (status === 'Todos' || item.status === status)).sort((a, b) => sortAsc ? a.value - b.value : b.value - a.value); const rows = filteredRows.slice((page - 1) * 5, page * 5)
  return ganttMode ? <GanttView onBack={() => setGanttMode(false)} /> : <section className="panel full-panel orders-panel"><div className="panel-head"><div><h2>Ordens de Manutenção</h2><p>Planejamento e rastreabilidade das demandas da OMS.</p></div><div className="orders-view-toggle"><button className="secondary-button" onClick={() => setGanttMode(true)}><BarChart3 /> Visão Cronograma de Parada</button><button className="primary-button" title="Abrir formulário para criar uma nova OM" onClick={() => setModal(true)}><Plus /> Criar Nova OM</button></div></div><div className="orders-toolbar"><TableTools query={query} setQuery={setQuery} page={page} setPage={setPage} total={filteredRows.length} /><div className="filter-tabs">{['Todos', 'PLAN', 'Aprovada'].map((item) => <button key={item} className={status === item ? 'selected' : ''} onClick={() => setStatus(item)}>{item}</button>)}</div></div><div className="table-wrap"><table><thead><tr><th>Número da OM</th><th>Equipamento</th><th>Setor</th><th>Status</th><th>Prioridade</th><th>Valor alocado</th><th /></tr></thead><tbody>{rows.map((item) => <tr key={item.number}><td><b>{item.number}</b><span>Aberta em 25/09/2026</span></td><td>{item.equipment}</td><td className="muted">{item.sector}</td><td><StatusBadge tone={item.status === 'Concluída' ? 'green' : item.status === 'PLAN' ? 'amber' : 'blue'}>{item.status}</StatusBadge></td><td>{item.priority}</td><td><b>{currency.format(item.value)}</b></td><td><button className="row-action" title={`Imprimir OM ${item.number}`} aria-label={`Imprimir OM ${item.number}`} onClick={() => setPrintOrder(item)}><Printer /></button></td></tr>)}</tbody></table></div>{printOrder && <OmPrintSheet order={printOrder} onClose={() => setPrintOrder(null)} />}{modal && <div className="modal-backdrop" role="presentation" onClick={() => setModal(false)}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="new-om-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setModal(false)} aria-label="Fechar"><X /></button><p className="eyebrow">Cadastro rápido</p><h2 id="new-om-title">Criar Nova OM</h2><p className="modal-description">Vincule a demanda a um equipamento antes de solicitar materiais.</p><label>Número da OM<input value={newNumber} onChange={(event) => setNewNumber(event.target.value)} placeholder="80014873076" /></label><label>Equipamento<input value={newEquipment} onChange={(event) => setNewEquipment(event.target.value)} placeholder="Ex.: Motor hidráulico de içamento" /></label><label>Prioridade<select value={newPriority} onChange={(event) => setNewPriority(event.target.value)}><option>Alta</option><option>Média</option><option>Baixa</option></select></label><div className="modal-actions"><button className="secondary-button" onClick={() => setModal(false)}>Cancelar</button><button className="primary-button modal-submit" disabled={!newNumber.trim() || !newEquipment.trim()} onClick={() => { setOrders([{ number: newNumber, equipment: newEquipment, sector: 'Oficina OMS', status: 'PLAN', priority: newPriority, value: 0 }, ...orders]); setModal(false); setNewNumber(''); setNewEquipment(''); setToast('OM cadastrada com sucesso!'); setTimeout(() => setToast(''), 2200) }}><Check /> Criar OM</button></div></div></div>}{toast && <div className="toast success"><Check />{toast}</div>}</section>
}

function GanttView({ onBack }: { onBack: () => void }) { const rows = [{ sector: 'Conversor A', om: 'OM 80014873076', task: 'Motor hidráulico de içamento', start: 12, width: 35, status: 'Em execução' }, { sector: 'Conversor B', om: 'OM 80014872941', task: 'Segmento de molde CC-04', start: 28, width: 27, status: 'Programada' }, { sector: 'Conversor C', om: 'OM 80014872618', task: 'Bomba de água industrial', start: 48, width: 22, status: 'Em execução' }, { sector: 'MCC #4', om: 'OM 80014872109', task: 'Carro distribuidor #2', start: 66, width: 18, status: 'Concluída' }]; return <section className="panel full-panel gantt-panel"><div className="panel-head"><div><p className="eyebrow">Parada programada · Aciaria</p><h2>Cronograma de Parada</h2><p>Barras de execução por setor e tempo estimado.</p></div><button className="secondary-button" onClick={onBack}><Table2 /> Visão Tabela</button></div><div className="gantt-scale"><span>01/10</span><span>08/10</span><span>15/10</span><span>22/10</span><span>31/10</span></div><div className="gantt-body">{rows.map((row) => <div className="gantt-row" key={row.sector}><div className="gantt-label"><b>{row.sector}</b><span>{row.om} · {row.task}</span></div><div className="gantt-track"><i style={{ left: `${row.start}%`, width: `${row.width}%` }} className={row.status === 'Concluída' ? 'done' : row.status === 'Em execução' ? 'active' : ''}><span>{row.status}</span></i></div></div>)}</div></section> }

function ChatView({ messages, draft, setDraft, sendMessage }: { messages: typeof initialMessages; draft: string; setDraft: (v: string) => void; sendMessage: () => void }) { const shortcuts = ['Consultar uma OM', 'Solicitar material', 'Consultar estoque']; return <div className="chat-layout"><section className="chat-panel"><div className="chat-header"><div className="bot-avatar"><Bot /></div><div><h2>Assistente OMS</h2><p><span className="online-dot" /> Central de Abastecimento · online</p></div><button className="icon-button"><Settings /></button></div><div className="stepper"><div className="step active"><b>1</b><span>Identificação</span></div><div className="step"><b>2</b><span>Itens</span></div><div className="step"><b>3</b><span>Direcionamento</span></div><div className="step"><b>4</b><span>Confirmação</span></div></div><div className="messages">{messages.map((message, index) => <div className={`message-row ${message.role}`} key={index}>{message.role === 'assistant' && <div className="message-avatar"><Bot /></div>}<div className="message-bubble">{message.text.split('**').map((part, i) => i % 2 ? <strong key={i}>{part}</strong> : part)}</div><small>{index === messages.length - 1 ? 'agora' : '09:1' + index}</small></div>)}</div><div className="chat-shortcuts">{shortcuts.map((shortcut) => <button key={shortcut} onClick={() => setDraft(shortcut)}>{shortcut}</button>)}</div><div className="chat-composer"><textarea value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) { e.preventDefault(); sendMessage() } }} placeholder="Descreva o material que você precisa..." aria-label="Mensagem para o Assistente OMS" /><button className="send-button" onClick={sendMessage} aria-label="Enviar mensagem"><Send /></button><div className="composer-hint">Enter para enviar · Shift + Enter para nova linha</div></div></section><aside className="chat-side"><div className="panel context-card"><div className="panel-head"><div><h2>Regras do fluxo</h2><p>O assistente sempre valida</p></div><ShieldCheck className="shield-icon" /></div><ul><li><Check /> OM ou equipamento válido</li><li><Check /> Item da classe de manutenção</li><li><Check /> Saldo oficial PL33 e área</li><li><Check /> Aprovações GDOP / G / GG / D</li></ul></div><div className="panel context-card"><div className="panel-head"><div><h2>Atalhos rápidos</h2><p>Comece por uma opção</p></div></div><button className="quick-action" onClick={() => setDraft('Quero consultar uma OM')}><Search /> Consultar uma OM</button><button className="quick-action" onClick={() => setDraft('Preciso solicitar um material')}><PackageCheck /> Solicitar material</button><button className="quick-action" onClick={() => setDraft('Quero consultar o estoque')}><Boxes /> Consultar estoque</button></div></aside></div> }


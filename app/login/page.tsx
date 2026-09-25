'use client'

import { useState } from 'react'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Wrench, UserRound } from 'lucide-react'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [profile, setProfile] = useState('Mecânico')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    document.cookie = 'oms_session=active; path=/; max-age=86400'
    window.location.href = '/'
  }

  return <main className="auth-page"><section className="auth-hero"><div className="auth-brand"><div className="brand-mark"><Wrench /></div><div><strong>OMS<span>•</span>Central</strong><small>Abastecimento de Manutenção</small></div></div><div className="hero-copy"><span className="hero-kicker"><i /> Sistema de Abastecimento Ativo</span><h1>Operação crítica.<br /><em>Abastecimento sob controle.</em></h1><p>Conecte a manutenção, estoque e suprimentos em uma única visão operacional.</p><div className="hero-stat"><div className="stat-icon"><ShieldCheck /></div><div><small>Carteira FUP monitorada</small><strong>R$ 251,1M</strong><span>14 itens acompanhados · PL33</span></div></div></div><div className="hero-foot"><span><ShieldCheck /> Ambiente seguro</span><span><ShieldCheck /> Operação CSN</span></div></section><section className="auth-form-side"><button className="auth-quick-nav" onClick={() => { document.cookie = 'oms_session=active; path=/; max-age=86400'; window.location.href = '/' }}>Ir para Dashboard <ArrowRight /></button><div className="auth-card"><div className="auth-card-head"><div className="auth-icon"><ShieldCheck /></div><p className="eyebrow">Central de Abastecimento · OMS</p><h1>{mode === 'login' ? 'Bem-vindo de volta' : 'Crie seu acesso'}</h1><p>Entre para acompanhar solicitações, estoque e aprovações.</p></div><div className="auth-tabs"><button className={mode === 'login' ? 'selected' : ''} onClick={() => setMode('login')}><UserRound /> Entrar</button><button className={mode === 'signup' ? 'selected' : ''} onClick={() => setMode('signup')}><ShieldCheck /> Criar conta</button></div><form onSubmit={submit}><label>E-mail<div className="auth-input"><Mail /><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu.nome@csn.com.br" /></div></label><label>Senha<div className="auth-input"><LockKeyhole /><input type={showPassword ? 'text' : 'password'} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /><button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label>{mode === 'signup' && <label>Perfil / função<select value={profile} onChange={(e) => setProfile(e.target.value)}><option>Mecânico</option><option>Analista</option><option>Admin</option></select></label>}<button className="auth-submit" type="submit">{mode === 'login' ? 'Entrar no OMS Central' : 'Criar acesso'}<ArrowRight /></button><button className="demo-button" type="button" onClick={submit}>Acessar como Convidado <span>Modo de Demonstração</span></button></form><small className="auth-note">Acesso protegido · Oficina de Moldes e Segmentos · PL33</small></div></section></main>
}

'use client'

import { useState } from 'react'
import { ArrowRight, ShieldCheck, Wrench } from 'lucide-react'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [profile, setProfile] = useState('Mecânico')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function submit(event: React.FormEvent) {
    event.preventDefault()
    document.cookie = 'oms_session=active; path=/; max-age=86400'
    window.location.href = '/'
  }

  return <main className="auth-page"><div className="auth-brand"><div className="brand-mark"><Wrench /></div><div><strong>OMS<span>•</span>Central</strong><small>Abastecimento de Manutenção</small></div></div><section className="auth-card"><div className="auth-card-head"><div className="auth-icon"><ShieldCheck /></div><p className="eyebrow">Central de Abastecimento · OMS</p><h1>{mode === 'login' ? 'Bem-vindo de volta' : 'Crie seu acesso'}</h1><p>Entre para acompanhar solicitações, estoque e aprovações.</p></div><div className="auth-tabs"><button className={mode === 'login' ? 'selected' : ''} onClick={() => setMode('login')}>Entrar</button><button className={mode === 'signup' ? 'selected' : ''} onClick={() => setMode('signup')}>Criar conta</button></div><form onSubmit={submit}><label>E-mail<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu.nome@csn.com.br" /></label><label>Senha<input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></label>{mode === 'signup' && <label>Perfil / função<select value={profile} onChange={(e) => setProfile(e.target.value)}><option>Mecânico</option><option>Analista</option><option>Admin</option></select></label>}<button className="auth-submit" type="submit">{mode === 'login' ? 'Entrar no OMS Central' : 'Criar acesso'}<ArrowRight /></button></form><small className="auth-note">Acesso protegido · Oficina de Moldes e Segmentos · PL33</small></section></main>
}

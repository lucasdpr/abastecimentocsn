import Link from 'next/link'
import { redirect } from 'next/navigation'
import { InstalarApp } from '@/components/instalar-app'
import { MolduraAcesso } from '@/components/moldura-acesso'
import { usuarioAtual } from '@/lib/auth'
import { FormLogin } from './form-login'

export const metadata = { title: 'Entrar' }

export default async function Login() {
  const usuario = await usuarioAtual().catch(() => null)
  if (usuario) redirect('/')
  return (
    <MolduraAcesso>
      <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink">Entrar</h1>
      <p className="mt-1.5 mb-7 text-sm text-muted">Use a matrícula e a senha fornecidas pela Central.</p>
      <FormLogin />
      <p className="mt-6 text-center text-sm text-muted">
        Ainda não tem acesso?{' '}
        <Link href="/cadastro" className="font-medium text-accent hover:underline">
          Criar conta
        </Link>
      </p>
      <div className="mt-6 border-t border-line pt-6">
        <InstalarApp />
      </div>
    </MolduraAcesso>
  )
}

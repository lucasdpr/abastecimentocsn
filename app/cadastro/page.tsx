import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { MolduraAcesso } from '@/components/moldura-acesso'
import { usuarioAtual } from '@/lib/auth'
import { FormCadastro } from './form-cadastro'

export const metadata = { title: 'Criar conta' }

export default async function Cadastro() {
  const usuario = await usuarioAtual().catch(() => null)
  if (usuario) redirect('/')
  return (
    <MolduraAcesso>
      <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink">Criar conta</h1>
      <p className="mt-1.5 mb-7 text-sm text-muted">Sua conta começa como Consulta e depende de aprovação de um administrador.</p>
      <FormCadastro />
      <Link href="/login" className="mt-6 flex items-center justify-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Já tenho conta
      </Link>
    </MolduraAcesso>
  )
}

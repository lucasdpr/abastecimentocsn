import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { usuarioAtual } from '@/lib/auth'
import { FormCadastro } from './form-cadastro'

export const metadata = { title: 'Criar conta' }

export default async function Cadastro() {
  const usuario = await usuarioAtual().catch(() => null)
  if (usuario) redirect('/')
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" width={48} height={48} className="size-12 rounded-xl" />
          <div>
            <h1 className="text-lg font-semibold text-ink">Central de Abastecimento</h1>
            <p className="text-xs text-muted">Manutenção · CSN</p>
          </div>
        </div>
        <div className="card p-6">
          <h2 className="text-base font-semibold">Criar conta</h2>
          <p className="mb-5 text-sm text-muted">Sua conta começa como Consulta e depende de aprovação de um administrador.</p>
          <FormCadastro />
        </div>
        <Link href="/login" className="mt-6 flex items-center justify-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> Já tenho conta
        </Link>
      </div>
    </main>
  )
}

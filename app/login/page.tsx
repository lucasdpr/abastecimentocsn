import { redirect } from 'next/navigation'
import { usuarioAtual } from '@/lib/auth'
import { FormLogin } from './form-login'

export const metadata = { title: 'Entrar' }

export default async function Login() {
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
          <h2 className="text-base font-semibold">Entrar</h2>
          <p className="mb-5 text-sm text-muted">Use o acesso fornecido pela Central.</p>
          <FormLogin />
        </div>
        <p className="mt-6 text-center text-xs text-muted">Ferramenta de apoio ao SAP. Os dados oficiais permanecem no SAP.</p>
      </div>
    </main>
  )
}

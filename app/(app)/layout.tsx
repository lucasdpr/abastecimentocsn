import { Navegacao } from '@/components/navegacao'
import { exigirUsuario, PERFIS, pode } from '@/lib/auth'
import { contarAlertas } from '@/lib/consultas'

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuario()
  const alertas = pode.verGestao(usuario) ? await contarAlertas() : 0
  return (
    <div className="min-h-dvh">
      <Navegacao nome={usuario.nome} perfil={usuario.perfil} perfilRotulo={PERFIS[usuario.perfil]} alertas={alertas} />
      <main className="mx-auto w-full max-w-[1400px] px-4 pt-5 pb-28 md:px-6 lg:pb-10 lg:pl-66">{children}</main>
    </div>
  )
}

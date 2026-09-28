import { Navegacao } from '@/components/navegacao'
import { exigirUsuario, PERFIS, pode } from '@/lib/auth'
import { contarAlertas } from '@/lib/consultas'

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuario()
  const alertas = pode.verGestao(usuario) ? await contarAlertas() : 0
  return (
    <div className="min-h-dvh">
      <Navegacao nome={usuario.nome} perfil={usuario.perfil} perfilRotulo={PERFIS[usuario.perfil]} alertas={alertas} />
      <main className="entrar mx-auto w-full max-w-[1440px] px-4 pt-6 pb-28 md:px-8 lg:pt-8 lg:pb-12 lg:pl-72">{children}</main>
    </div>
  )
}

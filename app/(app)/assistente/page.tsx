import { Chat } from '@/components/chat'
import { exigirUsuario } from '@/lib/auth'

export const metadata = { title: 'Assistente IA' }

export default async function PaginaAssistente() {
  const usuario = await exigirUsuario()
  return (
    <div className="mx-auto max-w-3xl">
      <Chat nome={usuario.nome} />
    </div>
  )
}

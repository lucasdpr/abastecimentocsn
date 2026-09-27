import { NextResponse } from 'next/server'
import { usuarioAtual } from '@/lib/auth'
import { responder, type Mensagem } from '@/lib/ia'

export const maxDuration = 60

export async function POST(request: Request) {
  const usuario = await usuarioAtual()
  if (!usuario) return NextResponse.json({ erro: 'Faça login.' }, { status: 401 })
  try {
    const corpo = (await request.json()) as { mensagens?: Mensagem[] }
    const mensagens = (Array.isArray(corpo.mensagens) ? corpo.mensagens : [])
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-12)
    if (!mensagens.length || mensagens.at(-1)?.role !== 'user') return NextResponse.json({ erro: 'Envie uma pergunta.' }, { status: 400 })
    return NextResponse.json(await responder(mensagens, request.headers.get('x-vercel-oidc-token')))
  } catch (erro) {
    console.error('assistente', erro)
    return NextResponse.json({ erro: 'Não consegui responder agora. Tente de novo.' }, { status: 500 })
  }
}
